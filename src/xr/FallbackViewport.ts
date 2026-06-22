import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FallbackTapEvent {
  point: THREE.Vector3;
  normal: THREE.Vector3;
}

type TapCallback = (event: FallbackTapEvent) => void;

// ─── Module-level state ──────────────────────────────────────────────────────
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let controls: OrbitControls | null = null;
let animationId: number | null = null;
let tapListeners: TapCallback[] = [];
let disposed = false;

// ─── Initialization ──────────────────────────────────────────────────────────

/**
 * Create the fallback 3D viewport on the given canvas.
 * Provides a floor grid + orbit controls + click-to-place via raycaster.
 */
export function initFallback(
  canvas: HTMLCanvasElement,
): { scene: THREE.Scene; camera: THREE.PerspectiveCamera } {
  dispose();

  disposed = false;

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    50,
  );
  camera.position.set(2, 1.5, 3);
  camera.lookAt(0, 0, 0);

  // ── Controls ────────────────────────────────────────────────────────────
  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);
  controls.maxPolarAngle = Math.PI / 2.1; // prevent going under floor
  controls.minDistance = 0.5;
  controls.maxDistance = 10;

  // ── Lighting ────────────────────────────────────────────────────────────
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
  hemiLight.position.set(0, 1, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
  dirLight.position.set(3, 5, 2);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0xffeedd, 0.3);
  fillLight.position.set(-2, 1, -2);
  scene.add(fillLight);

  const ambientLight = new THREE.AmbientLight(0x404060);
  scene.add(ambientLight);

  // ── Grid floor ──────────────────────────────────────────────────────────
  const gridHelper = new THREE.GridHelper(8, 20, 0x6c63ff, 0x444466);
  scene.add(gridHelper);

  // Semi-transparent ground plane for raycasting
  const planeGeo = new THREE.PlaneGeometry(8, 8);
  const planeMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a4a,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const groundPlane = new THREE.Mesh(planeGeo, planeMat);
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.position.y = 0;
  groundPlane.name = 'ground';
  scene.add(groundPlane);

  // ── Canvas click handler ────────────────────────────────────────────────
  canvas.addEventListener('click', onCanvasClick);
  canvas.addEventListener('touchstart', onTouchStart, { passive: true });

  // ── Resize ──────────────────────────────────────────────────────────────
  window.addEventListener('resize', onResize);

  // ── Start render loop ───────────────────────────────────────────────────
  startLoop();

  return { scene, camera };
}

// ─── Render loop ─────────────────────────────────────────────────────────────

function startLoop(): void {
  if (animationId !== null) return;

  const loop = () => {
    if (disposed) return;
    animationId = requestAnimationFrame(loop);

    if (controls) {
      controls.update();
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  };

  animationId = requestAnimationFrame(loop);
}

function stopLoop(): void {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

// ─── Resize ──────────────────────────────────────────────────────────────────

function onResize(): void {
  if (!renderer || !camera) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

// ─── Click / tap handling ────────────────────────────────────────────────────

function onCanvasClick(event: MouseEvent): void {
  if (!renderer || !camera || !scene) return;
  processTap(event.clientX, event.clientY);
}

function onTouchStart(event: TouchEvent): void {
  if (!renderer || !camera || !scene) return;
  if (event.touches.length === 1) {
    const touch = event.touches[0];
    processTap(touch.clientX, touch.clientY);
  }
}

function processTap(clientX: number, clientY: number): void {
  if (!renderer || !camera || !scene) return;

  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((clientY - rect.top) / rect.height) * 2 + 1;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(x, y);
  raycaster.setFromCamera(pointer, camera);

  // Intersect against the ground plane
  const groundMesh = scene.getObjectByName('ground');
  if (!groundMesh) return;

  const intersects = raycaster.intersectObject(groundMesh);
  if (intersects.length > 0) {
    const hit = intersects[0];
    const event: FallbackTapEvent = {
      point: hit.point.clone(),
      normal: hit.face
        ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
        : new THREE.Vector3(0, 1, 0),
    };
    // Fire all tap listeners
    tapListeners.forEach((fn) => fn(event));
  }
}

// ─── Event subscription ──────────────────────────────────────────────────────

/**
 * Register a callback for surface tap events in fallback mode.
 * Returns an unsubscribe function.
 */
export function onFallbackTap(fn: TapCallback): () => void {
  tapListeners.push(fn);
  return () => {
    tapListeners = tapListeners.filter((f) => f !== fn);
  };
}

// ─── Getters ─────────────────────────────────────────────────────────────────

export function getFallbackScene(): THREE.Scene | null {
  return scene;
}

export function getFallbackCamera(): THREE.PerspectiveCamera | null {
  return camera;
}

export function getFallbackRenderer(): THREE.WebGLRenderer | null {
  return renderer;
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

/**
 * Dispose the fallback viewport, freeing all GPU resources.
 */
export function dispose(): void {
  disposed = true;
  stopLoop();

  if (controls) {
    controls.dispose();
    controls = null;
  }

  if (renderer) {
    const canvas = renderer.domElement;
    canvas.removeEventListener('click', onCanvasClick);
    canvas.removeEventListener('touchstart', onTouchStart);

    renderer.dispose();
    renderer = null;
  }

  window.removeEventListener('resize', onResize);

  scene = null;
  camera = null;
  tapListeners = [];
}
