/// <reference types="vite/client" />

// Compatibility shim: relax JSX.ElementClass to accept third-party class
// components whose render() returns React.JSX.Element instead of ReactNode
// (recharts, react-helmet-async). Mismatch surfaces as TS2786/TS2607.
import type * as React from 'react';

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface ElementClass {
      render: any;
    }
  }
}
