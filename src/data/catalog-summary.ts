import catalog from './catalog.json';

interface CatalogItem {
  category: string;
  style: string;
  color: string;
  [key: string]: unknown;
}

const items = catalog as CatalogItem[];

export function getCatalogSummary(): string {
  const categories = [...new Set(items.map(i => i.category))].sort();
  const styles = [...new Set(items.map(i => i.style))].sort();
  const colors = [...new Set(items.map(i => i.color))].sort();
  
  return `We carry ${items.length} products across ${categories.length} categories including ${categories.slice(0, -1).join(', ')} and ${categories[categories.length - 1]}. Styles include ${styles.slice(0, -1).join(', ')} and ${styles[styles.length - 1]}. Colors include ${colors.slice(0, -1).join(', ')} and ${colors[colors.length - 1]}.`;
}

export function getCategoryCount(): number {
  return [...new Set(items.map(i => i.category))].length;
}

export function getCategories(): string[] {
  return [...new Set(items.map(i => i.category))].sort();
}

export function getStyles(): string[] {
  return [...new Set(items.map(i => i.style))].sort();
}

export function getColors(): string[] {
  return [...new Set(items.map(i => i.color))].sort();
}

export function getTotalProducts(): number {
  return items.length;
}