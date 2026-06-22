export interface Product {
  id: string;
  name: string;
  category: string;
  style: string;
  color: string;
  description: string;
  modelType: string;
  shape: string;
  dimensions: { width: number; height: number; depth: number };
  colorHex: string;
  thumbnailUrl: string;
  scaleHint: { x: number; y: number; z: number };
  placementHints: { surfaceType: string; defaultOrientation: number };
}
