import type {
  Message,
  AgentResponse,
  ToolCall,
  SelectedProduct,
  Product,
} from '../types';
import { ConversationState } from './ConversationState';
import { SYSTEM_PROMPT } from './prompts/systemPrompt';
import { PRODUCT_SEARCH_TOOLS } from './functions/schema';
import type { ToolName } from './functions/schema';
import { executeSearchProducts } from './functions/searchProducts';
import type { SearchProductsArgs, SearchResult } from './functions/searchProducts';
import { executeGetProductDetails } from './functions/getProductDetails';
import type { ProductDetailsResult } from './functions/getProductDetails';
import { executeSelectProduct } from './functions/selectProduct';
import catalogData from '../data/catalog.json';

const catalog = catalogData as Product[];

const API_ENDPOINT = '/api/chat';
const MAX_ITERATIONS = 5; // Safety limit for function-calling loops

/**
 * Shape of the response expected from the backend chat API.
 */
interface ChatAPIResponse {
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: string;
  }>;
}

/**
 * Core orchestration class that manages the user → LLM → tool → response cycle.
 *
 * Flow:
 * 1. User message is added to conversation history (with id, timestamp)
 * 2. Full messages array (system + history) is sent to the backend API
 * 3. OpenAI responds with either text or tool_calls
 * 4. If tool_calls → execute locally, add result messages to history, loop
 * 5. Repeat until OpenAI returns text (or max iterations reached)
 * 6. Return final response with any SelectedProduct payload
 */
export class AgentLoop {
  private state: ConversationState;

  constructor(state: ConversationState) {
    this.state = state;
  }

  /**
   * Process a user message through the full agent cycle.
   * Returns the final response including text and optional SelectedProduct.
   */
  async processMessage(userMessage: string): Promise<AgentResponse> {
    // Add user message to conversation
    this.state.addMessage('user', userMessage);

    let iterations = 0;
    let selectedProduct: SelectedProduct | null = null;

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      // Build messages array for the API call (without UI-only fields)
      const apiMessages = this.buildAPIMessages();

      // Call the backend API
      const apiResponse = await this.callChatAPI(apiMessages);

      // Parse the response
      const choice = apiResponse.choices?.[0];
      if (!choice) {
        throw new Error('Empty response from AI service');
      }

      const assistantMessage = choice.message;
      const finishReason = choice.finish_reason;

      // Case 1: Text response (no tool calls)
      if (
        finishReason === 'stop' ||
        (!assistantMessage.tool_calls && assistantMessage.content !== null)
      ) {
        const text = assistantMessage.content ?? '';
        this.state.addMessage('assistant', text);

        return {
          content: text,
          selectedProduct,
        };
      }

      // Case 2: Function/tool calls
      if (
        finishReason === 'tool_calls' &&
        assistantMessage.tool_calls &&
        assistantMessage.tool_calls.length > 0
      ) {
        const toolCalls = assistantMessage.tool_calls as ToolCall[];

        // Add assistant message with tool_calls to history (content can be null)
        this.state.addMessage('assistant', assistantMessage.content ?? '', {
          tool_calls: toolCalls,
        });

        // Execute each tool call
        for (const toolCall of toolCalls) {
          const result = await this.executeToolCall(toolCall);

          // If this was a select_product, capture the SelectedProduct
          if (
            toolCall.function.name === 'select_product' &&
            result.selectedProduct
          ) {
            selectedProduct = result.selectedProduct;
          }

          // Add tool response to history
          this.state.addMessage('tool', JSON.stringify(result.data), {
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
          });

          // Update session context based on function type
          this.updateSessionContext(toolCall.function.name, result.data);
        }

        // Continue loop — send tool results back to OpenAI for NL response
        continue;
      }

      // Case 3: Unexpected finish reason
      throw new Error(
        `Unexpected response from AI service: finish_reason=${finishReason}`,
      );
    }

    // Max iterations reached without final text response
    throw new Error(
      'AI agent reached maximum iterations without completing. Please try again.',
    );
  }

  /**
   * Build messages array for the API call.
   * Prepends the system prompt and strips UI-only fields (id, timestamp, products).
   */
  private buildAPIMessages(): Record<string, unknown>[] {
    const history = this.state.getHistory();
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map((msg) => this.toAPIMessage(msg)),
    ];
  }

  /**
   * Convert a Message to API-compatible format.
   * Strips UI-only fields and ensures content is null for tool-only assistant messages.
   */
  private toAPIMessage(msg: Message): Record<string, unknown> {
    const apiMsg: Record<string, unknown> = {
      role: msg.role,
    };

    // For assistant messages with tool_calls, content should be null
    if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
      apiMsg.content = null;
      apiMsg.tool_calls = msg.tool_calls;
    } else {
      apiMsg.content = msg.content;
    }

    // For tool role messages, include tool_call_id and name
    if (msg.role === 'tool') {
      apiMsg.tool_call_id = msg.tool_call_id;
      apiMsg.name = msg.name;
    }

    return apiMsg;
  }

  /**
   * Call the backend OpenAI proxy API.
   */
  private async callChatAPI(
    messages: Record<string, unknown>[],
  ): Promise<ChatAPIResponse> {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        tools: PRODUCT_SEARCH_TOOLS,
        tool_choice: 'auto',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        (errorData as { error?: string }).error ??
        `API request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = (await response.json()) as ChatAPIResponse;
    return data;
  }

  /**
   * Execute a single tool call locally.
   * Returns the result data plus optional SelectedProduct.
   */
  private async executeToolCall(
    toolCall: ToolCall,
  ): Promise<{ data: unknown; selectedProduct?: SelectedProduct }> {
    const { name, arguments: argsStr } = toolCall.function;
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(argsStr);
    } catch {
      throw new Error(
        `Invalid arguments JSON for function "${name}": ${argsStr}`,
      );
    }

    switch (name as ToolName) {
      case 'search_products': {
        const results = executeSearchProducts(
          args as SearchProductsArgs,
          catalog,
        );
        return {
          data: {
            products: results,
            count: results.length,
          },
        };
      }

      case 'get_product_details': {
        const productId = args.productId as string;
        const details = executeGetProductDetails(productId, catalog);
        if (!details) {
          return {
            data: {
              error: `Product "${productId}" not found. Available IDs: ${catalog.map((p) => p.id).join(', ')}`,
            },
          };
        }
        return { data: { product: details } };
      }

      case 'select_product': {
        const productId = args.productId as string;
        const selected = executeSelectProduct(productId, catalog);
        return {
          data: {
            success: true,
            productId: selected.productId,
            message: `Product "${productId}" selected for AR placement.`,
            modelUrl: selected.modelUrl,
          },
          selectedProduct: selected,
        };
      }

      default: {
        throw new Error(
          `Unknown function: "${name}". Supported functions: search_products, get_product_details, select_product`,
        );
      }
    }
  }

  /**
   * Update session context based on function execution results.
   */
  private updateSessionContext(
    functionName: string,
    data: unknown,
  ): void {
    switch (functionName) {
      case 'search_products': {
        const result = data as { products?: SearchResult[] };
        if (result.products && result.products.length > 0) {
          const categories = [
            ...new Set(result.products.map((p) => p.category)),
          ];
          const styles = [
            ...new Set(result.products.map((p) => p.style)),
          ];
          if (categories.length === 1) {
            this.state.updateContext({ lastCategory: categories[0] });
          }
          for (const style of styles) {
            this.state.recordStylePreference(style);
          }
        }
        break;
      }

      case 'get_product_details': {
        const result = data as { product?: ProductDetailsResult };
        if (result.product) {
          this.state.recordProductView(result.product.id);
          this.state.recordStylePreference(result.product.style);
          this.state.recordColorPreference(result.product.color);
        }
        break;
      }

      // No context tracking needed for 'select_product'
    }
  }
}
