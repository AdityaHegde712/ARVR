import type { DepthMode, DepthSource } from './DepthSource';
import { createWebXRDepthSource } from './WebXRDepthSource';
import { createMLDepthSource } from './MLDepthSource';
import { createNullDepthSource } from './NullDepthSource';

let activeMode: DepthMode = 'api';
let apiSource: ReturnType<typeof createWebXRDepthSource>;
let mlSource: ReturnType<typeof createMLDepthSource>;
let nullSource: DepthSource;

const APPLE_DEVICE_RE = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function initDepthSources(): void {
  apiSource = createWebXRDepthSource();
  mlSource = createMLDepthSource();
  nullSource = createNullDepthSource();
}

export function setSession(session: XRSession | null): void {
  (apiSource as unknown as { setSession: (s: XRSession | null) => void }).setSession(session);
}

export async function setMode(mode: DepthMode): Promise<void> {
  if (mode === 'ml' && !mlSource.isAvailable()) {
    await (mlSource as unknown as { loadModel: () => Promise<void> }).loadModel();
  }
  activeMode = mode;
}

export function getActiveSource(): DepthSource {
  if (activeMode === 'ml' && mlSource.isAvailable()) return mlSource;
  if (activeMode === 'api' && apiSource.isAvailable()) return apiSource;
  return nullSource;
}

export function getMode(): DepthMode {
  return activeMode;
}

export function isAppleDevice(): boolean {
  return APPLE_DEVICE_RE;
}

export function disposeAll(): void {
  apiSource?.dispose();
  mlSource?.dispose();
  nullSource?.dispose();
}
