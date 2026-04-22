/// <reference types="vite/client" />

// Workaround for @types/react vs TS version mismatch causing TS2786 on
// third-party class components (recharts, react-helmet-async, etc.).
import 'react';

declare global {
  namespace JSX {
    interface ElementClass {
      render?: any;
    }
  }
}
