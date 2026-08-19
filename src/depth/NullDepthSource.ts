import type { DepthSource } from './DepthSource';

/**
 * No-op depth source used when neither API nor ML depth is active.
 */
export function createNullDepthSource(): DepthSource {
  return {
    name: 'api' as const,
    isAvailable: () => false,
    getDepthTexture: () => null,
    dispose: () => {},
  };
}
