export interface Product {
  id: string;
  name: string;
  category: string;
  style: string;
  color: string;
  description: string;
  modelType: string;
  shape: string;
  dimensions: { width: number; height: number; depth: number };
  colorHex: string;
  thumbnailUrl: string;
  scaleHint: { x: number; y: number; z: number };
  placementHints: { surfaceType: string; defaultOrientation: number };
}

// ─── AI Agent Types ───────────────────────────────────────────────────────────

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Message type for the entire application.
 *
 * For UI rendering: `id`, `role`, `content`, `timestamp`, and `products` are used.
 * For API calls: `tool_calls`, `tool_call_id`, and `name` are used by the agent loop
 * when communicating with the OpenAI proxy. Extra fields are ignored by the API.
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  /** Product suggestions attached to assistant messages (for rendering product cards). */
  products?: Product[];
  /** Internal: tool call array for OpenAI function calling. */
  tool_calls?: ToolCall[];
  /** Internal: tool call ID for tool response messages. */
  tool_call_id?: string;
  /** Internal: function name for tool response messages. */
  name?: string;
}

export interface SelectedProduct {
  productId: string;
  modelUrl: string;
  scaleHint?: { x: number; y: number; z: number };
  category: string;
  placementHints?: {
    surfaceType: 'floor' | 'table' | 'wall';
    defaultOrientation?: number;
  };
}

export interface AgentResponse {
  content: string;
  selectedProduct?: SelectedProduct | null;
  functionResults?: Record<string, unknown>;
}

export type ConversationMode = 'browsing' | 'comparing' | 'placing' | 'adjusting';

export interface SessionContext {
  preferredStyles: string[];
  preferredColors: string[];
  recentlyViewedIds: string[];
  lastCategory?: string;
  lastSearchQuery?: string;
}
