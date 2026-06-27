# ARVR Furniture Visualizer — Demo Script

## Prerequisites

- A device that supports WebXR AR (Android Chrome 100+ or iOS Safari 15+)
- For non-AR testing: any modern desktop browser (Chrome, Firefox, Edge, Safari)
- OpenAI API key configured as `OPENAI_API_KEY` environment variable
- Both the frontend (Vite) and backend (Express) servers running

---

## Flow 1: Browse & Place (Manual Catalog)

This flow demonstrates the hands-on approach to furniture visualization using the built-in product catalog.

1. Open the app — the 3D viewport loads (AR or fallback depending on device)
2. Tap the grid icon (top-left corner) to open the Product Catalog panel
3. Browse products — use the search bar to filter by name, category, style, or color
4. Use category filter pills to narrow results by furniture type (Sofa, Chair, Table, Lamp, etc.)
5. Tap a product card — it becomes selected and is highlighted in the browser
6. In AR mode: tap a detected surface to place the model at that location
7. In fallback mode: the model appears at the center of the 3D scene
8. Touch/manipulate the placed model:
   - Single-finger drag to move across the surface
   - Two-finger pinch to scale up or down
   - Two-finger rotate to change orientation
9. Tap "Clear All" to remove all placed models from the scene

---

## Flow 2: Conversational AI (Chat)

This flow demonstrates the AI-powered product discovery experience using natural language.

1. Tap the chat bubble icon (top-right corner) to open the chat panel
2. Type a message such as "show me a couch" or "I need a coffee table"
3. The AI responds with matching products from the catalog, displayed as product cards in the chat
4. Continue the conversation with follow-up queries:
   - "show me something modern"
   - "in blue"
   - "what do you have for a bedroom?"
5. The AI retains context across messages, building on previous selections and preferences
6. Tap "Place in AR" on any product card in the chat response
7. The chat panel closes and the product loads into the AR/fallback scene for placement

---

## Flow 3: AI to AR Auto-Handoff

This flow demonstrates the seamless transition from AI conversation to AR placement.

1. Open chat and type "select the grey sofa"
2. The AI calls the `select_product` function internally
3. The chat panel closes automatically
4. The product loads and becomes the active selection in the AR/fallback scene
5. In AR mode: tap a detected surface to place the model at that location
6. In fallback mode: the model appears at the scene center and can be repositioned with touch gestures

---

## Flow 4: Voice Input

This flow demonstrates hands-free interaction using the Web Speech API.

1. Open chat and tap the microphone button (requires HTTPS or localhost)
2. Speak a command such as "show me a dining table"
3. The voice input transcribes your speech and sends it as a chat message automatically
4. The AI responds with matching products from the catalog
5. Continue with voice or keyboard input as needed

Note: Voice input requires a secure context (HTTPS or localhost) due to Web Speech API browser restrictions.

---

## Flow 5: PWA Installation

This flow demonstrates installing the app as a Progressive Web App on a mobile device.

1. On Android Chrome: tap the "Install" banner or use the browser menu to select "Add to Home Screen"
2. On iOS Safari: tap the Share button, then select "Add to Home Screen"
3. The app opens in standalone mode with no browser chrome (address bar, navigation buttons)
4. Full AR, chat, and browse functionality works offline for previously cached assets
5. The app icon appears on the home screen alongside native applications

---

## Expected Behavior Notes

- Desktop browsers without WebXR support display the fallback 3D viewport with orbit controls (click and drag to orbit, scroll to zoom)
- WebXR AR mode requires HTTPS (works on localhost during development, HTTPS required in production)
- Voice input requires HTTPS or localhost (Web Speech API browser restriction)
- The AI agent can only reference the 12 products in the built-in catalog — it cannot browse the web or access external product databases
- Product models are geometric placeholders (colored boxes, cylinders, and composite shapes) rather than realistic 3D scans
- The AI maintains conversation context within a single session; context does not persist across page reloads
- All product placement, manipulation, and rendering occurs client-side in the browser

---

## Product Catalog Reference

The following 12 products are available in the catalog:

| ID | Name | Category | Style | Color |
|---|---|---|---|---|
| lounge-sofa | Lounge Sofa | Sofa | Modern | Gray |
| coffee-table | Coffee Table | Table | Minimalist | Brown |
| dining-chair | Dining Chair | Chair | Scandinavian | White |
| floor-lamp | Floor Lamp | Lamp | Modern | Black |
| double-bed | Double Bed | Bed | Classic | White |
| bookshelf | Bookshelf | Bookshelf | Minimalist | Brown |
| desk | Desk | Desk | Modern | White |
| area-rug | Area Rug | Rug | Rustic | Red |
| tv-cabinet | TV Cabinet | Cabinet | Minimalist | Black |
| potted-plant | Potted Plant | Plant | Scandinavian | Green |
| side-table | Side Table | Table | Modern | Walnut |
| armchair | Armchair | Chair | Classic | Navy |
