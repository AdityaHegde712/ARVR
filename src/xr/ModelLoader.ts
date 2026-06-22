import * as THREE from 'three';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * A product catalog entry as it appears in catalog.json.
 * Only the fields relevant for model generation are required;
 * extra fields (description, thumbnailUrl, etc.) are allowed.
 */
export interface ProductCatalogEntry {
  id: string;
  name: string;
  category: string;
  shape: string;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  colorHex: string;
  scaleHint: {
    x: number;
    y: number;
    z: number;
  };
  placementHints: {
    surfaceType: string;
    defaultOrientation: number;
  };
  [key: string]: unknown;
}

// ─── Geometry cache ──────────────────────────────────────────────────────────

const geometryCache = new Map<string, THREE.BufferGeometry>();

function cacheKey(product: ProductCatalogEntry): string {
  return `${product.id}_${product.shape}`;
}

// ─── Shadow plane builder ────────────────────────────────────────────────────

/**
 * Adds a thin, semi-transparent shadow-receiving circle under the model
 * so it appears grounded on the detected surface.
 */
function addShadowPlane(
  group: THREE.Group,
  dimensions: { width: number; depth: number },
): void {
  const radius = Math.max(dimensions.width, dimensions.depth) * 0.65;
  const shadowGeo = new THREE.CircleGeometry(radius, 24);
  const shadowMat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.001; // just above surface to avoid z-fighting
  shadowMesh.receiveShadow = true;
  shadowMesh.name = 'shadow-plane';
  group.add(shadowMesh);
}

// ─── Model builders ──────────────────────────────────────────────────────────

/**
 * Build a standard single-mesh model (BoxGeometry or CylinderGeometry).
 * The mesh's origin is placed so that its *bottom* is at y = 0.
 */
function buildFromGeometry(
  product: ProductCatalogEntry,
): THREE.BufferGeometry {
  const { shape, dimensions } = product;
  const { width, height, depth } = dimensions;

  switch (shape) {
    case 'BoxGeometry': {
      return new THREE.BoxGeometry(width, height, depth);
    }
    case 'CylinderGeometry': {
      const radiusAvg = (width / 2 + depth / 2) / 2;
      return new THREE.CylinderGeometry(radiusAvg, radiusAvg, height, 24);
    }
    default: {
      // Fallback to box
      return new THREE.BoxGeometry(width, height, depth);
    }
  }
}

/**
 * Build the "potted-plant" custom model as a group of primitives:
 *   - A CylinderGeometry pot (wider at bottom)
 *   - Two SphereGeometry leaf clusters on top
 */
function buildPottedPlant(
  group: THREE.Group,
  product: ProductCatalogEntry,
): void {
  const { width, height, depth } = product.dimensions;
  const avgDiameter = Math.min(width, depth);
  const potHeight = height * 0.4;
  const potRadiusBottom = avgDiameter / 2 * 0.8;
  const potRadiusTop = avgDiameter / 2 * 0.6;
  const sphereRadius = avgDiameter / 2 * 0.9;

  // --- Pot ----------------------------------------------------------------
  const potGeo = new THREE.CylinderGeometry(
    potRadiusTop,
    potRadiusBottom,
    potHeight,
    16,
  );
  const potMat = new THREE.MeshStandardMaterial({
    color: product.colorHex,
    roughness: 0.7,
    metalness: 0.05,
  });
  const pot = new THREE.Mesh(potGeo, potMat);
  pot.position.y = potHeight / 2;
  pot.castShadow = true;
  pot.receiveShadow = true;
  pot.name = 'pot-mesh';
  group.add(pot);

  // --- Leaves (slightly darker variant) ----------------------------------
  const leafColor = new THREE.Color(product.colorHex).multiplyScalar(0.85);
  const leafMat = new THREE.MeshStandardMaterial({
    color: leafColor,
    roughness: 0.8,
    metalness: 0.0,
  });

  const leafGeo = new THREE.SphereGeometry(sphereRadius, 16, 16);
  const leaf = new THREE.Mesh(leafGeo, leafMat);
  leaf.position.y = potHeight + sphereRadius * 0.7;
  leaf.scale.y = 1.1;
  leaf.castShadow = true;
  leaf.receiveShadow = true;
  leaf.name = 'leaves-main';
  group.add(leaf);

  const leaf2Geo = new THREE.SphereGeometry(sphereRadius * 0.7, 14, 14);
  const leaf2 = new THREE.Mesh(leaf2Geo, leafMat);
  leaf2.position.set(0.1, potHeight + sphereRadius * 1.2, 0.08);
  leaf2.scale.y = 0.9;
  leaf2.castShadow = true;
  leaf2.receiveShadow = true;
  leaf2.name = 'leaves-secondary';
  group.add(leaf2);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Create a placeholder 3D model for a product catalog entry.
 *
 * The returned `THREE.Group` is structured so that:
 *   - The bottom of the model is at local y = 0
 *   - The group's `userData` contains `{ productId, type: 'placed-model' }`
 *   - A shadow-receiving circle is included (if `addShadow` is true)
 *
 * Geometries are cached by product id + shape to avoid re-allocation.
 *
 * @param product   The product catalog entry to build a model for.
 * @param addShadow Whether to include a shadow-receiving ground plane.
 * @returns A THREE.Group ready to be positioned at the surface height.
 */
export function createPlaceholderModel(
  product: ProductCatalogEntry,
  addShadow = true,
): THREE.Group {
  const group = new THREE.Group();
  group.userData = { productId: product.id, type: 'placed-model' };

  // Custom models (potted plant) are built from multiple primitives
  if (product.shape === 'custom' && product.id === 'potted-plant') {
    buildPottedPlant(group, product);
  } else {
    // Standard single-mesh models
    const key = cacheKey(product);
    let geometry = geometryCache.get(key);
    if (!geometry) {
      geometry = buildFromGeometry(product);
      geometryCache.set(key, geometry);
    }

    const material = new THREE.MeshStandardMaterial({
      color: product.colorHex,
      roughness: 0.6,
      metalness: 0.1,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = product.dimensions.height / 2; // bottom at y = 0
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'main-mesh';
    group.add(mesh);
  }

  // Shadow-receiving ground plane
  if (addShadow) {
    addShadowPlane(group, product.dimensions);
  }

  return group;
}

/**
 * Clear the geometry cache and dispose all cached geometries.
 */
export function clearModelCache(): void {
  geometryCache.forEach((g) => g.dispose());
  geometryCache.clear();
}
