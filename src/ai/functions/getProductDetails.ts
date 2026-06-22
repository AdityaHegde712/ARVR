import type { Product } from '../../types';

export interface ProductDetailsResult {
  id: string;
  name: string;
  category: string;
  style: string;
  color: string;
  description: string;
  dimensions: { width: number; height: number; depth: number };
  colorHex: string;
  thumbnailUrl: string;
  scaleHint: { x: number; y: number; z: number };
  placementHints: { surfaceType: string; defaultOrientation: number };
}

/**
 * Look up a product by its ID in the catalog.
 * Returns full product details or null if not found.
 */
export function executeGetProductDetails(
  productId: string,
  catalog: Product[],
): ProductDetailsResult | null {
  const product = catalog.find((p) => p.id === productId);
  if (!product) return null;

  return {
    id: product.id,
    name: product.name,
    category: product.category,
    style: product.style,
    color: product.color,
    description: product.description,
    dimensions: { ...product.dimensions },
    colorHex: product.colorHex,
    thumbnailUrl: product.thumbnailUrl,
    scaleHint: { ...product.scaleHint },
    placementHints: { ...product.placementHints },
  };
}
