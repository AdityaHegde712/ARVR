import * as THREE from 'three';
import { getRenderer } from '../xr/ARScene';
import type { DepthSource } from './DepthSource';

/**
 * Depth source backed by the WebXR Depth Sensing API.
 * Returns a GPU texture directly from the XR compositor — zero-copy.
 */
export function createWebXRDepthSource(): DepthSource {
  let activeSession: XRSession | null = null;

  function setSession(session: XRSession | null): void {
    activeSession = session;
  }

  function isAvailable(): boolean {
    return activeSession != null && 'depthUsage' in activeSession;
  }

  function getDepthTexture(
    _frame: XRFrame,
    view: XRView,
    _gl: WebGL2RenderingContext,
    binding: XRWebGLBinding | null,
  ): THREE.Texture | null {
    if (!binding || !isAvailable()) return null;

    const depthInfo = binding.getDepthInformation(view);
    if (!depthInfo) return null;

    const renderer = getRenderer();
    if (!renderer) return null;

    const texture = new THREE.Texture();
    texture.image = { width: depthInfo.width, height: depthInfo.height };
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.generateMipmaps = false;

    // Assign the XR WebGL texture handle directly to the Three.js texture.
    // Three.js exposes this via renderer.properties.get(texture).__webglTexture.
    const props = renderer.properties.get(texture);
    props.__webglTexture = depthInfo.texture;

    // Determine pixel format from the session's declared data format.
    if (activeSession?.depthDataFormat === 'float32') {
      texture.type = THREE.FloatType;
    }
    texture.format = THREE.RedFormat;

    texture.needsUpdate = true;
    return texture;
  }

  function dispose(): void {
    activeSession = null;
  }

  return { name: 'api' as const, isAvailable, getDepthTexture, dispose, setSession } as DepthSource & { setSession: typeof setSession };
}
