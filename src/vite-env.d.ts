/// <reference types="vite/client" />

// Workaround for @types/react vs TS version mismatch causing TS2786/TS2607
// on third-party class components (recharts, react-helmet-async, etc.).
declare global {
  namespace JSX {
    interface ElementClass {
      props: any;
      context: any;
      setState: any;
      forceUpdate: any;
      refs: any;
      state: any;
    }
  }
}

export {};
