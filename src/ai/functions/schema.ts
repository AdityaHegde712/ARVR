import { ChatCompletionTool } from 'openai/resources/chat/completions';

export const PRODUCT_SEARCH_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Search furniture products by any combination of criteria. Returns matching products from the catalog.",
      parameters: {
        type: "object",
        properties: {
          query: { 
            type: "string", 
            description: "Free-text search query matching product name, description, or style" 
          },
          category: { 
            type: "string", 
            enum: ["Sofa", "Chair", "Table", "Lamp", "Bed", "Bookshelf", "Desk", "Rug", "Cabinet", "Plant"],
            description: "Filter by furniture category"
          },
          style: { 
            type: "string", 
            enum: ["Modern", "Minimalist", "Classic", "Rustic", "Scandinavian"],
            description: "Filter by design style"
          },
          color: { 
            type: "string", 
            description: "Filter by color (e.g., brown, gray, white, black, navy, green, red, walnut)" 
          },
          maxResults: {
            type: "number",
            description: "Maximum number of results to return (default: 5)",
            default: 5
          }
        },
        anyOf: [
          { required: ["query"] },
          { required: ["category"] }
        ]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_product_details",
      description: "Get detailed information about a specific product by its ID.",
      parameters: {
        type: "object",
        properties: {
          productId: { 
            type: "string", 
            description: "The product ID from the catalog (e.g., 'lounge-sofa', 'coffee-table')" 
          }
        },
        required: ["productId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "select_product",
      description: "Called when the user confirms they want to place a specific product in AR. This triggers the 3D model to render.",
      parameters: {
        type: "object",
        properties: {
          productId: { 
            type: "string", 
            description: "The product ID the user selected" 
          },
          confirmPhrase: {
            type: "string",
            description: "The user's confirmation phrase (e.g., 'yes, show me that one', 'place it')"
          }
        },
        required: ["productId", "confirmPhrase"]
      }
    }
  }
];

export type ToolName = 'search_products' | 'get_product_details' | 'select_product';