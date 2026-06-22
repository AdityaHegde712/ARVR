# ARVR — AI-Powered AR Furniture Visualizer

## Plan Overview

> **Vision**: A web-based PWA where users point their phone camera at a room, ask (via voice or text) "What would a couch look like here?", and an AI agent searches a furniture catalog and renders selected 3D models in real-time AR on detected surfaces.

| Attribute | Value |
|-----------|-------|
| **Timeline** | 14 days (MVP) |
| **Platform** | Web (PWA) — Android Chrome, iOS Safari 15+ |
| **Stack** | Vite + React, Three.js + WebXR, OpenAI GPT-4o-mini, Web Speech API, Next.js API Routes |
| **Deployment** | Vercel (frontend + API) |
| **Product Catalog** | Static JSON (10–20 curated furniture items with GLTF/GLB 3D models) |
| **Confidence Mode** | Conservative (Owner approval required per phase) |

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     PWA (Vite + React + TypeScript)              │
│                                                                  │
│  ┌─────────────────────┐  ┌──────────────┐  ┌────────────────┐   │
│  │    AR Viewport      │  │  Chat Panel  │  │  Product       │   │
│  │  (Three.js + WebXR) │  │  (Convers-   │  │  Browser       │   │
│  │                     │  │   ational UI)│  │  (Grid/Cards)  │   │
│  └──────┬──────────────┘  └─────┬────────┘  └───────┬────────┘   │
│         │                       │                   │            │
│  ┌──────┴───────────────────────┴───────────────────┴──────────┐ │
│  │                   Zustand State Management                  │ │
│  │  (ARSessionState, ConversationState, SelectedProductContext)│ │
│  └─────────────────────────────┬───────────────────────────────┘ │
│                                │                                 │
│  ┌─────────────────────────────┴────────────────────────────────┐│
│  │                  Service Layer (API Calls)                   ││
│  └─────────────────────────────┬────────────────────────────────┘│
└────────────────────────────────┼─────────────────────────────────┘
                                 │ HTTPS
┌────────────────────────────────┼──────────────────────────────────┐
│              Next.js API Routes (or FastAPI)                      │
│  ┌─────────────────────────────┴────────────────────────────────┐ │
│  │                    API Gateway                               │ │
│  │  - POST /api/chat (OpenAI proxy)                             │ │
│  │  - GET /api/products (Catalog search)                        │ │
│  │  - GET /api/products/:id (Product details)                   │ │
│  └──┬──────────┬────────────────┬───────────────────────────────┘ │
│     │          │                │                                 │
│  ┌──┴───┐  ┌───┴──────┐   ┌─────┴──────┐                          │
│  │OpenAI│  │ Product  │   │ 3D Model   │                          │
│  │Proxy │  │ Catalog  │   │  Proxy     │                          │
│  │(GPT- │  │ (Static  │   │ (Optional) │                          │
│  │ 4o-  │  │  JSON)   │   │            │                          │
│  │mini) │  │          │   │            │                          │
│  └──────┘  └──────────┘   └────────────┘                          │
└───────────────────────────────────────────────────────────────────┘
```

---

## Phases

### Phase 1: Foundation (Days 1–3)
**Goal**: Working AR view with surface detection and sample 3D object placement.

| Task | Agent | Complexity |
|------|-------|------------|
| 1.1 Scaffold Vite + React + TypeScript project | `@frontend-dev` | 2/10 |
| 1.2 Set up Three.js scene with WebXR AR mode | `@dynamic-webxr-engineer` | 7/10 |
| 1.3 Implement AR session lifecycle (request, start, end) | `@dynamic-webxr-engineer` | 6/10 |
| 1.4 Implement surface detection via WebXR HitTestSource | `@dynamic-webxr-engineer` | 7/10 |
| 1.5 Create `useARSession` and `useHitTest` React hooks | `@dynamic-webxr-engineer` | 5/10 |
| 1.6 Place sample 3D object on detected surface on tap | `@dynamic-webxr-engineer` | 6/10 |
| 1.7 Non-AR fallback mode (3D viewport with grid floor) | `@dynamic-webxr-engineer` | 4/10 |

**Deliverable**: User opens the PWA, points camera at floor, taps → cube/sofa appears on surface.

---

### Phase 2: Product Catalog + 3D Models (Days 4–6)
**Goal**: 10–20 furniture items browsable and renderable in AR.

| Task | Agent | Complexity |
|------|-------|------------|
| 2.1 Curate 10–20 free furniture GLTF/GLB 3D models (Sketchfab, Poly Pizza) | `@frontend-dev` | 3/10 |
| 2.2 Create product catalog JSON schema and data file | `@backend-dev` | 2/10 |
| 2.3 Build product thumbnail images | `@frontend-dev` | 2/10 |
| 2.4 Implement GLTF/GLB model loader with asset cache | `@dynamic-webxr-engineer` | 5/10 |
| 2.5 Implement product browser UI (grid/list of product cards) | `@frontend-dev` | 4/10 |
| 2.6 Wire product selection → load model in AR | `@dynamic-webxr-engineer` + `@frontend-dev` | 5/10 |
| 2.7 Implement model placement refinement (snap to surface, shadow plane) | `@dynamic-webxr-engineer` | 5/10 |
| 2.8 Implement model manipulation (scale slider, drag-to-move, rotate gesture) | `@dynamic-webxr-engineer` | 6/10 |

**Deliverable**: Browse furniture catalog, tap any item → it appears in AR on detected surface with manipulation controls.

---

### Phase 3: AI Chat Layer (Days 7–10)
**Goal**: Conversational AI agent that understands natural language furniture requests.

| Task | Agent | Complexity |
|------|-------|------------|
| 3.1 Set up Next.js API Routes (or FastAPI backend) | `@backend-dev` | 3/10 |
| 3.2 Set up OpenAI API integration with proxy endpoint | `@backend-dev` | 3/10 |
| 3.3 Design function calling schema + system prompts for GPT-4o-mini | `@ml/model-scientist` | 5/10 |
| 3.4 Implement core agent loop module (`AgentLoop.ts`) | `@dynamic-ai-agent-orchestrator` | 7/10 |
| 3.5 Implement product search function + catalog query executor | `@dynamic-ai-agent-orchestrator` + `@backend-dev` | 5/10 |
| 3.6 Implement conversation state management | `@dynamic-ai-agent-orchestrator` | 4/10 |
| 3.7 Build Chat UI component (message bubbles, input field, mic button) | `@frontend-dev` | 4/10 |
| 3.8 Implement voice input via Web Speech API | `@dynamic-ai-agent-orchestrator` | 4/10 |
| 3.9 Create `useAgent` and `useVoiceInput` React hooks | `@dynamic-ai-agent-orchestrator` | 4/10 |
| 3.10 Wire chat → product search → results display flow | `@dynamic-ai-agent-orchestrator` + `@frontend-dev` | 5/10 |

**Deliverable**: User types or says "Show me a brown leather couch" → AI returns product cards → user browses and picks one.

---

### Phase 4: Integration + Polish (Days 11–14)
**Goal**: End-to-end flow from conversation to AR placement, deployed as installable PWA.

| Task | Agent | Complexity |
|------|-------|------------|
| 4.1 Implement SelectedProduct handshake bridge (AI→AR handoff) | `@dynamic-ai-agent-orchestrator` | 4/10 |
| 4.2 Connect chat product selection → automatic AR rendering | `@dynamic-webxr-engineer` + `@dynamic-ai-agent-orchestrator` | 5/10 |
| 4.3 Error handling for all states (no surface, model load fail, API errors) | All | 4/10 |
| 4.4 Loading states and micro-animations | `@frontend-dev` | 3/10 |
| 4.5 PWA manifest + service worker setup (installable on home screen) | `@frontend-dev` | 3/10 |
| 4.6 Responsive/mobile layout refinement | `@frontend-dev` | 3/10 |
| 4.7 Non-AR fallback polish (3D viewport when AR unavailable) | `@dynamic-webxr-engineer` | 3/10 |
| 4.8 Cross-browser device testing (Android Chrome, iOS Safari) | `@tester` | 5/10 |
| 4.9 Performance profiling + optimization (draw calls, model LOD) | `@dynamic-webxr-engineer` + `@tester` | 4/10 |
| 4.10 Build + deploy to Vercel | `@ops-expert` | 2/10 |
| 4.11 Demo script and user flow documentation | `@technical-writer` | 2/10 |

**Deliverable**: Fully functional PWA — user loads URL, grants camera permission, speaks a furniture request, AI recommends products, user taps one, and it renders in AR on their floor.

---

## Key Design Decisions

1. **Web over Native**: Chose WebXR PWA over native ARKit/ARCore for zero app-store friction and faster iteration. AR quality is slightly reduced but adequate for MVP validation.
2. **Static Catalog Over Live API**: Avoids Amazon API approval delays (weeks). 10–20 curated models from free sources (Sketchfab, Poly Pizza) are sufficient for an MVP demo.
3. **GPT-4o-mini Over Local Models**: Fast, cheap, excellent function calling. No GPU infrastructure needed.
4. **Non-Streaming LLM**: Simpler implementation for MVP. User sees "thinking..." indicator while AI processes.
5. **Shared React Context for AI→AR Handoff**: Both dynamic agents produce hooks that connect through a common `SelectedProductContext` — no direct coupling.
6. **Non-AR Fallback**: 3D viewport with orbit camera + grid floor for desktop users and devices that don't support WebXR.

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| WebXR not supported on user's device | High | Non-AR fallback 3D viewport (always available) |
| iOS Safari WebXR is limited | Medium | Test early on iOS; text fallbacks for unsupported features |
| 3D model loading slow on mobile | Medium | Use Draco-compressed GLTF, asset caching, loading indicators |
| OpenAI API latency | Medium | Non-streaming with "thinking..." indicator; keep context small |
| Voice input unreliable in noisy environments | Low | Always offer text input as primary method; voice is additive |
| 14-day timeline too aggressive | Medium | Prioritize Phase 1–3 (core flow); Phase 4 polish is additive |
