import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import React from "react";

/**
 * Routing tests for `/` (Index) based on user role and viewport size.
 *
 * We mock everything Index.tsx pulls in so the test focuses purely on the
 * redirect decision tree:
 *   - Moderator-only → /admin
 *   - Pure dealer → /dealer
 *   - Dual-role (admin+dealer) with no saved choice → stay on /
 *   - Dual-role with saved role "dealer" → /dealer
 *   - Dual-role with saved role "admin" → /admin
 *   - Anonymous visitor → stay on /
 *
 * Each scenario is also re-run across mobile / tablet / desktop viewports to
 * confirm routing is viewport-independent.
 */

type AuthState = {
  dealerAccount: { id: string } | null;
  isAdmin: boolean;
  isModerator: boolean;
  loading: boolean;
};

let mockAuth: AuthState = {
  dealerAccount: null,
  isAdmin: false,
  isModerator: false,
  loading: false,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

// Stub heavy / side-effectful sub-components so Index renders cheaply.
const stub = (label: string) => () => <div data-testid={label}>{label}</div>;
vi.mock("@/components/Navbar", () => ({ default: stub("navbar") }));
vi.mock("@/components/HeroSection", () => ({ default: stub("hero") }));
vi.mock("@/components/SEOSchemaMarkup", () => ({
  OrganizationSchema: () => null,
  WebSiteSchema: () => null,
  LocalBusinessSchema: () => null,
  FAQSchema: () => null,
}));
vi.mock("@/hooks/useLazyVisible", () => ({
  useLazyVisible: () => [{ current: null }, false],
}));

import Index from "@/pages/Index";

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const setViewport = (w: number, h: number) => {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: w });
  Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: h });
  window.dispatchEvent(new Event("resize"));
};

const renderAt = (path = "/") =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dealer" element={<div data-testid="dealer-page">dealer</div>} />
          <Route path="/admin" element={<div data-testid="admin-page">admin</div>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>
  );

beforeEach(() => {
  localStorage.clear();
  mockAuth = { dealerAccount: null, isAdmin: false, isModerator: false, loading: false };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Index routing by role", () => {
  for (const vp of VIEWPORTS) {
    describe(`@ ${vp.name} (${vp.width}x${vp.height})`, () => {
      beforeEach(() => setViewport(vp.width, vp.height));

      it("anonymous visitor stays on / (sees homepage)", () => {
        renderAt("/");
        expect(screen.getByTestId("hero")).toBeInTheDocument();
        expect(screen.queryByTestId("dealer-page")).toBeNull();
        expect(screen.queryByTestId("admin-page")).toBeNull();
      });

      it("moderator-only is redirected to /admin", () => {
        mockAuth = { dealerAccount: null, isAdmin: false, isModerator: true, loading: false };
        renderAt("/");
        expect(screen.getByTestId("admin-page")).toBeInTheDocument();
        expect(screen.queryByTestId("hero")).toBeNull();
      });

      it("pure dealer is redirected to /dealer", () => {
        mockAuth = { dealerAccount: { id: "d1" }, isAdmin: false, isModerator: false, loading: false };
        renderAt("/");
        expect(screen.getByTestId("dealer-page")).toBeInTheDocument();
        expect(screen.queryByTestId("hero")).toBeNull();
      });

      it("dual-role (admin+dealer) with no saved choice stays on / so dialog can show", () => {
        mockAuth = { dealerAccount: { id: "d1" }, isAdmin: true, isModerator: false, loading: false };
        renderAt("/");
        expect(screen.getByTestId("hero")).toBeInTheDocument();
        expect(screen.queryByTestId("dealer-page")).toBeNull();
        expect(screen.queryByTestId("admin-page")).toBeNull();
      });

      it("dual-role with saved role=dealer goes to /dealer", () => {
        localStorage.setItem("almasria_last_role", "dealer");
        mockAuth = { dealerAccount: { id: "d1" }, isAdmin: true, isModerator: false, loading: false };
        renderAt("/");
        expect(screen.getByTestId("dealer-page")).toBeInTheDocument();
      });

      it("dual-role with saved role=admin goes to /admin", () => {
        localStorage.setItem("almasria_last_role", "admin");
        mockAuth = { dealerAccount: { id: "d1" }, isAdmin: true, isModerator: false, loading: false };
        renderAt("/");
        expect(screen.getByTestId("admin-page")).toBeInTheDocument();
      });

      it("while loading, no redirect happens (homepage shell renders)", () => {
        mockAuth = { dealerAccount: { id: "d1" }, isAdmin: false, isModerator: false, loading: true };
        renderAt("/");
        expect(screen.getByTestId("hero")).toBeInTheDocument();
        expect(screen.queryByTestId("dealer-page")).toBeNull();
      });
    });
  }
});
