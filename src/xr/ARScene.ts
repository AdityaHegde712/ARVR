import * as THREE from 'three';

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
    xrSession = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
    });

    xrSession.addEventListener('end', onSessionEnd);
    xrSession.addEventListener('visibilitychange', onVisibilityChange);

    referenceSpace = await xrSession.requestReferenceSpace('local-floor');

    if (renderer) {
      renderer.xr.setReferenceSpaceType('local-floor');
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
    }
  });
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

  if (renderer) {
    renderer.dispose();
    renderer = null;
  }

  scene = null;
  camera = null;
}
