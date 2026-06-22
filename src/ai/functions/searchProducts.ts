import type { Product } from '../../types';

export interface SearchProductsArgs {
  query?: string;
  category?: string;
  style?: string;
  color?: string;
  maxResults?: number;
}

export interface SearchResult {
  id: string;
  name: string;
  category: string;
  style: string;
  color: string;
  description: string;
  dimensions: { width: number; height: number; depth: number };
  thumbnailUrl: string;
  colorHex: string;
}

/**
 * Case-insensitive fuzzy match: checks if `query` appears as a substring
 * in any of the target fields (name, description, style, color, category).
 */
function fuzzyMatch(query: string, product: Product): boolean {
  const lowerQuery = query.toLowerCase();
  const searchable = [
    product.name,
    product.description,
    product.style,
    product.color,
    product.category,
  ];
  return searchable.some((field) => field.toLowerCase().includes(lowerQuery));
}

/**
 * Execute a product search against the catalog.
 * Filters by: free-text query (fuzzy match), category, style, color.
 * All filters are optional and combined with AND logic.
 * Returns top N results sorted by relevance (query match first).
 */
export function executeSearchProducts(
  args: SearchProductsArgs,
  catalog: Product[],
): SearchResult[] {
  const { query, category, style, color, maxResults = 5 } = args;

  let results = [...catalog];

  // Apply structured filters
  if (category) {
    const lower = category.toLowerCase();
    results = results.filter(
      (p) => p.category.toLowerCase() === lower,
    );
  }
  if (style) {
    const lower = style.toLowerCase();
    results = results.filter((p) => p.style.toLowerCase() === lower);
  }
  if (color) {
    const lower = color.toLowerCase();
    results = results.filter((p) => p.color.toLowerCase() === lower);
  }

  // Apply free-text fuzzy match if query provided
  if (query && query.trim()) {
    // Use fuzzy match against multiple fields
    const matched = results.filter((p) => fuzzyMatch(query, p));

    // If structured filters narrowed results AND query also matches,
    // prefer the intersection; otherwise fall back to structured only
    if (matched.length > 0) {
      results = matched;
    }
    // If query yielded nothing with structured filters, try query alone
    else if (!category && !style && !color) {
      // Already empty — nothing to do
    }
  }

  // Sort: prefer exact name matches (query term appears in name)
  if (query && query.trim()) {
    const lowerQuery = query.toLowerCase();
    results.sort((a, b) => {
      const aName = a.name.toLowerCase().includes(lowerQuery) ? 0 : 1;
      const bName = b.name.toLowerCase().includes(lowerQuery) ? 0 : 1;
      return aName - bName;
    });
  }

  // Limit results
  results = results.slice(0, maxResults);

  // Map to search result shape
  return results.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    style: p.style,
    color: p.color,
    description: p.description,
    dimensions: { ...p.dimensions },
    thumbnailUrl: p.thumbnailUrl,
    colorHex: p.colorHex,
  }));
}
