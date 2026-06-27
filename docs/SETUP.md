# ARVR Furniture Visualizer — Setup Guide

## Prerequisites

- Node.js 18 or later
- npm 9 or later
- An OpenAI API key (GPT-4o-mini access)

---

## Local Development

### 1. Clone the repository

```bash
git clone <repository-url>
cd ARVR
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Install backend dependencies

```bash
cd server
npm install
cd ..
```

### 4. Configure environment variables

Copy the example environment file and add your OpenAI API key:

```bash
cp .env.example .env
```

Edit `.env` and set the following:

```
OPENAI_API_KEY=sk-your-api-key-here
```

### 5. Start the backend server

In a dedicated terminal:

```bash
cd server
npx tsx watch index.ts
```

The backend starts on `http://localhost:3001`.

### 6. Start the frontend dev server

In a separate terminal:

```bash
npm run dev
```

The frontend starts on `http://localhost:5173` with hot module replacement.

### 7. Open the application

Navigate to `http://localhost:5173` in your browser. The Vite dev server proxies `/api/*` requests to the Express backend at port 3001.

---

## Running on Your Local Network (Mobile Testing)

To test on a physical mobile device over WiFi:

1. Start both the backend and frontend servers (steps 5 and 6 above)
2. Find your local IP address:
   - Windows: `ipconfig` — look for the IPv4 address under your active network adapter
   - Mac/Linux: `ifconfig` or `ip addr`
3. On your phone (connected to the same WiFi network), navigate to `http://<your-local-ip>:5173`
4. Note: WebXR AR requires HTTPS. Use the Vercel deployment for full AR testing on mobile devices.

---

## Production Build

```bash
npm run build
```

This compiles TypeScript and outputs the production bundle to the `dist/` directory.

---

## Deploying to Vercel

1. Push the repository to GitHub
2. Import the repository in the Vercel dashboard
3. Configure the project settings:
   - **Build command:** `npm run build`
   - **Output directory:** `dist/`
4. Set the `OPENAI_API_KEY` in Vercel Environment Variables (Settings > Environment Variables)
5. Deploy — Vercel serves the static frontend and routes `/api/*` requests to the serverless function in `api/index.ts`

---

## Project Structure

```
ARVR/
├── src/                        # Frontend source code
│   ├── App.tsx                 # Main application orchestrator
│   ├── App.css                 # Layout and component styles
│   ├── main.tsx                # Entry point + service worker registration
│   ├── ai/                     # AI agent layer
│   │   ├── AgentLoop.ts        # LLM to tool to response orchestration
│   │   ├── ConversationState.ts # Multi-turn memory with localStorage
│   │   ├── VoiceInput.ts       # Web Speech API integration
│   │   ├── functions/          # Tool function schemas + executors
│   │   └── prompts/            # System prompts for the AI agent
│   ├── components/             # React UI components
│   │   ├── ChatPanel.tsx       # AI chat interface
│   │   ├── ProductBrowser.tsx  # Manual catalog browser
│   │   ├── ProductCard.tsx     # Individual product card
│   │   ├── ChatProductCard.tsx # Product card within chat messages
│   │   ├── CategoryFilter.tsx  # Category filter pills
│   │   ├── VoiceButton.tsx     # Microphone toggle button
│   │   ├── ErrorBoundary.tsx   # React error boundary
│   │   ├── ErrorMessage.tsx    # Error display component
│   │   ├── LoadingSpinner.tsx  # Loading indicator
│   │   └── MessageBubble.tsx   # Chat message bubble
│   ├── context/                # React context providers
│   │   └── SelectedProductContext.tsx
│   ├── data/                   # Product catalog
│   │   ├── catalog.json        # 12-item product database
│   │   ├── catalog-summary.ts  # Compact catalog for AI context
│   │   └── categories.ts       # Category definitions
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAgent.ts         # AI agent interface
│   │   ├── useARSession.ts     # WebXR session management
│   │   ├── useHitTest.ts       # Surface detection
│   │   ├── useModelPlacement.ts # Model placement and transforms
│   │   └── useVoiceInput.ts    # Voice input hook
│   ├── styles/                 # Animation CSS
│   ├── types.ts                # Shared TypeScript types
│   └── xr/                     # WebXR and Three.js rendering layer
│       ├── ARScene.ts          # WebXR AR scene setup
│       ├── FallbackViewport.ts # Non-AR 3D fallback with orbit controls
│       ├── HitTestManager.ts   # AR surface hit testing
│       ├── ModelLoader.ts      # Catalog to Three.js mesh conversion
│       ├── ModelManipulator.ts # Touch gesture handling
│       └── ModelPlacer.ts      # Model placement in scene
├── server/                     # Express backend
│   ├── index.ts                # API server (Express)
│   ├── chat.ts                 # OpenAI chat proxy handler
│   ├── package.json            # Backend dependencies
│   └── tsconfig.json           # Backend TypeScript config
├── api/                        # Vercel serverless entry point
│   └── index.ts                # Serverless function adapter
├── public/                     # Static assets and PWA manifest
│   └── manifest.json           # Web app manifest
├── dist/                       # Production build output
├── .env.example                # Environment variable template
├── index.html                  # HTML entry point
├── package.json                # Frontend dependencies and scripts
├── tsconfig.json               # Frontend TypeScript config
├── vite.config.ts              # Vite configuration
└── vercel.json                 # Vercel deployment configuration
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 with TypeScript |
| Build tool | Vite 5 |
| 3D rendering | Three.js 0.162 |
| AR support | WebXR API |
| AI model | OpenAI GPT-4o-mini (function calling) |
| State management | Zustand + React Context |
| Backend | Express.js (Node.js) |
| Deployment | Vercel (static + serverless) |
| PWA | Service worker + web app manifest |

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite frontend dev server |
| `npm run dev:server` | Start the Express backend with hot reload |
| `npm run dev:all` | Start both frontend and backend concurrently |
| `npm run build` | TypeScript compile + Vite production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint on all TypeScript and React files |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | OpenAI API key with GPT-4o-mini access |

The backend reads this from the `.env` file at the project root. The frontend does not access this variable directly — all OpenAI requests are proxied through the Express server.
