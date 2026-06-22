import { useMemo, useState, useCallback } from 'react';
import type { Product } from '../types';
import ProductCard from './ProductCard';
import CategoryFilter from './CategoryFilter';

// ─── Theme ────────────────────────────────────────────────────────────────────
const theme = {
  bg: '#121212',
  surface: '#1a1a1a',
  text: '#e0e0e0',
  textMuted: '#999',
  accent: '#8B5CF6',
  border: '#333',
  inputBg: '#1e1e1e',
  placeholder: '#666',
} as const;

// ─── Breakpoints (used in responsive style objects) ───────────────────────────

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProductBrowserProps {
  products: Product[];
  selectedProductId: string | null;
  onSelectProduct: (product: Product) => void;
  filterCategory?: string;
  searchQuery?: string;
}

// ─── Inline styles ────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  background: theme.bg,
  color: theme.text,
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
  fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif`,
};

const headerStyle: React.CSSProperties = {
  padding: '1rem 1rem 0.5rem',
  flexShrink: 0,
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.05rem',
  fontWeight: 700,
  color: theme.text,
  marginBottom: '0.65rem',
};

const searchContainer: React.CSSProperties = {
  position: 'relative',
  marginBottom: '0.5rem',
};

const searchIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: 10,
  top: '50%',
  transform: 'translateY(-50%)',
  color: theme.placeholder,
  fontSize: '0.8rem',
  pointerEvents: 'none',
  lineHeight: 1,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: theme.inputBg,
  border: `1px solid ${theme.border}`,
  borderRadius: 10,
  padding: '0.55rem 0.75rem 0.55rem 2rem',
  fontSize: '0.8rem',
  color: theme.text,
  outline: 'none',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
};

const filterSectionStyle: React.CSSProperties = {
  padding: '0 1rem',
  flexShrink: 0,
};

const scrollGridStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  padding: '0.25rem 1rem 1rem',
  WebkitOverflowScrolling: 'touch',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gap: '0.75rem',
  gridTemplateColumns: 'repeat(2, 1fr)',
};

const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '3rem 1rem',
  color: theme.textMuted,
  fontSize: '0.85rem',
  gridColumn: '1 / -1',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUniqueCategories(products: Product[]): string[] {
  const cats = new Set(products.map((p) => p.category));
  return Array.from(cats).sort();
}

function matchesSearch(product: Product, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    product.name.toLowerCase().includes(q) ||
    product.category.toLowerCase().includes(q) ||
    product.style.toLowerCase().includes(q) ||
    product.color.toLowerCase().includes(q)
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductBrowser({
  products,
  selectedProductId,
  onSelectProduct,
  filterCategory: externalFilter,
  searchQuery: externalSearch,
}: ProductBrowserProps) {
  // Internal state for search and category filter (can be overridden by props)
  const [internalSearch, setInternalSearch] = useState('');
  const [internalCategory, setInternalCategory] = useState<string | null>(null);

  // Use external values if provided, otherwise fall back to internal state
  const searchValue = externalSearch ?? internalSearch;
  const activeCategory = externalFilter ?? internalCategory;

  // Responsive grid: we handle this via a media query class injected in the head
  // and use ref-based detection for breakpoints. For simplicity we use CSS
  // grid with inline styles + a resize observer that swaps column count.
  const [columns, setColumns] = useState(2);

  // Simple resize handler to adjust column count
  const gridRefCallback = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w >= 900) setColumns(4);
        else if (w >= 600) setColumns(3);
        else setColumns(2);
      }
    });
    observer.observe(node);
    // Initial measurement
    const w = node.getBoundingClientRect().width;
    if (w >= 900) setColumns(4);
    else if (w >= 600) setColumns(3);
    else setColumns(2);
    // Cleanup on unmount
    return () => observer.disconnect();
  }, []);

  // ── Derived data ──────────────────────────────────────────────────────────
  const categories = useMemo(() => getUniqueCategories(products), [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory) {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (searchValue) {
      list = list.filter((p) => matchesSearch(p, searchValue));
    }
    return list;
  }, [products, activeCategory, searchValue]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalSearch(e.target.value);
  }, []);

  const handleSelectCategory = useCallback((cat: string | null) => {
    setInternalCategory(cat);
  }, []);

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={titleStyle}>Product Catalog</div>

        {/* Search */}
        <div style={searchContainer}>
          <span style={searchIconStyle} aria-hidden="true">
            &#128269;
          </span>
          <input
            type="text"
            placeholder="Search by name, category, style, or color…"
            value={searchValue}
            onChange={handleSearchChange}
            style={inputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = theme.accent;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = theme.border;
            }}
            aria-label="Search products"
          />
        </div>
      </div>

      {/* Category filter */}
      <div style={filterSectionStyle}>
        <CategoryFilter
          categories={categories}
          selectedCategory={activeCategory}
          onSelectCategory={handleSelectCategory}
        />
      </div>

      {/* Scrollable product grid */}
      <div style={scrollGridStyle}>
        <div
          ref={gridRefCallback}
          style={{
            ...gridStyle,
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
          }}
        >
          {filtered.length === 0 ? (
            <div style={emptyStyle}>
              No products match your search.
            </div>
          ) : (
            filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isSelected={selectedProductId === product.id}
                onSelect={onSelectProduct}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
