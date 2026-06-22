import * as THREE from 'three';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HitTestResult {
  position: THREE.Vector3;
  orientation: THREE.Quaternion;
}

// ─── Module-level state ──────────────────────────────────────────────────────
let hitTestSource: XRHitTestSource | null = null;
let reticleParent: THREE.Group | null = null;

let latestPosition: THREE.Vector3 | null = null;
let latestOrientation: THREE.Quaternion | null = null;
let surfaceDetected = false;

// ─── Reticle creation ────────────────────────────────────────────────────────

const RETICLE_COLOR = 0x6c63ff;
const RETICLE_INNER_RADIUS = 0.05;
const RETICLE_OUTER_RADIUS = 0.12;

function createReticle(): THREE.Group {
  const group = new THREE.Group();

  // Outer ring
  const ringGeo = new THREE.RingGeometry(
    RETICLE_INNER_RADIUS,
    RETICLE_OUTER_RADIUS,
    32,
  );
  const ringMat = new THREE.MeshBasicMaterial({
    color: RETICLE_COLOR,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2; // lay flat on XZ plane
  group.add(ring);

  // Center dot
  const dotGeo = new THREE.CircleGeometry(0.02, 16);
  const dotMat = new THREE.MeshBasicMaterial({
    color: RETICLE_COLOR,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  const dot = new THREE.Mesh(dotGeo, dotMat);
  dot.rotation.x = -Math.PI / 2;
  group.add(dot);

  // Pulse ring (slightly larger, more transparent)
  const pulseGeo = new THREE.RingGeometry(
    RETICLE_OUTER_RADIUS + 0.02,
    RETICLE_OUTER_RADIUS + 0.06,
    32,
  );
  const pulseMat = new THREE.MeshBasicMaterial({
    color: RETICLE_COLOR,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });
  const pulse = new THREE.Mesh(pulseGeo, pulseMat);
  pulse.rotation.x = -Math.PI / 2;
  group.add(pulse);

  return group;
}

// ─── Initialization ──────────────────────────────────────────────────────────

/**
 * Create an XRHitTestSource for horizontal surfaces and build the reticle visual.
 * Must be called after the AR session is active.
 */
export async function initHitTest(
  session: XRSession,
  refSpace: XRReferenceSpace,
  scene: THREE.Scene,
): Promise<void> {
  // Clean up previous hit test source if any
  disposeHitTest();

  if (!session.requestHitTestSource) {
    throw new Error('Hit-test API not available on this XR session');
  }

  const source = await session.requestHitTestSource({
    space: refSpace,
  });
  if (!source) {
    throw new Error('Failed to create hit-test source');
  }
  hitTestSource = source;

  // Build and add the reticle (hidden until a surface is detected)
  const reticleGroup = createReticle();
  reticleGroup.visible = false;
  scene.add(reticleGroup);
  reticleParent = reticleGroup;

  latestPosition = null;
  latestOrientation = null;
  surfaceDetected = false;
}

// ─── Per-frame update ────────────────────────────────────────────────────────

/**
 * Poll hit-test results for the current XR frame and update the reticle.
 * Call this from the animation loop's frame callback.
 */
export function updateHitTest(
  frame: XRFrame,
  refSpace: XRReferenceSpace,
): void {
  if (!hitTestSource) return;

  const results = frame.getHitTestResults(hitTestSource);
  surfaceDetected = results.length > 0;

  if (results.length > 0) {
    const pose = results[0].getPose(refSpace);
    if (pose) {
      const t = pose.transform;
      latestPosition = new THREE.Vector3(
        t.position.x,
        t.position.y,
        t.position.z,
      );
      latestOrientation = new THREE.Quaternion(
        t.orientation.x,
        t.orientation.y,
        t.orientation.z,
        t.orientation.w,
      );
    }
  }

  updateReticle();
}

/**
 * Position the reticle at the latest hit-test result and toggle visibility.
 */
function updateReticle(): void {
  if (!reticleParent) return;

  if (surfaceDetected && latestPosition) {
    reticleParent.visible = true;
    reticleParent.position.copy(latestPosition);
    if (latestOrientation) {
      reticleParent.quaternion.copy(latestOrientation);
    }
  } else {
    reticleParent.visible = false;
  }
}

// ─── Getters ─────────────────────────────────────────────────────────────────

/**
 * Return the latest hit-test position, or null if no surface is detected.
 * Returns a clone so callers can mutate safely.
 */
export function getActiveHitPosition(): THREE.Vector3 | null {
  return latestPosition ? latestPosition.clone() : null;
}

/**
 * Return the latest hit-test orientation, or null if no surface is detected.
 */
export function getActiveHitOrientation(): THREE.Quaternion | null {
  return latestOrientation ? latestOrientation.clone() : null;
}

/**
 * Returns true when a horizontal surface is currently being detected.
 */
export function isHitSurfaceDetected(): boolean {
  return surfaceDetected;
}

/**
 * Returns the reticle parent group (for scene management).
 */
export function getReticle(): THREE.Group | null {
  return reticleParent;
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

/**
 * Clean up the hit-test source and remove the reticle from the scene.
 */
export function disposeHitTest(): void {
  if (hitTestSource) {
    hitTestSource.cancel();
    hitTestSource = null;
  }

  if (reticleParent) {
    // Dispose geometries and materials
    reticleParent.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });

    if (reticleParent.parent) {
      reticleParent.parent.remove(reticleParent);
    }
    reticleParent = null;
  }

  latestPosition = null;
  latestOrientation = null;
  surfaceDetected = false;
}
