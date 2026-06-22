# ARVR — AI-Powered AR Furniture Visualizer

An interactive, web-based Progressive Web App (PWA) that allows users to place and visualize 3D furniture models in their real-world environment using Augmented Reality (AR) and a conversational AI assistant. 

With this app, users can point their mobile camera at a room, speak or type natural language requests (e.g., *"Show me a modern grey couch"*), receive AI-driven catalog recommendations, and watch the selected 3D model automatically render in AR on detected surfaces.

---

## 🌟 Key Features

*   **Immersive WebXR Viewport**: Core 3D engine powered by Three.js that handles WebXR AR sessions, camera initialization, and real-time surface detection (via WebXR hit-testing).
*   **Conversational AI Assistant**: An intelligent multi-turn chat experience powered by OpenAI's `gpt-4o-mini` with structured function calling to query the catalog, fetch product details, and trigger placement.
*   **Voice Control & Web Speech**: Voice-to-text integration using the Web Speech API (WebkitSpeechRecognition) with a microphone control interface.
*   **Desktop & Non-AR Fallback**: A 3D viewport fallback featuring OrbitControls and a grid floor for desktop devices or devices without WebXR support.
*   **3D Model Touch Manipulation**: Interactive controls allowing users to move (drag-to-move), scale (pinch-to-scale), and rotate (twist gesture) the placed items.
*   **Progressive Web App (PWA)**: Optimized for mobile browsers (Android Chrome, iOS Safari) with a custom manifest, offline service worker caching, and high-res app icons.
*   **Express Proxy Server**: A backend proxy (`server/index.ts`) that manages catalog APIs and wraps OpenAI calls to avoid exposing API keys on the client side.

---

## 🛠️ Tech Stack

*   **Frontend**: React (v18), TypeScript, Vite, Three.js, Zustand (State Management)
*   **Backend**: Express, Node.js, TSX (TypeScript Execute)
*   **APIs & Services**: OpenAI API (`gpt-4o-mini`), Web Speech API
*   **Deployment**: Vercel (Front-end SPA + Serverless backend function mapping)

---

## 📐 Architecture & Integration

Both the AI chat agent and the WebXR viewport run as decoupled modules that sync state via a global context:

```
┌─────────────────────────────────────────────┐
│  App.tsx (orchestrator)                     │
│  ├─ ARScene / FallbackViewport (3D canvas)   │
│  ├─ ProductBrowser (slide-out panel)         │
│  ├─ ChatPanel (toggle panel)                 │
│  └─ Top bar (status, toggles)               │
├─────────────────────────────────────────────┤
│  AgentLoop  ──►  OpenAI API (via backend)    │
│  ├─ searchProducts()                         │
│  ├─ getProductDetails()                      │
│  └─ selectProduct() ──► AR placement         │
├─────────────────────────────────────────────┤
│  Backend (Express :3001)                     │
│  ├─ POST /api/chat (OpenAI proxy)            │
│  ├─ GET /api/products                        │
│  ├─ GET /api/products/:id                    │
│  └─ GET /api/health                          │
└─────────────────────────────────────────────┘
```

1.  **AI $\rightarrow$ AR Handoff**: When a user chats with the AI agent and says *"let me see that couch"*, the agent triggers the `select_product` tool call. This updates the `SelectedProductContext` which the Three.js viewport listens to, automatically spawning the model in the AR environment on the user's crosshair.
2.  **State Management**: Zustand manages UI visibility, panel toggles (e.g., opening/closing the chat or product browser), and general connection statuses.

---

## 📁 Repository Structure

```
ARVR/
├── src/
│   ├── App.tsx                     # App shell and UI layout orchestration
│   ├── main.tsx                    # Entry point & service worker registration
│   ├── types.ts                    # Shared TypeScript types
│   ├── xr/                         # WebXR, Three.js, and viewport managers
│   │   ├── ARScene.ts              # WebXR session and 3D rendering loop
│   │   ├── HitTestManager.ts       # Floor & surface detection
│   │   ├── ModelLoader.ts          # Geometric object generator (placeholder builder)
│   │   ├── ModelPlacer.ts          # Logic for snapping objects onto surfaces
│   │   ├── ModelManipulator.ts     # Mobile drag, rotate, and scale gestures
│   │   └── FallbackViewport.ts     # Desktop 3D scene fallback with OrbitControls
│   ├── ai/                         # Conversational Agent Loop and actions
│   │   ├── AgentLoop.ts            # LLM orchestrator and tool calls resolver
│   │   ├── ConversationState.ts    # Multi-turn memory persistent to localStorage
│   │   ├── VoiceInput.ts           # Speech recognition wrapper
│   │   ├── functions/              # LLM tool implementations
│   │   │   ├── schema.ts           # Tool definition schema
│   │   │   ├── searchProducts.ts   # Catalog search tool
│   │   │   ├── getProductDetails.ts
│   │   │   └── selectProduct.ts    # AR selection trigger
│   │   └── prompts/
│   │       └── systemPrompt.ts     # AI agent instructions and catalog context
│   ├── components/                 # React UI layout blocks
│   │   ├── ChatPanel.tsx           # Conversations container (user, agent, voice)
│   │   ├── ProductBrowser.tsx      # Manual product catalogue search & filters
│   │   ├── ErrorBoundary.tsx       # Safety fallback for render errors
│   │   └── ...                     # Message bubbles, indicators, spinners
│   ├── hooks/                      # Custom hooks hooking up components to contexts
│   │   ├── useARSession.ts         # Handles start/stop/state of AR viewport
│   │   ├── useAgent.ts             # Direct interface with the AgentLoop
│   │   └── ...
│   ├── context/
│   │   └── SelectedProductContext.tsx # Context passing chosen models between AI and AR
│   └── data/
│       ├── catalog.json            # 12-item catalog (sofas, tables, lamps, rugs)
│       └── catalog-summary.ts      # Condensed product overview for system prompt injection
├── server/
│   ├── index.ts                    # Express server (serves products and routes /api/chat)
│   └── chat.ts                     # Handler interfacing with OpenAI SDK
├── public/
│   ├── manifest.json               # PWA App definition
│   └── sw.js                       # Service worker caching files for offline use
├── vercel.json                     # Vercel configuration for API routes redirection
├── vite.config.ts                  # Vite config (proxies client '/api' calls to 3001)
└── package.json                    # Project metadata, scripts, and dependencies
```

---

## 🚀 Getting Started

### 📋 Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or higher recommended)
*   An **OpenAI API Key** (for conversational AI functions)

### 💻 Installation

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/AdityaHegde712/ARVR.git
    cd ARVR
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Set Up Environment Variables**:
    Create a `.env` file in the root folder of the project:
    ```env
    OPENAI_API_KEY=your_openai_api_key_here
    ```

### ⚡ Running Locally

You can launch both the frontend and the proxy server concurrently using:
```bash
npm run dev:all
```

Alternatively, you can run them in separate terminals:

*   **Terminal 1 (Backend Server)**:
    ```bash
    npm run dev:server
    ```
    This starts the Express server on `http://localhost:3001` (with the `/api/chat` route).

*   **Terminal 2 (Frontend Client)**:
    ```bash
    npm run dev
    ```
    This starts the Vite dev server on `http://localhost:5173`. Vite is configured to proxy all `/api/*` requests directly to `http://localhost:3001`.

---

## 📱 Mobile AR Testing

Because WebXR requires a secure origin (HTTPS) and access to device sensors, testing AR features on your mobile phone requires one of the following setups:

1.  **Local Network (HTTP Fallback)**:
    Start the Vite dev server with external host access:
    ```bash
    npm run dev -- --host
    ```
    Navigate to `http://<your-local-ip>:5173` on your mobile phone connected to the same WiFi network.
    *Note: Chrome on Android may require enabling flags for insecure origins if camera/XR permissions are blocked under HTTP.*

2.  **HTTPS Proxy (Recommended for Local Dev)**:
    Use a tool like [ngrok](https://ngrok.com/) to tunnel your local port `5173` over a secure HTTPS url:
    ```bash
    ngrok http 5173
    ```

3.  **Deployment (Vercel)**:
    Deploy to Vercel (see instructions below), which provides automatic SSL/HTTPS.

---

## 📦 Deployment to Vercel

The application is pre-configured to build and deploy directly on **Vercel** as a single deployment hosting both the React client and the Express backend:

1.  Push your code changes to GitHub/GitLab.
2.  Import the repository into your Vercel Dashboard.
3.  Configure **Environment Variables**:
    *   Add `OPENAI_API_KEY` under your Project Settings $\rightarrow$ Environment Variables.
4.  Vercel automatically reads `vercel.json` to route `/api/*` to the serverless function located in `api/index.ts` and routes everything else to the static React bundle generated by `npm run build`.

---

## 🎯 Demo Walkthrough Script

Try this step-by-step walkthrough to test the integrated flow:

1.  **Launch the App**: Open the page on desktop (3D fallback) or a WebXR-compatible mobile browser.
2.  **Open the Chat Panel**: Tap the chat icon in the bottom right corner.
3.  **Search for Products**:
    *   *Type/Speak*: *"Show me a couch"*
    *   The AI will call `search_products`, fetch the grey **Lounge Sofa** or navy **Armchair**, and present their cards inside the chat bubble.
4.  **Confirm and Place**:
    *   *Type/Speak*: *"Let me see the gray lounge sofa"* or tap **Select Product** on the card.
    *   The AI will say *"Let me place the Lounge Sofa in your room"* and close the panel.
5.  **Position and Manipulate**:
    *   *AR Mode*: Point your camera at a flat surface (floor/rug). You will see a target reticle. Tap the screen to spawn the Lounge Sofa.
    *   *Touch Gestures*:
        *   **Drag** the sofa to reposition it.
        *   **Twist** with two fingers to rotate it.
        *   **Pinch** to scale it up/down.
6.  **Switch to Catalog**: Tap the catalog button at the bottom left to manually browse and select other categories (like a **Coffee Table** or **Floor Lamp**) to place beside your sofa.
