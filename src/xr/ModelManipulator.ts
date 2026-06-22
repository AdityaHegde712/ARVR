import * as THREE from 'three';
import {
  getAllModelGroups,
  selectModel,
  getSelectedModelId,
} from './ModelPlacer';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TransformCallback = (
  modelId: string,
  position: THREE.Vector3,
  scale: number,
  rotation: number,
) => void;

export type SelectionCallback = (modelId: string | null) => void;

export interface ModelManipulatorOptions {
  /** Called when a model is selected or deselected via tap. */
  onSelect?: SelectionCallback;
  /** Called continuously while a model is being transformed. */
  onTransform?: TransformCallback;
}

// ─── Manipulation state ──────────────────────────────────────────────────────

type ManipType = 'none' | 'drag' | 'scale' | 'rotate';

interface PointerState {
  /** Client-space coordinates */
  clientX: number;
  clientY: number;
}

interface ManipState {
  type: ManipType;
  modelId: string | null;
  /** Initial model yaw when rotate started */
  initialRotation: number;
  /** Initial uniform scale when scale started */
  initialScale: number;
  /** Initial distance between two touch points */
  initialPinchDist: number;
  /** Initial angle of the pinch line */
  initialPinchAngle: number;
}

// ─── Module-level state ──────────────────────────────────────────────────────

let canvas: HTMLCanvasElement | null = null;
let scene: THREE.Scene | null = null;
let getCamera: (() => THREE.Camera | null) | null = null;
let options: ModelManipulatorOptions | null = null;
let enabled = false;

// Active touch tracking
let pointers: Map<number, PointerState> = new Map();
let manip: ManipState = {
  type: 'none',
  modelId: null,
  initialRotation: 0,
  initialScale: 1,
  initialPinchDist: 0,
  initialPinchAngle: 0,
};

// Bound event handlers (kept for removal)
let onPointerDown: ((e: PointerEvent) => void) | null = null;
let onPointerMove: ((e: PointerEvent) => void) | null = null;
let onPointerUp: ((e: PointerEvent) => void) | null = null;
let onTouchStart: ((e: TouchEvent) => void) | null = null;
let onTouchMove: ((e: TouchEvent) => void) | null = null;
let onTouchEnd: ((e: TouchEvent) => void) | null = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Given a client-space coordinate, raycast against placed model groups.
 * Returns the first hit model's group, or null.
 */
function raycastModels(
  clientX: number,
  clientY: number,
): THREE.Group | null {
  if (!scene || !getCamera) return null;
  const cam = getCamera();
  if (!cam) return null;

  const rect = canvas!.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((clientY - rect.top) / rect.height) * 2 + 1;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(x, y);
  raycaster.setFromCamera(pointer, cam);

  const modelGroups = getAllModelGroups();

  // Collect all Mesh children from all model groups
  const meshes: THREE.Object3D[] = [];
  for (const mg of modelGroups) {
    mg.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });
  }

  const intersects = raycaster.intersectObjects(meshes, false);
  if (intersects.length > 0) {
    // Walk up to find the parent group with type='placed-model'
    let obj: THREE.Object3D | null = intersects[0].object;
    while (obj) {
      if (obj.userData.type === 'placed-model') {
        return obj as THREE.Group;
      }
      obj = obj.parent;
    }
  }

  return null;
}

/**
 * Project a screen coordinate onto a horizontal plane at the given Y height.
 */
function projectToPlane(
  clientX: number,
  clientY: number,
  planeY: number,
): THREE.Vector3 | null {
  if (!getCamera) return null;
  const cam = getCamera();
  if (!cam) return null;

  const rect = canvas!.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((clientY - rect.top) / rect.height) * 2 + 1;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(x, y);
  raycaster.setFromCamera(pointer, cam);

  // Intersect with an infinite horizontal plane at planeY
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
  const intersection = new THREE.Vector3();
  const ray = raycaster.ray;
  const intersectPoint = ray.intersectPlane(plane, intersection);
  return intersectPoint ? intersectPoint.clone() : null;
}

/**
 * Handle tap/click to select a model.
 */
function handleTap(clientX: number, clientY: number): void {
  const hit = raycastModels(clientX, clientY);
  if (hit) {
    // Model ID is stored on the group's userData by tagModelGroup()
    const modelId = hit.userData.modelId as string | undefined;
    if (modelId) {
      selectModel(modelId);
      if (options?.onSelect) options.onSelect(modelId);
      return;
    }
  }
  // No hit — deselect
  selectModel(null);
  if (options?.onSelect) options.onSelect(null);
}

function startDrag(modelId: string): void {
  manip = { ...manip, type: 'drag', modelId };
}

function doDrag(clientX: number, clientY: number): void {
  if (!manip.modelId) return;
  const groups = getAllModelGroups();
  const group = groups.find((g) => g.userData.modelId === manip.modelId);
  const planeY = group ? group.position.y : 0;

  const projected = projectToPlane(clientX, clientY, planeY);
  if (!projected) return;

  // Keep the model's Y at the surface level
  projected.y = planeY;

  // Notify via callback
  if (options?.onTransform && manip.modelId) {
    const g = groups.find((grp) => grp.userData.modelId === manip.modelId);
    if (g) {
      const currentScale = g.scale.x;
      const currentRotation = g.rotation.y;
      options.onTransform(manip.modelId, projected, currentScale, currentRotation);
    }
  }
}

function startScaleRotate(): void {
  const pts = Array.from(pointers.values());
  if (pts.length < 2) return;

  const dx = pts[1].clientX - pts[0].clientX;
  const dy = pts[1].clientY - pts[0].clientY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  const selId = getSelectedModelId();
  const groups = getAllModelGroups();
  const group = groups.find((g) => g.userData.modelId === selId);

  manip = {
    type: 'scale',
    modelId: selId,
    initialRotation: group ? group.rotation.y : 0,
    initialScale: group ? group.scale.x : 1,
    initialPinchDist: dist,
    initialPinchAngle: angle,
  };
}

function doScaleRotate(): void {
  if (!manip.modelId) return;
  const pts = Array.from(pointers.values());
  if (pts.length < 2) return;

  const dx = pts[1].clientX - pts[0].clientX;
  const dy = pts[1].clientY - pts[0].clientY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  const scaleFactor = manip.initialPinchDist > 0
    ? dist / manip.initialPinchDist
    : 1;
  const rotationDelta = angle - manip.initialPinchAngle;

  const newScale = Math.max(0.1, Math.min(5, manip.initialScale * scaleFactor));
  const newRotation = manip.initialRotation + rotationDelta;

  const groups = getAllModelGroups();
  const group = groups.find((g) => g.userData.modelId === manip.modelId);
  if (group) {
    const pos = group.position.clone();
    if (options?.onTransform) {
      options.onTransform(manip.modelId, pos, newScale, newRotation);
    }
  }
}

// ─── Pointer events ──────────────────────────────────────────────────────────

function handlePointerDown(e: PointerEvent): void {
  if (!enabled) return;
  pointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
  (e.target as HTMLElement).setPointerCapture(e.pointerId);

  // Check for model selection on single pointer
  if (pointers.size === 1) {
    handleTap(e.clientX, e.clientY);
  }

  // If we have a selected model, start manipulation
  if (pointers.size === 1 && getSelectedModelId()) {
    startDrag(getSelectedModelId()!);
  } else if (pointers.size >= 2) {
    startScaleRotate();
  }
}

function handlePointerMove(e: PointerEvent): void {
  if (!enabled) return;
  pointers.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

  if (manip.type === 'drag') {
    doDrag(e.clientX, e.clientY);
  } else if (manip.type === 'scale' || manip.type === 'rotate') {
    doScaleRotate();
  }
}

function handlePointerUp(e: PointerEvent): void {
  if (!enabled) return;
  pointers.delete(e.pointerId);
  manip = { type: 'none', modelId: null, initialRotation: 0, initialScale: 1, initialPinchDist: 0, initialPinchAngle: 0 };
}

// ─── Touch events (for multi-touch where pointer events may not suffice) ──────

function handleTouchStart(e: TouchEvent): void {
  if (!enabled) return;
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    pointers.set(t.identifier, { clientX: t.clientX, clientY: t.clientY });
  }

  // Selection on single touch
  if (e.touches.length === 1 && e.changedTouches.length === 1) {
    const t = e.changedTouches[0];
    handleTap(t.clientX, t.clientY);
  }

  if (e.touches.length === 1 && getSelectedModelId()) {
    manip = { ...manip, type: 'drag', modelId: getSelectedModelId() };
  } else if (e.touches.length >= 2) {
    // Switch to scale/rotate
    if (manip.type === 'drag') {
      manip = { ...manip, type: 'none', modelId: null };
    }
    startScaleRotate();
  }
}

function handleTouchMove(e: TouchEvent): void {
  if (!enabled) return;
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    pointers.set(t.identifier, { clientX: t.clientX, clientY: t.clientY });
  }

  // Prevent default to avoid page scroll while manipulating
  if (manip.type !== 'none') {
    e.preventDefault();
  }

  if (manip.type === 'drag' && e.touches.length === 1) {
    const t = e.touches[0];
    doDrag(t.clientX, t.clientY);
  } else if (manip.type === 'scale' || manip.type === 'rotate') {
    doScaleRotate();
  }
}

function handleTouchEnd(e: TouchEvent): void {
  if (!enabled) return;
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    pointers.delete(t.identifier);
  }

  // If fewer than 2 touches remain, end scale/rotate
  if (e.touches.length < 2) {
    manip = { type: 'none', modelId: null, initialRotation: 0, initialScale: 1, initialPinchDist: 0, initialPinchAngle: 0 };
    if (e.touches.length === 1) {
      // Resume drag if still touching and a model is selected
      const sel = getSelectedModelId();
      if (sel) {
        manip = { ...manip, type: 'drag', modelId: sel };
      }
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Initialise the model manipulator on the given canvas.
 *
 * The manipulator intercepts pointer / touch events to provide:
 *   - Tap to select a model
 *   - Drag to reposition along the surface plane
 *   - Pinch to scale uniformly
 *   - Two-finger rotate for yaw
 *
 * @param canvas    The HTML canvas element to attach listeners to.
 * @param sceneRef  The Three.js scene reference.
 * @param camGetter A function that returns the active camera (may change).
 * @param opts      Optional callbacks.
 */
export function initModelManipulator(
  canvasEl: HTMLCanvasElement,
  sceneRef: THREE.Scene,
  camGetter: () => THREE.Camera | null,
  opts?: ModelManipulatorOptions,
): void {
  // Clean up previous
  disposeModelManipulator();

  canvas = canvasEl;
  scene = sceneRef;
  getCamera = camGetter;
  options = opts ?? null;
  enabled = true;
  pointers = new Map();
  manip = { type: 'none', modelId: null, initialRotation: 0, initialScale: 1, initialPinchDist: 0, initialPinchAngle: 0 };

  // Pointer events (primary)
  onPointerDown = (e: PointerEvent) => handlePointerDown(e);
  onPointerMove = (e: PointerEvent) => handlePointerMove(e);
  onPointerUp = (e: PointerEvent) => handlePointerUp(e);

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  // Touch events (for multi-touch on mobile)
  onTouchStart = (e: TouchEvent) => handleTouchStart(e);
  onTouchMove = (e: TouchEvent) => handleTouchMove(e);
  onTouchEnd = (e: TouchEvent) => handleTouchEnd(e);

  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);
  canvas.addEventListener('touchcancel', onTouchEnd);

  // Make sure canvas receives pointer events
  canvas.style.touchAction = 'none';
}

/**
 * Enable or disable the manipulator without removing listeners.
 */
export function setManipulatorEnabled(newEnabled: boolean): void {
  enabled = newEnabled;
}

/**
 * Clean up all event listeners and internal state.
 */
export function disposeModelManipulator(): void {
  enabled = false;

  if (canvas) {
    if (onPointerDown) canvas.removeEventListener('pointerdown', onPointerDown);
    if (onPointerMove) canvas.removeEventListener('pointermove', onPointerMove);
    if (onPointerUp) {
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
    }
    if (onTouchStart) canvas.removeEventListener('touchstart', onTouchStart);
    if (onTouchMove) canvas.removeEventListener('touchmove', onTouchMove);
    if (onTouchEnd) {
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
    }
    canvas.style.touchAction = '';
  }

  canvas = null;
  scene = null;
  getCamera = null;
  options = null;
  pointers = new Map();
  manip = { type: 'none', modelId: null, initialRotation: 0, initialScale: 1, initialPinchDist: 0, initialPinchAngle: 0 };
}

/**
 * Register a model group with its ID in userData so the manipulator
 * can identify it during raycasting.
 * Called after placing a model.
 */
export function tagModelGroup(group: THREE.Group, modelId: string): void {
  group.userData.modelId = modelId;
}
