import * as THREE from 'three';
import {
  initDepthSources,
  setSession as setDepthSession,
  getActiveSource,
} from '../depth/depthManager';
import { applyOcclusion, clearOcclusion } from '../shaders/occlusionMaterial';

// ─── Types ───────────────────────────────────────────────────────────────────
export type SessionState =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'ended'
  | 'unsupported';

// ─── Module-level state ──────────────────────────────────────────────────────
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let xrSession: XRSession | null = null;
let referenceSpace: XRReferenceSpace | null = null;
let sessionState: SessionState = 'idle';
let stateChangeListeners: Array<(state: SessionState) => void> = [];
let animationActive = false;
let depthTexture: THREE.Texture | null = null;
let xrWebGLBinding: XRWebGLBinding | null = null;
let depthFrameCounter = 0;

// ─── Initialization ──────────────────────────────────────────────────────────

/**
 * Initialise the Three.js renderer, scene, camera, and lighting.
 * Must be called once with a <canvas> element before requesting an AR session.
 */
export function initScene(canvas: HTMLCanvasElement): void {
  if (renderer) {
    // Already initialised — ignore repeated calls
    return;
  }

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.xr.enabled = true;
  renderer.setClearColor(0x000000, 0);

  initDepthSources();

  scene = new THREE.Scene();

  // Camera: standard perspective for mobile AR
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20,
  );

  // ── Lighting ─────────────────────────────────────────────────────────────
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
  hemiLight.position.set(0, 1, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(1, 2, 1);
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0xffeedd, 0.3);
  fillLight.position.set(-1, 1, -1);
  scene.add(fillLight);

  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  // ── Resize ───────────────────────────────────────────────────────────────
  window.addEventListener('resize', handleResize);
}

function handleResize(): void {
  if (!renderer || !camera) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

// ─── AR Session lifecycle ────────────────────────────────────────────────────

/**
 * Request an immersive-ar session, create a local-floor reference space,
 * and bind it to the renderer.
 */
export async function requestARSession(): Promise<XRSession> {
  if (!navigator.xr) {
    setState('unsupported');
    throw new Error('WebXR is not available in this browser');
  }

  const supported = await navigator.xr.isSessionSupported('immersive-ar');
  if (!supported) {
    setState('unsupported');
    throw new Error(
      'immersive-ar session type is not supported on this device',
    );
  }

  setState('requesting');

  try {
    // Find the DOM overlay root so UI elements stay interactive during AR
    const overlayRoot = document.getElementById('xr-overlay');

    xrSession = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay', 'depth-sensing'],
      depthSensing: {
        usagePreference: ['cpu-optimized', 'gpu-optimized'],
        dataFormatPreference: ['luminance-alpha', 'float32'],
      },
      domOverlay: { root: overlayRoot! },
    });

    // Prevent XR from stealing touches on interactive UI elements
    overlayRoot?.addEventListener('beforexrselect', (e) => {
      e.preventDefault();
    });

    xrSession.addEventListener('end', onSessionEnd);
    xrSession.addEventListener('visibilitychange', onVisibilityChange);

    // Create the WebGL binding used to read API depth textures
    if (renderer) {
      try {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        xrWebGLBinding = new XRWebGLBinding(xrSession, gl);
      } catch (err) {
        console.warn('[ARScene] XRWebGLBinding unavailable:', err);
      }
    }
    setDepthSession(xrSession);

    // Try local-floor first (world-stable), fall back to viewer if unsupported.
    let refSpaceType: XRReferenceSpaceType = 'local-floor';
    try {
      referenceSpace = await xrSession.requestReferenceSpace('local-floor');
    } catch {
      console.warn('[ARScene] local-floor not supported, falling back to viewer');
      referenceSpace = await xrSession.requestReferenceSpace('viewer');
      refSpaceType = 'viewer';
    }

    if (renderer) {
      renderer.xr.setReferenceSpaceType(refSpaceType);
      await renderer.xr.setSession(xrSession);
    }

    setState('active');
    return xrSession;
  } catch (error) {
    setState('ended');
    throw error;
  }
}

/**
 * Gracefully end the current AR session.
 */
export function endARSession(): void {
  if (xrSession) {
    xrSession.end().catch(console.warn);
  }
  cleanupSession();
}

function onSessionEnd(): void {
  cleanupSession();
  setState('ended');
}

function onVisibilityChange(): void {
  if (xrSession && xrSession.visibilityState === 'hidden') {
    console.log('[ARScene] Session visibility changed to hidden');
  }
}

function cleanupSession(): void {
  xrSession = null;
  referenceSpace = null;
  xrWebGLBinding = null;
  depthTexture = null;
  depthFrameCounter = 0;
  setDepthSession(null);
}

// ─── State management ────────────────────────────────────────────────────────

function setState(newState: SessionState): void {
  if (sessionState === newState) return;
  sessionState = newState;
  stateChangeListeners.forEach((fn) => fn(newState));
}

/**
 * Subscribe to session state changes.  Returns an unsubscribe function.
 */
export function addStateChangeListener(
  fn: (state: SessionState) => void,
): () => void {
  stateChangeListeners.push(fn);
  return () => {
    stateChangeListeners = stateChangeListeners.filter((f) => f !== fn);
  };
}

// ─── Getters ─────────────────────────────────────────────────────────────────

export function getRenderer(): THREE.WebGLRenderer | null {
  return renderer;
}

export function getScene(): THREE.Scene | null {
  return scene;
}

export function getCamera(): THREE.PerspectiveCamera | null {
  return camera;
}

export function getXRSession(): XRSession | null {
  return xrSession;
}

export function getReferenceSpace(): XRReferenceSpace | null {
  return referenceSpace;
}

export function getSessionState(): SessionState {
  return sessionState;
}

/**
 * Return all placed furniture meshes in the scene that use a physical
 * material. Used by the occlusion shader to update materials each frame.
 */
export function getModelMeshes(): THREE.Mesh[] {
  if (!scene) return [];
  const meshes: THREE.Mesh[] = [];
  scene.traverse((child) => {
    if (
      child instanceof THREE.Mesh &&
      child.material instanceof THREE.MeshPhysicalMaterial
    ) {
      meshes.push(child);
    }
  });
  return meshes;
}

// ─── Animation loop ──────────────────────────────────────────────────────────

/**
 * Start the render loop.  An optional frame callback is called each XR frame
 * with the XRFrame object (for hit-test polling, etc.).
 */
export function startAnimationLoop(
  frameCallback?: (frame: XRFrame, time: number) => void,
): void {
  if (!renderer) return;

  animationActive = true;

  renderer.setAnimationLoop((time: number, frame?: XRFrame) => {
    if (!animationActive) return;

    if (frame && frameCallback) {
      frameCallback(frame, time);
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
      updateDepthOcclusion(frame);
    }
  });
}

/**
 * Refresh the depth texture from the active source and apply occlusion to
 * every placed furniture mesh. ML inference is throttled to every 10th frame.
 */
function updateDepthOcclusion(frame?: XRFrame): void {
  if (!scene || !camera) return;

  const source = getActiveSource();

  if (!source.isAvailable()) {
    depthTexture = null;
  } else if (frame && xrSession && referenceSpace) {
    const pose = frame.getViewerPose(referenceSpace);
    const view = pose?.views[0];

    depthFrameCounter++;
    const shouldRefreshDepth =
      source.name === 'api' || depthFrameCounter % 10 === 0;

    if (view && shouldRefreshDepth && renderer) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const result = source.getDepthTexture(
        frame,
        view,
        gl,
        xrWebGLBinding,
      );
      // ML source returns a Promise; fire-and-forget with guard.
      if (result instanceof Promise) {
        result.then((tex) => { depthTexture = tex; }).catch(() => {});
      } else {
        depthTexture = result;
      }
    }
  }

  const meshes = getModelMeshes();
  for (const mesh of meshes) {
    const material = mesh.material as THREE.MeshPhysicalMaterial;
    if (depthTexture) {
      applyOcclusion(
        material,
        depthTexture,
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      );
    } else {
      clearOcclusion(material);
    }
  }
}

/**
 * Stop the render loop.
 */
export function stopAnimationLoop(): void {
  animationActive = false;
  if (renderer) {
    renderer.setAnimationLoop(null);
  }
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

/**
 * Fully dispose of the renderer, scene, and session.
 */
export function dispose(): void {
  stopAnimationLoop();
  endARSession();
  stateChangeListeners = [];
  setDepthSession(null);

  if (renderer) {
    renderer.dispose();
    renderer = null;
  }

  scene = null;
  camera = null;
}
