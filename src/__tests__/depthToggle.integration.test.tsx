import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The ML pipeline downloads a real model — mock it at the module boundary.
const { mockPipeline } = vi.hoisted(() => ({ mockPipeline: vi.fn() }));

vi.mock('@huggingface/transformers', () => ({ pipeline: mockPipeline }));

// The app's data hooks talk to WebXR, the AI agent, and the microphone.
// Mock them so the toggle UI can be exercised in isolation.
vi.mock('../hooks/useARSession', () => ({
  useARSession: () => ({
    isSupported: null,
    sessionState: 'active',
    error: null,
    requestSession: vi.fn(),
    endSession: vi.fn(),
  }),
}));

vi.mock('../hooks/useHitTest', () => ({
  useHitTest: () => ({ isSurfaceDetected: false, handleTap: vi.fn() }),
}));

vi.mock('../hooks/useModelPlacement', () => ({
  useModelPlacement: () => ({
    placedModels: [],
    selectedModelId: null,
    placeProduct: vi.fn(),
    selectModel: vi.fn(),
    updateModelTransform: vi.fn(),
    clearAll: vi.fn(),
  }),
}));

vi.mock('../hooks/useAgent', () => ({
  useAgent: () => ({
    messages: [],
    sendMessage: vi.fn(),
    isProcessing: false,
    selectedProduct: null,
    clearConversation: vi.fn(),
    error: null,
  }),
}));

vi.mock('../hooks/useVoiceInput', () => ({
  useVoiceInput: () => ({
    isListening: false,
    transcript: '',
    isSupported: false,
    startListening: vi.fn(),
    stopListening: vi.fn(),
    error: null,
  }),
}));

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

let confirmSpy: MockInstance;
let alertSpy: MockInstance;

async function renderApp() {
  // The app initialises its depth sources when the AR scene starts; do the
  // same here so the toggle can switch modes without crashing.
  const depthManager = await import('../depth/depthManager');
  depthManager.initDepthSources();
  const { default: App } = await import('../App');
  return render(<App />);
}

describe('depth mode toggle', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    mockPipeline.mockReset();
    mockPipeline.mockResolvedValue({});
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ANDROID_UA);
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the depth toggle button in the top bar', async () => {
    await renderApp();

    expect(screen.getByTitle('Depth: WebXR API')).toBeInTheDocument();
  });

  it('switches the depth mode to ML when the toggle is clicked on a non-Apple device', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByTitle('Depth: WebXR API'));

    await waitFor(() =>
      expect(screen.getByTitle('Depth: ML Model')).toBeInTheDocument(),
    );
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('shows a confirm dialog before switching to ML mode on Apple devices', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE_UA);
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByTitle('Depth: WebXR API'));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.getByTitle('Depth: ML Model')).toBeInTheDocument(),
    );
  });

  it('does not switch depth mode when the user cancels the download dialog', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE_UA);
    confirmSpy.mockReturnValue(false);
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByTitle('Depth: WebXR API'));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTitle('Depth: WebXR API')).toBeInTheDocument();
    expect(screen.queryByTitle('Depth: ML Model')).not.toBeInTheDocument();
  });

  it('reflects the active depth mode in the toggle label', async () => {
    const user = userEvent.setup();
    await renderApp();

    expect(screen.getByText('API')).toBeInTheDocument();

    await user.click(screen.getByTitle('Depth: WebXR API'));
    await waitFor(() => expect(screen.getByText('ML')).toBeInTheDocument());

    await user.click(screen.getByTitle('Depth: ML Model'));
    await waitFor(() => expect(screen.getByText('API')).toBeInTheDocument());
  });

  it('keeps the current mode when the ML model fails to load', async () => {
    mockPipeline.mockRejectedValue(new Error('network down'));
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByTitle('Depth: WebXR API'));

    // Should stay on API mode — no alert, just a console.error
    await waitFor(() =>
      expect(screen.getByTitle(/Depth:/)).toHaveTextContent('API'),
    );
    expect(alertSpy).not.toHaveBeenCalled();
  });
});