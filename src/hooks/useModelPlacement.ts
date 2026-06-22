import { useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  placeProductAt,
  removeModel,
  clearAllModels,
  getAllModelsData,
  getModelGroup,
  updateModelTransform as updateTransform,
  selectModel as selectPlacedModel,
  getSelectedModelId,
} from '../xr/ModelPlacer';
import type { PlacedModelData } from '../xr/ModelPlacer';
import type { ProductCatalogEntry } from '../xr/ModelLoader';
import { tagModelGroup } from '../xr/ModelManipulator';

export interface UseModelPlacementReturn {
  /** Array of all currently placed models */
  placedModels: PlacedModelData[];
  /** The ID of the currently selected model, or null */
  selectedModelId: string | null;
  /**
   * Place a product model at the given position.
   * The model is created from the product catalog entry and placed
   * at the surface intersection point.
   * @returns The ID of the newly placed model, or null if placement failed.
   */
  placeProduct: (
    product: ProductCatalogEntry,
    position: THREE.Vector3,
    orientation?: THREE.Quaternion | null,
  ) => string | null;
  /** Select a placed model by ID (shows outline). Pass null to deselect. */
  selectModel: (id: string | null) => void;
  /**
   * Update the transform of a placed model.
   * Used by the ModelManipulator during drag/scale/rotate.
   */
  updateModelTransform: (
    id: string,
    position: THREE.Vector3,
    scale: number,
    rotation: number,
  ) => boolean;
  /** Remove a single model by ID and release GPU resources. */
  removeModel: (id: string) => boolean;
  /** Remove all placed models and reset selection. */
  clearAll: () => void;
}

/**
 * React hook that wraps the ModelPlacer module for product-based placement.
 *
 * Keeps a reactive `placedModels` array in sync with the 3D scene state.
 * Models are placed using catalog product entries and support
 * selection + touch manipulation.
 */
export function useModelPlacement(): UseModelPlacementReturn {
  const [placedModels, setPlacedModels] = useState<PlacedModelData[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(
    getSelectedModelId(),
  );

  const syncState = useCallback(() => {
    setPlacedModels(getAllModelsData());
    setSelectedModelId(getSelectedModelId());
  }, []);

  const placeProduct = useCallback(
    (
      product: ProductCatalogEntry,
      position: THREE.Vector3,
      orientation?: THREE.Quaternion | null,
    ): string | null => {
      const data = placeProductAt(product, position, orientation ?? null);
      // Tag the model group so the manipulator can identify it via raycasting
      const group = getModelGroup(data.id);
      if (group) {
        tagModelGroup(group, data.id);
      }
      syncState();
      return data.id;
    },
    [syncState],
  );

  const selectModel = useCallback((id: string | null) => {
    selectPlacedModel(id);
    setSelectedModelId(getSelectedModelId());
  }, []);

  const updateModelTransformFn = useCallback(
    (
      id: string,
      position: THREE.Vector3,
      scale: number,
      rotation: number,
    ): boolean => {
      const ok = updateTransform(id, position, scale, rotation);
      if (ok) syncState();
      return ok;
    },
    [syncState],
  );

  const remove = useCallback(
    (id: string): boolean => {
      const ok = removeModel(id);
      if (ok) syncState();
      return ok;
    },
    [syncState],
  );

  const clearAll = useCallback(() => {
    clearAllModels();
    syncState();
  }, [syncState]);

  return {
    placedModels,
    selectedModelId,
    placeProduct,
    selectModel,
    updateModelTransform: updateModelTransformFn,
    removeModel: remove,
    clearAll,
  };
}
