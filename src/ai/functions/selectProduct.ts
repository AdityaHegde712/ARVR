import type { Product, SelectedProduct } from '../../types';

/**
 * Execute product selection — validates the product exists and returns
 * the SelectedProduct payload for the AR handoff bridge.
 *
 * The `confirmPhrase` parameter is acknowledged (passed through for
 * conversation tracking) but not used for payload generation.
 */
export function executeSelectProduct(
  productId: string,
  catalog: Product[],
): SelectedProduct {
  const product = catalog.find((p) => p.id === productId);

  if (!product) {
    throw new Error(`Product not found: "${productId}". Please search for a valid product first.`);
  }

  // Build model URL from product ID (convention-based)
  // In production this would come from the catalog entry
  const modelUrl = `/models/${product.id}.glb`;

  const selected: SelectedProduct = {
    productId: product.id,
    modelUrl,
    scaleHint: product.scaleHint
      ? { x: product.scaleHint.x, y: product.scaleHint.y, z: product.scaleHint.z }
      : undefined,
    category: product.category,
  };

  // Set placement hints if available
  if (product.placementHints) {
    selected.placementHints = {
      surfaceType: mapSurfaceType(product.placementHints.surfaceType),
      defaultOrientation: product.placementHints.defaultOrientation,
    };
  }

  return selected;
}

/**
 * Map a surface type string to the typed union.
 * Defaults to 'floor' for unknown values.
 */
function mapSurfaceType(surfaceType: string): 'floor' | 'table' | 'wall' {
  const lower = surfaceType.toLowerCase();
  if (lower === 'table' || lower === 'wall') {
    return lower;
  }
  return 'floor';
}
