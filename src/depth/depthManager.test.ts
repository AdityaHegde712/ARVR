import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The ML pipeline is a browser/WebGPU dependency — mock it at the module boundary.
const { mockPipeline } = vi.hoisted(() => ({ mockPipeline: vi.fn() }));

vi.mock('@huggingface/transformers', () => ({ pipeline: mockPipeline }));

type DepthManagerModule = typeof import('./depthManager');

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPAD_UA =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function loadManager(): Promise<DepthManagerModule> {
  return (await import('./depthManager')) as DepthManagerModule;
}

async function loadManagerWithUserAgent(ua: string): Promise<DepthManagerModule> {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);
  return loadManager();
}

describe('depth mode switching', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    mockPipeline.mockReset();
    mockPipeline.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts in API mode by default', async () => {
    const manager = await loadManager();
    manager.initDepthSources();

    expect(manager.getMode()).toBe('api');
  });

  it('switches the depth mode to ML when ML mode is selected', async () => {
    const manager = await loadManager();
    manager.initDepthSources();

    await manager.setMode('ml');

    expect(manager.getMode()).toBe('ml');
  });

  it('switches the depth mode back to API when API mode is selected', async () => {
    const manager = await loadManager();
    manager.initDepthSources();

    await manager.setMode('ml');
    await manager.setMode('api');

    expect(manager.getMode()).toBe('api');
  });

  it('does not change the depth mode when the ML model fails to load', async () => {
    mockPipeline.mockRejectedValue(new Error('network down'));
    const manager = await loadManager();
    manager.initDepthSources();

    await expect(manager.setMode('ml')).rejects.toThrow('network down');

    expect(manager.getMode()).toBe('api');
  });
});

describe('Apple device detection', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (navigator as unknown as Record<string, unknown>).maxTouchPoints;
  });

  it('detects an iPhone as an Apple device', async () => {
    const manager = await loadManagerWithUserAgent(IPHONE_UA);

    expect(manager.isAppleDevice()).toBe(true);
  });

  it('detects an iPad as an Apple device', async () => {
    const manager = await loadManagerWithUserAgent(IPAD_UA);

    expect(manager.isAppleDevice()).toBe(true);
  });

  it('detects an iPad in desktop mode (MacIntel with touch) as an Apple device', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(DESKTOP_UA);
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 5,
      configurable: true,
    });

    const manager = await loadManager();

    expect(manager.isAppleDevice()).toBe(true);
  });

  it('does not flag an Android phone as an Apple device', async () => {
    const manager = await loadManagerWithUserAgent(ANDROID_UA);

    expect(manager.isAppleDevice()).toBe(false);
  });

  it('does not flag a Windows desktop as an Apple device', async () => {
    const manager = await loadManagerWithUserAgent(DESKTOP_UA);

    expect(manager.isAppleDevice()).toBe(false);
  });
});

describe('active depth source selection', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    mockPipeline.mockReset();
    mockPipeline.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the WebXR API source when API mode is active and the session provides depth', async () => {
    const manager = await loadManager();
    manager.initDepthSources();
    manager.setSession({ depthUsage: 'cpu-optimized' } as unknown as XRSession);

    const source = manager.getActiveSource();

    expect(source.name).toBe('api');
    expect(source.isAvailable()).toBe(true);
  });

  it('uses the ML source when ML mode is active and the model is loaded', async () => {
    const manager = await loadManager();
    manager.initDepthSources();

    await manager.setMode('ml');

    const source = manager.getActiveSource();

    expect(source.name).toBe('ml');
    expect(source.isAvailable()).toBe(true);
  });

  it('switches the active source when the depth mode changes', async () => {
    const manager = await loadManager();
    manager.initDepthSources();
    manager.setSession({ depthUsage: 'cpu-optimized' } as unknown as XRSession);

    expect(manager.getActiveSource().name).toBe('api');

    await manager.setMode('ml');

    expect(manager.getActiveSource().name).toBe('ml');
  });

  it('falls back to the null source when neither API nor ML depth is available', async () => {
    const manager = await loadManager();
    manager.initDepthSources();

    const source = manager.getActiveSource();

    expect(source.isAvailable()).toBe(false);
  });

  it('falls back to the null source when ML is selected but the model never loaded', async () => {
    mockPipeline.mockRejectedValue(new Error('load failed'));
    const manager = await loadManager();
    manager.initDepthSources();

    await expect(manager.setMode('ml')).rejects.toThrow('load failed');

    expect(manager.getActiveSource().isAvailable()).toBe(false);
  });
});