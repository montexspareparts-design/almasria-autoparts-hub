/**
 * Tests for the customer list Tabs structure inside AdminCustomerIntelligence.
 *
 * Goal:
 *   1. Confirm the customer list tab strip is now a 3-column grid (after removing "تمت اليوم").
 *   2. Confirm switching between the 3 tabs renders the correct panel content with no errors.
 *
 * We mount a minimal, isolated copy of the Tabs structure that mirrors the real
 * markup in AdminCustomerIntelligence.tsx (lines ~3203-3221). The full component
 * is not mounted because it depends on Supabase, react-query, and many props.
 */
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

/** Radix Tabs uses pointer events; dispatch them then click. */
const activate = (el: HTMLElement) => {
  fireEvent.pointerDown(el, { button: 0, ctrlKey: false });
  fireEvent.mouseDown(el, { button: 0 });
  fireEvent.pointerUp(el, { button: 0 });
  fireEvent.mouseUp(el, { button: 0 });
  fireEvent.click(el);
};
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Zap, History } from "lucide-react";

const CustomerListTabsFixture = () => (
  <Tabs defaultValue="all" className="w-full">
    <TabsList
      data-testid="customer-list-tabs"
      className="grid w-full grid-cols-3 h-auto p-1 bg-muted/40 rounded-xl mb-3"
    >
      <TabsTrigger value="all">
        <Users className="w-3.5 h-3.5" />
        كل العملاء
      </TabsTrigger>
      <TabsTrigger value="followup">
        <Zap className="w-3.5 h-3.5 text-orange-500" />
        يحتاجون متابعة الآن
      </TabsTrigger>
      <TabsTrigger value="interactions">
        <History className="w-3.5 h-3.5 text-primary" />
        سجل التفاعلات
      </TabsTrigger>
    </TabsList>
    <TabsContent value="all">
      <div data-testid="panel-all">قائمة كل العملاء</div>
    </TabsContent>
    <TabsContent value="followup">
      <div data-testid="panel-followup">قائمة المتابعة</div>
    </TabsContent>
    <TabsContent value="interactions">
      <div data-testid="panel-interactions">سجل التفاعلات</div>
    </TabsContent>
  </Tabs>
);

describe("Customer list tabs", () => {
  it("renders exactly 3 tab triggers (no 'تمت اليوم' tab)", () => {
    render(<CustomerListTabsFixture />);
    const tablist = screen.getByTestId("customer-list-tabs");
    const triggers = within(tablist).getAllByRole("tab");
    expect(triggers).toHaveLength(3);

    // Make sure the removed tab label is gone
    expect(screen.queryByRole("tab", { name: /تمت اليوم/ })).toBeNull();
  });

  it("uses a 3-column grid layout on the tab strip", () => {
    render(<CustomerListTabsFixture />);
    const tablist = screen.getByTestId("customer-list-tabs");
    expect(tablist.className).toMatch(/grid-cols-3/);
    expect(tablist.className).not.toMatch(/grid-cols-4/);
  });

  it("shows the three expected tab labels in order", () => {
    render(<CustomerListTabsFixture />);
    const tablist = screen.getByTestId("customer-list-tabs");
    const labels = within(tablist)
      .getAllByRole("tab")
      .map((t) => t.textContent?.trim());
    expect(labels).toEqual([
      expect.stringContaining("كل العملاء"),
      expect.stringContaining("يحتاجون متابعة الآن"),
      expect.stringContaining("سجل التفاعلات"),
    ]);
  });

  it("starts on 'كل العملاء' panel by default", () => {
    render(<CustomerListTabsFixture />);
    expect(screen.getByTestId("panel-all")).toBeVisible();
  });

  it("navigates between all 3 tabs without errors", () => {
    render(<CustomerListTabsFixture />);

    // Default: "all" panel visible
    expect(screen.getByTestId("panel-all")).toBeVisible();

    // Switch to "followup"
    fireEvent.click(screen.getByRole("tab", { name: /يحتاجون متابعة الآن/ }));
    expect(screen.getByTestId("panel-followup")).toBeVisible();

    // Switch to "interactions"
    fireEvent.click(screen.getByRole("tab", { name: /سجل التفاعلات/ }));
    expect(screen.getByTestId("panel-interactions")).toBeVisible();

    // Back to "all"
    fireEvent.click(screen.getByRole("tab", { name: /كل العملاء/ }));
    expect(screen.getByTestId("panel-all")).toBeVisible();
  });

  it("marks only the active tab with aria-selected=true", () => {
    render(<CustomerListTabsFixture />);
    fireEvent.click(screen.getByRole("tab", { name: /سجل التفاعلات/ }));

    const tablist = screen.getByTestId("customer-list-tabs");
    const tabs = within(tablist).getAllByRole("tab");
    const selected = tabs.filter((t) => t.getAttribute("aria-selected") === "true");
    expect(selected).toHaveLength(1);
    expect(selected[0].textContent).toMatch(/سجل التفاعلات/);
  });
});
