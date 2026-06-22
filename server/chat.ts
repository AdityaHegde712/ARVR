import { Request, Response } from 'express';
import OpenAI from 'openai';

// ─── Tool definitions ────────────────────────────────────────────────────────

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_products',
      description:
        'Search furniture products by criteria. Returns matching products from the catalog.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Free-text search query' },
          category: {
            type: 'string',
            enum: [
              'Sofa',
              'Chair',
              'Table',
              'Lamp',
              'Bed',
              'Bookshelf',
              'Desk',
              'Rug',
              'Cabinet',
              'Plant',
            ],
            description: 'Product category filter',
          },
          style: { type: 'string', description: 'Style filter (e.g. Modern, Classic, Minimalist)' },
          color: { type: 'string', description: 'Color filter (e.g. Gray, Brown, White)' },
          priceRange: {
            type: 'string',
            description: 'budget, mid-range, premium',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of results to return (default: 5)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_product_details',
      description: 'Get detailed information about a specific product by ID.',
      parameters: {
        type: 'object',
        properties: {
          productId: {
            type: 'string',
            description: 'Product ID from catalog',
          },
        },
        required: ['productId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'select_product',
      description: 'Called when the user confirms they want to place a specific product in AR. This triggers the 3D model to render.',
      parameters: {
        type: 'object',
        properties: {
          productId: {
            type: 'string',
            description: 'The product ID the user selected',
          },
          confirmPhrase: {
            type: 'string',
            description: "The user's confirmation phrase (e.g., 'yes, show me that one', 'place it')",
          },
        },
        required: ['productId', 'confirmPhrase'],
      },
    },
  },
];

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function chatHandler(
  req: Request,
  res: Response
): Promise<void> {
  const { messages } = req.body;

  // Validate request body
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'Invalid request: messages array is required' });
    return;
  }

  // Check API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY is not configured');
    res.status(500).json({ error: 'OpenAI API key not configured' });
    return;
  }

  try {
    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        tools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 1024,
      },
      {
        timeout: 30_000, // 30-second timeout
        maxRetries: 2,
      }
    );

    res.json(response);
  } catch (error: unknown) {
    console.error('OpenAI API error:', error);

    // Handle specific error types
    if (error instanceof OpenAI.APIError) {
      switch (error.status) {
        case 429:
          res
            .status(429)
            .json({ error: 'Rate limit exceeded. Please try again later.' });
          return;
        case 401:
          res.status(401).json({ error: 'Invalid API key' });
          return;
        case 500:
          res.status(502).json({ error: 'OpenAI server error' });
          return;
        default:
          res.status(error.status ?? 500).json({
            error: 'OpenAI API error',
            details: error.message,
          });
          return;
      }
    }

    // Handle timeout / network errors
    if (error instanceof Error) {
      if (
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ECONNABORTED') ||
        error.message.includes('timeout')
      ) {
        res.status(504).json({ error: 'Request timed out' });
        return;
      }
    }

    res.status(500).json({
      error: 'An error occurred while processing your request',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
