# Architecture Overview

## High-Level Data Flow

```
User --> Browser --> React App (App.tsx)
  |
  +---> WebXR / Three.js <--> AR Scene
  |         |
  |         +-- ModelPlacer (places meshes in scene)
  |         +-- ModelManipulator (touch gestures: drag, pinch, rotate)
  |         +-- HitTestManager (surface detection in AR)
  |
  +---> ProductBrowser <--> catalog.json (12 items)
  |         |
  |         +-- CategoryFilter (filter by type)
  |         +-- Search bar (filter by name, style, color)
  |
  +---> ChatPanel --> useAgent --> AgentLoop
                |
                +--> POST /api/chat --> Express (server/index.ts)
                |         |
                |         +--> OpenAI API (GPT-4o-mini)
                |               |
                |               +--> Function call: search_products
                |               +--> Function call: get_product_details
                |               +--> Function call: select_product
                |
                +--> Tool results executed locally (client-side)
                +--> select_product triggers AR/fallback placement
```

---

## Core Components

### App.tsx — Root Orchestrator

The central React component that connects all subsystems. Manages view mode state (`loading`, `ar`, `fallback`, `unsupported`), initializes the 3D rendering layer, and coordinates between the product browser, chat panel, and AR scene.

### WebXR / Three.js Rendering Layer

Located in `src/xr/`. Handles all 3D rendering and AR session management.

- **ARScene.ts**: Initializes the WebXR AR session, sets up the Three.js scene with AR lighting and camera, and manages the XR reference space.
- **FallbackViewport.ts**: Provides a non-AR 3D viewport with orbit controls for desktop browsers or devices without WebXR support.
- **HitTestManager.ts**: Performs hit testing against real-world surfaces in AR mode to determine where furniture can be placed.
- **ModelLoader.ts**: Converts catalog entries into Three.js meshes. Uses procedurally generated geometric shapes (boxes, cylinders, composite forms) with product-matching colors.
- **ModelManipulator.ts**: Handles touch-based manipulation — single-finger drag for translation, two-finger pinch for scaling, two-finger rotation for orientation changes.
- **ModelPlacer.ts**: Places loaded models into the active scene (AR or fallback) at the position determined by hit testing or user interaction.

### AI Agent Layer

Located in `src/ai/`. Manages the conversational AI experience.

- **AgentLoop.ts**: Core orchestration class that implements the user to LLM to tool to response cycle. Sends conversation history to the backend, handles function-calling loops (up to 5 iterations), and returns final responses with optional product selections.
- **ConversationState.ts**: Maintains multi-turn conversation memory with localStorage persistence. Tracks user preferences (styles, colors, recently viewed products) to inform context across messages.
- **VoiceInput.ts**: Integrates the Web Speech API for hands-free voice input. Requires a secure context (HTTPS or localhost).
- **functions/**: Tool function definitions and executors for OpenAI function calling:
  - `searchProducts`: Filters the catalog by query, category, style, and color
  - `getProductDetails`: Returns full details for a specific product by ID
  - `selectProduct`: Selects a product for AR placement and triggers the handoff
- **prompts/systemPrompt.ts**: Defines the system prompt that instructs the AI agent on available products, tool usage, and conversational behavior.

### UI Components

Located in `src/components/`. React components for the user interface.

- **ChatPanel.tsx**: The chat interface with message history, text input, voice button, and product cards rendered within AI responses.
- **ProductBrowser.tsx**: A slide-up panel for manually browsing the full product catalog with search and category filtering.
- **ProductCard.tsx** / **ChatProductCard.tsx**: Display individual product information with selection and placement actions.
- **ErrorBoundary.tsx**: Catches and displays React rendering errors without crashing the entire application.

---

## Key Design Decisions

### 1. Web PWA over Native Application

Zero app-store friction, faster iteration for an MVP. WebXR AR is supported on Android Chrome 100+ and iOS Safari 15+, covering the majority of modern mobile devices. The service worker enables offline caching of static assets.

### 2. Separate Express Backend for AI

Keeps the OpenAI API key server-side, preventing exposure to the client. The Vite dev server proxies `/api/*` to the backend during development. In production on Vercel, the `api/index.ts` adapter routes requests to the serverless function.

### 3. Placeholder Geometric Models

Avoids external GLTF download failures, licensing concerns, and large asset payloads. Models are procedurally generated Three.js meshes (BoxGeometry, CylinderGeometry, custom composite shapes) with colors derived from the product catalog. This approach is lightweight, reliable, and sufficient for spatial visualization.

### 4. Non-Streaming LLM Responses

The entire LLM response is returned at once rather than streamed token-by-token. This simplifies the implementation for an MVP while maintaining a responsive user experience, since GPT-4o-mini responses for this use case are typically short.

### 5. Chat Panel as Toggle Overlay

Preserves the AR viewport screen real estate on mobile devices. The chat and product browser panels slide over the 3D viewport rather than resizing it, ensuring the AR experience remains immersive when panels are closed.

### 6. Function Calling for Product Interaction

The AI agent uses OpenAI function calling to interact with the product catalog. This provides structured, reliable product search and selection rather than relying on the LLM to generate unstructured text responses that would require parsing.

---

## State Management

The application uses a combination of React state and Zustand for state management:

- **React useState/useCallback**: Local UI state (panel visibility, selected product ID, view mode)
- **Zustand store**: Global state for placed models, selected model, and model transforms
- **ConversationState (class)**: AI conversation history and session context with localStorage persistence
- **React Context (SelectedProductContext)**: Shared product selection state across components

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check endpoint |
| GET | `/api/products` | Returns the full product catalog |
| GET | `/api/products/:id` | Returns a single product by ID |
| POST | `/api/chat` | OpenAI chat proxy (accepts messages, tools, tool_choice) |

---

## Deployment Architecture

```
Vercel
├── Static Files (dist/)
│   ├── index.html
│   ├── assets/ (JS, CSS, fonts)
│   └── service-worker.js
│
└── Serverless Functions (api/)
    └── index.ts (Express app adapter)
        └── POST /api/chat --> OpenAI API
```

Vercel serves the static frontend from the `dist/` directory and routes `/api/*` requests to the Express serverless function. The OpenAI API key is stored as a Vercel environment variable and accessed server-side only.
