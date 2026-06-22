import * as THREE from 'three';
import {
  createPlaceholderModel,
  clearModelCache,
  type ProductCatalogEntry,
} from './ModelLoader';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlacedModelData {
  id: string;
  productId: string;
  position: THREE.Vector3;
  rotation: number; // yaw in radians
  scale: number;
  color: number;
}

export interface PlacedModelEntry {
  group: THREE.Group;
  data: PlacedModelData;
  outlines: THREE.LineSegments[];
}

// ─── Module-level state ──────────────────────────────────────────────────────
let sceneRef: THREE.Scene | null = null;
let models: Map<string, PlacedModelEntry> = new Map();
let nextId = 0;
let selectedModelId: string | null = null;
let selectionChangeListeners: Array<(id: string | null) => void> = [];

// ─── Scene linking ───────────────────────────────────────────────────────────

/**
 * Link the ModelPlacer to a Three.js scene so placed models are added
 * automatically.
 */
export function setScene(scene: THREE.Scene): void {
  sceneRef = scene;
}

// ─── Selection helpers ───────────────────────────────────────────────────────

const OUTLINE_COLOR = 0x4fc3f7; // light blue

/**
 * Build edge-line outlines for every Mesh child in a group.
 */
function buildOutlines(group: THREE.Group): THREE.LineSegments[] {
  const result: THREE.LineSegments[] = [];
  group.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const edges = new THREE.EdgesGeometry(child.geometry);
      const lineMat = new THREE.LineBasicMaterial({
        color: OUTLINE_COLOR,
        transparent: true,
        opacity: 0.9,
        depthTest: true,
      });
      const lines = new THREE.LineSegments(edges, lineMat);
      // Match the child's world transform as a local offset
      lines.position.copy(child.position);
      lines.quaternion.copy(child.quaternion);
      lines.scale.copy(child.scale);
      group.add(lines);
      result.push(lines);
    }
  });
  return result;
}

function removeOutlines(entry: PlacedModelEntry): void {
  for (const line of entry.outlines) {
    line.geometry.dispose();
    if (Array.isArray(line.material)) {
      line.material.forEach((m) => m.dispose());
    } else {
      line.material.dispose();
    }
    line.parent?.remove(line);
  }
  entry.outlines = [];
}

function setSelectedModelVisual(id: string | null): void {
  // Clear previous selection if different
  if (selectedModelId !== null && selectedModelId !== id) {
    const prev = models.get(selectedModelId);
    if (prev) {
      removeOutlines(prev);
    }
  }

  // Set new selection
  if (id !== null) {
    const entry = models.get(id);
    if (entry) {
      // Remove existing outlines first (in case of re-selection)
      removeOutlines(entry);
      entry.outlines = buildOutlines(entry.group);
    }
  }

  selectedModelId = id;
  selectionChangeListeners.forEach((fn) => fn(id));
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

/**
 * Place a product model at the given world position.
 *
 * @param product    Product catalog entry (from catalog.json)
 * @param position   World position (typically from hit-test)
 * @param orientation Optional quaternion to orient the model
 * @returns The PlacedModelData describing the newly placed model
 */
export function placeProductAt(
  product: ProductCatalogEntry,
  position: THREE.Vector3,
  orientation?: THREE.Quaternion | null,
): PlacedModelData {
  const group = createPlaceholderModel(product, true);

  // Bottom-snap: group's local bottom is at y=0, so position directly at surface
  group.position.copy(position);

  // Apply scaleHint from catalog
  const s = product.scaleHint;
  const uniformScale = (s.x + s.y + s.z) / 3;
  group.scale.set(uniformScale, uniformScale, uniformScale);

  // Apply orientation
  if (orientation) {
    group.quaternion.copy(orientation);
  }

  // Apply default yaw from placement hints
  if (product.placementHints?.defaultOrientation) {
    group.rotation.y += product.placementHints.defaultOrientation;
  }

  group.castShadow = true;
  group.receiveShadow = true;

  if (sceneRef) {
    sceneRef.add(group);
  }

  const color = new THREE.Color(product.colorHex);
  const id = `model_${nextId++}`;

  const data: PlacedModelData = {
    id,
    productId: product.id,
    position: group.position.clone(),
    rotation: group.rotation.y,
    scale: uniformScale,
    color: color.getHex(),
  };

  models.set(id, { group, data, outlines: [] });

  return data;
}

/**
 * Legacy: Place a simple box model at the given position.
 * Kept for backward compatibility. Prefer `placeProductAt`.
 */
export function placeModelAt(
  position: THREE.Vector3,
  orientation?: THREE.Quaternion | null,
  color: number = 0x9b59b6,
): PlacedModelData {
  const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.4,
    metalness: 0.1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.position.y += 0.1; // half height

  if (orientation) {
    mesh.quaternion.copy(orientation);
  }

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const group = new THREE.Group();
  group.add(mesh);
  group.position.copy(position);
  if (orientation) {
    group.quaternion.copy(orientation);
  }
  group.userData = { productId: 'legacy', type: 'placed-model' };

  if (sceneRef) {
    sceneRef.add(group);
  }

  const id = `model_${nextId++}`;
  const data: PlacedModelData = {
    id,
    productId: 'legacy',
    position: group.position.clone(),
    rotation: group.rotation.y,
    scale: 1,
    color,
  };

  models.set(id, { group, data, outlines: [] });

  return data;
}

/**
 * Remove a previously placed model by ID.  Disposes GPU resources.
 */
export function removeModel(id: string): boolean {
  const entry = models.get(id);
  if (!entry) return false;

  removeOutlines(entry);

  if (sceneRef) {
    sceneRef.remove(entry.group);
  }

  // Dispose all mesh geometries and materials within the group
  entry.group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  });

  models.delete(id);

  // Clear selection if this was the selected model
  if (selectedModelId === id) {
    selectedModelId = null;
    selectionChangeListeners.forEach((fn) => fn(null));
  }

  return true;
}

/**
 * Remove all placed models and release GPU resources.
 */
export function clearAllModels(): void {
  models.forEach((entry) => {
    removeOutlines(entry);
    if (sceneRef) {
      sceneRef.remove(entry.group);
    }
    entry.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  });
  models.clear();

  if (selectedModelId !== null) {
    selectedModelId = null;
    selectionChangeListeners.forEach((fn) => fn(null));
  }
}

/**
 * Update the transform of an existing model.
 *
 * @param id       Model ID
 * @param position New world position (bottom of model will snap to this Y)
 * @param scale    Uniform scale factor
 * @param rotation Yaw angle in radians
 */
export function updateModelTransform(
  id: string,
  position: THREE.Vector3,
  scale: number,
  rotation: number,
): boolean {
  const entry = models.get(id);
  if (!entry) return false;

  const { group, data } = entry;

  group.position.copy(position);
  const currentQuat = group.quaternion.clone();
  // Preserve pitch/roll but update yaw
  const euler = new THREE.Euler().setFromQuaternion(currentQuat);
  euler.y = rotation;
  group.quaternion.setFromEuler(euler);

  group.scale.set(scale, scale, scale);

  // Update stored data
  data.position.copy(position);
  data.rotation = rotation;
  data.scale = scale;

  // Rebuild outlines if selected (geometry may have scaled)
  if (selectedModelId === id && entry.outlines.length > 0) {
    removeOutlines(entry);
    entry.outlines = buildOutlines(entry.group);
  }

  return true;
}

// ─── Selection ───────────────────────────────────────────────────────────────

/**
 * Select a placed model by ID, showing an outline highlight.
 * Pass `null` to deselect.
 */
export function selectModel(id: string | null): void {
  if (id === selectedModelId) return;
  setSelectedModelVisual(id);
}

/**
 * Deselect the currently selected model, if any.
 */
export function deselectModel(): void {
  if (selectedModelId !== null) {
    setSelectedModelVisual(null);
  }
}

/**
 * Return the ID of the currently selected model, or null.
 */
export function getSelectedModelId(): string | null {
  return selectedModelId;
}

/**
 * Subscribe to selection changes. Returns an unsubscribe function.
 */
export function addSelectionChangeListener(
  fn: (id: string | null) => void,
): () => void {
  selectionChangeListeners.push(fn);
  return () => {
    selectionChangeListeners = selectionChangeListeners.filter(
      (f) => f !== fn,
    );
  };
}

// ─── Getters ─────────────────────────────────────────────────────────────────

/**
 * Return a flat array of data describing all placed models (safe for React).
 */
export function getAllModelsData(): PlacedModelData[] {
  const result: PlacedModelData[] = [];
  models.forEach((entry) => {
    result.push({ ...entry.data });
  });
  return result;
}

/**
 * Return the THREE.Group for a given model ID (used by ModelManipulator).
 */
export function getModelGroup(id: string): THREE.Group | undefined {
  return models.get(id)?.group;
}

/**
 * Return the number of currently placed models.
 */
export function getModelCount(): number {
  return models.size;
}

/**
 * Get all model group references (for raycasting in ModelManipulator).
 */
export function getAllModelGroups(): THREE.Group[] {
  const result: THREE.Group[] = [];
  models.forEach((entry) => result.push(entry.group));
  return result;
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

/**
 * Destroy all internal state (used for full cleanup).
 */
export function dispose(): void {
  clearAllModels();
  clearModelCache();
  sceneRef = null;
  nextId = 0;
  selectedModelId = null;
  selectionChangeListeners = [];
}
