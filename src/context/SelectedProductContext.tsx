import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { SelectedProduct } from '../types';

export interface SelectedProductContextValue {
  /** The currently selected product for AR placement, or null. */
  selectedProduct: SelectedProduct | null;
  /**
   * Set the selected product for AR handoff.
   * Pass null to clear.
   */
  setSelectedProduct: (product: SelectedProduct | null) => void;
}

const SelectedProductContext = createContext<SelectedProductContextValue | null>(
  null,
);

/**
 * Provider component that wraps the app and exposes the selected product state.
 *
 * This is the AI → AR handoff bridge: when the AI agent calls `select_product`,
 * the selected product payload is placed here for the AR layer to consume.
 */
export function SelectedProductProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [selectedProduct, setSelectedProduct] =
    useState<SelectedProduct | null>(null);

  const handleSetSelected = useCallback(
    (product: SelectedProduct | null) => {
      setSelectedProduct(product);
    },
    [],
  );

  const value = useMemo<SelectedProductContextValue>(
    () => ({
      selectedProduct,
      setSelectedProduct: handleSetSelected,
    }),
    [selectedProduct, handleSetSelected],
  );

  return (
    <SelectedProductContext.Provider value={value}>
      {children}
    </SelectedProductContext.Provider>
  );
}

/**
 * Hook to access the SelectedProduct context.
 * Throws if used outside of SelectedProductProvider.
 */
export function useSelectedProduct(): SelectedProductContextValue {
  const ctx = useContext(SelectedProductContext);
  if (!ctx) {
    throw new Error(
      'useSelectedProduct must be used within a SelectedProductProvider',
    );
  }
  return ctx;
}
