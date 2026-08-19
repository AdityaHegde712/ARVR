import * as THREE from 'three';

export type DepthMode = 'api' | 'ml';

/**
 * Abstraction for a source of per-pixel depth data.
 * Implementations may return synchronously (API, Null) or asynchronously (ML).
 */
export interface DepthSource {
  readonly name: DepthMode;
  isAvailable(): boolean;
  getDepthTexture(
    frame: XRFrame,
    view: XRView,
    gl: WebGL2RenderingContext,
    binding: XRWebGLBinding | null,
  ): THREE.Texture | Promise<THREE.Texture | null> | null;
  dispose(): void;
}
