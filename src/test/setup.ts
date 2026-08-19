import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// jsdom does not implement scrollIntoView; CategoryFilter calls it on mount.
Element.prototype.scrollIntoView = vi.fn();