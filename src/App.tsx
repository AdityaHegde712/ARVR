import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import './App.css';
import { useARSession } from './hooks/useARSession';
import { useHitTest } from './hooks/useHitTest';
import { useModelPlacement } from './hooks/useModelPlacement';
import { useAgent } from './hooks/useAgent';
import { useVoiceInput } from './hooks/useVoiceInput';
import { SelectedProductProvider } from './context/SelectedProductContext';
import ErrorBoundary from './components/ErrorBoundary';
import ChatPanel from './components/ChatPanel';
import ProductBrowser from './components/ProductBrowser';
import type { Product } from './types';
import {
  initFallback,
  onFallbackTap,
  getFallbackScene,
  getFallbackCamera,
  dispose as disposeFallback,
} from './xr/FallbackViewport';
import { getScene, getCamera } from './xr/ARScene';
import { setScene } from './xr/ModelPlacer';
import {
  initModelManipulator,
  disposeModelManipulator,
} from './xr/ModelManipulator';
import catalog from './data/catalog.json';
import type { FallbackTapEvent } from './xr/FallbackViewport';
import type { ProductCatalogEntry } from './xr/ModelLoader';

type ViewMode = 'loading' | 'ar' | 'fallback' | 'unsupported';

const catalogTyped = catalog as ProductCatalogEntry[];

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('loading');
  const fallbackInited = useRef(false);

  // ── Product selection ──────────────────────────────────────────────────
  const [selectedProductId, setSelectedProductId] = useState<string>(
    catalogTyped[0]?.id ?? '',
  );
  const selectedProduct: ProductCatalogEntry = useMemo(
    () =>
      catalogTyped.find((p) => p.id === selectedProductId) ?? catalogTyped[0],
    [selectedProductId],
  );
  const [showBrowser, setShowBrowser] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Hooks
  const {
    messages: chatMessages,
    sendMessage,
    isProcessing,
    selectedProduct: agentSelectedProduct,
  } = useAgent();
  const {
    isListening,
    isSupported: isVoiceSupported,
    startListening,
    stopListening,
  } = useVoiceInput();
  const { isSupported, sessionState, requestSession, endSession, error } =
    useARSession();
  const { isSurfaceDetected, handleTap } = useHitTest();
  const {
    placedModels,
    selectedModelId,
    placeProduct,
    selectModel,
    updateModelTransform,
    clearAll,
  } = useModelPlacement();

  // ── Determine view mode ──────────────────────────────────────────────────
  useEffect(() => {
    if (isSupported === null) return;

    if (isSupported === false) {
      setViewMode('unsupported');
      return;
    }

    setViewMode('fallback');
  }, [isSupported]);

  // ── Initialise fallback viewport when in fallback/unsupported mode ──────
  useEffect(() => {
    if (viewMode !== 'fallback' && viewMode !== 'unsupported') return;
    if (fallbackInited.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialise the fallback 3D viewport
    initFallback(canvas);
    fallbackInited.current = true;

    // Link ModelPlacer to the fallback scene
    const fbScene = getFallbackScene();
    if (fbScene) {
      setScene(fbScene);
    }

    // Initialise the model manipulator for fallback mode
    initModelManipulator(
      canvas,
      fbScene!,
      () => getFallbackCamera(),
      {
        onSelect: (id) => selectModel(id),
        onTransform: (id, pos, scale, rotation) =>
          updateModelTransform(id, pos, scale, rotation),
      },
    );

    // Listen for tap/click on the ground plane
    const unsub = onFallbackTap((event: FallbackTapEvent) => {
      placeProduct(selectedProduct, event.point, null);
    });

    return () => {
      unsub();
      disposeModelManipulator();
      disposeFallback();
      fallbackInited.current = false;
    };
  }, [viewMode, placeProduct, selectModel, updateModelTransform, selectedProduct]);

  // ── Handle session state changes ────────────────────────────────────────
  useEffect(() => {
    if (sessionState === 'active') {
      setViewMode('ar');
    }
  }, [sessionState]);

  // ── Re-initialise manipulator when AR session becomes active ────────────
  useEffect(() => {
    if (sessionState !== 'active') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const arScene = getScene();
    if (!arScene) return;

    // Clean up previous manipulator (from fallback) and init for AR
    disposeModelManipulator();
    initModelManipulator(
      canvas,
      arScene,
      () => getCamera(),
      {
        onSelect: (id) => selectModel(id),
        onTransform: (id, pos, scale, rotation) =>
          updateModelTransform(id, pos, scale, rotation),
      },
    );

    // No cleanup needed here — manipulator is cleaned up when session ends
    // or when component unmounts via the fallback effect cleanup
  }, [sessionState, selectModel, updateModelTransform]);

  // ── Start AR session ────────────────────────────────────────────────────
  const handleStartAR = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setViewMode('loading');

    try {
      // requestSession already calls setScene(arScene) internally
      await requestSession(canvas);
    } catch {
      setViewMode('fallback');
    }
  }, [requestSession]);

  // ── Handle tap on canvas (AR mode) ──────────────────────────────────────
  const handleCanvasTap = useCallback(() => {
    if (viewMode === 'ar') {
      const pos = handleTap();
      if (pos) {
        placeProduct(selectedProduct, pos, null);
      }
    }
  }, [viewMode, handleTap, placeProduct, selectedProduct]);

  // ── Product browser handlers ────────────────────────────────────────────
  const handleSelectProduct = useCallback((product: Product) => {
    setSelectedProductId(product.id);
    setShowBrowser(false);
  }, []);

  const toggleBrowser = useCallback(() => {
    setShowBrowser((prev) => !prev);
  }, []);

  const closeBrowser = useCallback(() => {
    setShowBrowser(false);
  }, []);

  const toggleChat = useCallback(() => {
    setShowChat((prev) => !prev);
  }, []);

  const handlePlaceInAR = useCallback(
    (productId: string) => {
      const product = catalogTyped.find((p) => p.id === productId);
      if (product) {
        setSelectedProductId(productId);
        setShowChat(false);
      }
    },
    [],
  );

  // ── Auto-place product when AI selects one ────────────────────────────
  useEffect(() => {
    if (!agentSelectedProduct) return;
    setSelectedProductId(agentSelectedProduct.productId);

    // If we have a detected surface in AR, place it there
    if (viewMode === 'ar') {
      const pos = handleTap();
      if (pos) {
        const product = catalogTyped.find(
          (p) => p.id === agentSelectedProduct.productId,
        );
        if (product) {
          placeProduct(product, pos, null);
        }
      }
    }

    // In fallback mode, user already clicks to place so just select the product
    setShowChat(false);
  }, [agentSelectedProduct, viewMode, handleTap, placeProduct]);

  // ── Handle canvas click/touch for AR mode ───────────────────────────────
  const onCanvasInteraction = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (viewMode === 'ar') {
        if ('touches' in e && e.touches.length !== 1) return;
        handleCanvasTap();
      }
    },
    [viewMode, handleCanvasTap],
  );

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
    <div className="app fade-in">
      {/* ── Canvas ─────────────────────────────────────────────────── */}
      <canvas
        ref={canvasRef}
        className="ar-canvas"
        onClick={onCanvasInteraction}
        onTouchStart={onCanvasInteraction}
      />

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <div className="ui-top-bar">
        <button className="ui-browser-toggle" onClick={toggleBrowser} aria-label="Toggle product browser">
          {showBrowser ? '✕' : '☰'}
        </button>
        <h1 className="ui-title">AR Furniture Visualizer</h1>
        <button
          className="ui-chat-toggle"
          onClick={toggleChat}
          aria-label="Toggle AI chat"
        >
          {showChat ? '✕' : '💬'}
        </button>
        {viewMode === 'loading' && (
          <span className="ui-badge loading">Loading&hellip;</span>
        )}
        {viewMode === 'ar' && (
          <span className="ui-badge ar-active">AR Active</span>
        )}
        {viewMode === 'fallback' && (
          <span className="ui-badge fallback">3D Preview</span>
        )}
        {viewMode === 'unsupported' && (
          <span className="ui-badge unsupported">AR Unavailable</span>
        )}
      </div>

      {/* ── Product selector ───────────────────────────────────────── */}
      <div className="ui-product-bar">
        {catalogTyped.map((product) => (
          <button
            key={product.id}
            className={`ui-product-chip ${
              selectedProductId === product.id ? 'selected' : ''
            }`}
            onClick={() => setSelectedProductId(product.id)}
            title={product.name}
          >
            <span
              className="ui-product-chip-color"
              style={{ backgroundColor: product.colorHex }}
            />
            <span className="ui-product-chip-name">{product.name}</span>
          </button>
        ))}
      </div>

      {/* ── AR loading overlay ─────────────────────────────────────── */}
      {viewMode === 'loading' && (
        <div className="ui-overlay">
          <div className="ui-overlay-card">
            <div className="ui-spinner" />
            <p>Setting up AR experience&hellip;</p>
          </div>
        </div>
      )}

      {/* ── Unsupported overlay ────────────────────────────────────── */}
      {viewMode === 'unsupported' && (
        <div className="ui-overlay">
          <div className="ui-overlay-card">
            <div className="ui-icon">📱</div>
            <h2>AR Not Available</h2>
            <p>
              Your browser or device doesn&apos;t support WebXR AR. Try on an
              Android device with Chrome 100+ or iOS Safari 15+.
            </p>
          </div>
        </div>
      )}

      {/* ── Fallback start AR button ───────────────────────────────── */}
      {viewMode === 'fallback' && (
        <div className="ui-start-ar">
          <button className="ui-btn-primary" onClick={handleStartAR}>
            Start AR Experience
          </button>
          <p className="ui-hint">
            Tap the ground to place furniture in 3D preview mode
          </p>
        </div>
      )}

      {/* ── AR mode HUD ────────────────────────────────────────────── */}
      {viewMode === 'ar' && (
        <>
          {/* Surface indicator */}
          <div className="ui-ar-hud">
            <div
              className={`ui-surface-indicator ${
                isSurfaceDetected ? 'detected' : 'searching'
              }`}
            >
              {isSurfaceDetected
                ? '✨ Surface detected'
                : '🔍 Move phone to detect surfaces'}
            </div>
          </div>

          {/* Model count */}
          {placedModels.length > 0 && (
            <div className="ui-model-count">
              {placedModels.length} model
              {placedModels.length !== 1 ? 's' : ''} placed
              {selectedModelId ? ' — selected' : ''}
            </div>
          )}

          {/* Bottom controls */}
          <div className="ui-ar-controls">
            {selectedModelId && (
              <button
                className="ui-btn-secondary"
                onClick={() => selectModel(null)}
              >
                Deselect
              </button>
            )}
            {placedModels.length > 0 && (
              <button className="ui-btn-secondary" onClick={clearAll}>
                Clear All
              </button>
            )}
            <button className="ui-btn-secondary" onClick={endSession}>
              End AR
            </button>
          </div>
        </>
      )}

      {/* ── Error toast ────────────────────────────────────────────── */}
      {error && (
        <div className="ui-error-toast">
          <span>{error}</span>
          <button
            className="ui-error-dismiss"
            onClick={() => window.location.reload()}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Product browser panel ──────────────────────────────────── */}
      {showBrowser && <div className="ui-browser-backdrop" onClick={closeBrowser} />}
      <div className={`ui-browser-panel slide-up ${showBrowser ? 'open' : ''}`}>
        <ErrorBoundary>
          <ProductBrowser
            products={catalog as unknown as Product[]}
            selectedProductId={selectedProductId}
            onSelectProduct={handleSelectProduct}
          />
        </ErrorBoundary>
      </div>

      {/* ── Chat panel ─────────────────────────────────────────────── */}
      {showChat && (
        <ErrorBoundary>
          <ChatPanel
            messages={chatMessages}
            onSendMessage={sendMessage}
            isProcessing={isProcessing}
            isListening={isListening}
            isVoiceSupported={isVoiceSupported}
            onToggleVoice={isListening ? stopListening : startListening}
            selectedProductId={selectedProductId}
            onPlaceInAR={handlePlaceInAR}
          />
        </ErrorBoundary>
      )}
    </div>
    </ErrorBoundary>
  );
}

function AppWithProvider() {
  return (
    <SelectedProductProvider>
      <App />
    </SelectedProductProvider>
  );
}

export default AppWithProvider;
