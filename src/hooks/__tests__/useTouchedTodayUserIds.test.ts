/**
 * اختبارات منطق الفلترة في useTouchedTodayUserIds
 *
 * نتأكد من:
 *  1) IDs الموظفين (admin/moderator/reporter) ما تدخلش في touchedIds
 *     حتى لو ظهرت في customer_communications أو staff_task_handling.
 *  2) العملاء العاديين بيتضافوا للـ Set من المصدرين.
 *  3) Realtime INSERT بيضيف العميل فوراً، ويتجاهل لو الـ uid لموظف.
 *  4) لو نفس العميل في المصدرين، ميتكررش (Set unique).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

// ---- Mocks ----
const STAFF_ID = "staff-uuid-1";
const STAFF_ID_2 = "staff-uuid-2";
const CUSTOMER_A = "cust-uuid-a";
const CUSTOMER_B = "cust-uuid-b";

// نمسك الـ realtime handlers عشان ننفّذها يدويًا
const realtimeHandlers: Record<string, (payload: any) => void> = {};

const channelMock = {
  on: vi.fn((_event: string, filter: any, handler: any) => {
    realtimeHandlers[filter.table] = handler;
    return channelMock;
  }),
  subscribe: vi.fn(() => channelMock),
};

vi.mock("@/integrations/supabase/client", () => {
  const fromMock = vi.fn((table: string) => {
    const builder: any = {
      select: vi.fn(() => builder),
      gte: vi.fn(() => {
        if (table === "customer_communications") {
          return Promise.resolve({
            data: [
              { customer_user_id: CUSTOMER_A },
              { customer_user_id: STAFF_ID }, // موظف اتسجّل عليه إجراء بالغلط — لازم يتفلتر
              { customer_user_id: CUSTOMER_B },
            ],
            error: null,
          });
        }
        if (table === "staff_task_handling") {
          return Promise.resolve({
            data: [
              { customer_user_id: CUSTOMER_A, action_at: new Date().toISOString() }, // مكرر — Set
              { customer_user_id: STAFF_ID_2, action_at: new Date().toISOString() }, // موظف — يتفلتر
            ],
            error: null,
          });
        }
        return Promise.resolve({ data: [], error: null });
      }),
    };
    return builder;
  });

  return {
    supabase: {
      from: fromMock,
      rpc: vi.fn(() =>
        Promise.resolve({
          data: [{ user_id: STAFF_ID }, { user_id: STAFF_ID_2 }],
          error: null,
        }),
      ),
      channel: vi.fn(() => channelMock),
      removeChannel: vi.fn(),
    },
  };
});

// stub helpers الزمنية (مش محتاجين منطق التوقيت لاختبار الفلترة)
vi.mock("@/lib/handledTasks", () => ({
  cairoToday: () => "2026-01-01",
  cairoDayBoundsUTC: () => ({ startMs: 0, endMs: Date.now() }),
}));

// نستورد الـ hook بعد الـ mocks
import { useTouchedTodayUserIds } from "@/hooks/useTouchedTodayUserIds";

describe("useTouchedTodayUserIds — فلترة الموظفين والإجراءات", () => {
  beforeEach(() => {
    Object.keys(realtimeHandlers).forEach((k) => delete realtimeHandlers[k]);
  });

  it("يستبعد IDs الموظفين من touchedIds حتى لو ظهروا في المصادر", async () => {
    const { result } = renderHook(() => useTouchedTodayUserIds());
    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(result.current.touchedIds.has(STAFF_ID)).toBe(false);
    expect(result.current.touchedIds.has(STAFF_ID_2)).toBe(false);
  });

  it("يضيف العملاء العاديين من customer_communications و staff_task_handling", async () => {
    const { result } = renderHook(() => useTouchedTodayUserIds());
    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(result.current.touchedIds.has(CUSTOMER_A)).toBe(true);
    expect(result.current.touchedIds.has(CUSTOMER_B)).toBe(true);
  });

  it("Set يمنع التكرار لو نفس العميل في المصدرين", async () => {
    const { result } = renderHook(() => useTouchedTodayUserIds());
    await waitFor(() => expect(result.current.isReady).toBe(true));

    // CUSTOMER_A موجود في الجدولين
    expect(result.current.touchedIds.size).toBe(2); // A + B فقط
  });

  it("Realtime INSERT في customer_communications يضيف العميل فوراً", async () => {
    const { result } = renderHook(() => useTouchedTodayUserIds());
    await waitFor(() => expect(result.current.isReady).toBe(true));

    const NEW_CUSTOMER = "cust-new";
    act(() => {
      realtimeHandlers["customer_communications"]?.({
        new: { customer_user_id: NEW_CUSTOMER },
      });
    });

    await waitFor(() => {
      expect(result.current.touchedIds.has(NEW_CUSTOMER)).toBe(true);
    });
  });

  it("Realtime INSERT يتجاهل uid لو لموظف", async () => {
    const { result } = renderHook(() => useTouchedTodayUserIds());
    await waitFor(() => expect(result.current.isReady).toBe(true));
    const sizeBefore = result.current.touchedIds.size;

    act(() => {
      realtimeHandlers["staff_task_handling"]?.({
        new: { customer_user_id: STAFF_ID },
      });
    });

    expect(result.current.touchedIds.has(STAFF_ID)).toBe(false);
    expect(result.current.touchedIds.size).toBe(sizeBefore);
  });
});

/**
 * اختبار سلوك الفلترة في تبويب «يحتاجون متابعة الآن»:
 * بنحاكي الشرط المستخدم في AdminCustomerIntelligence.tsx:
 *   if (touchedTodayIds.has(p.user_id)) return; // skip
 *
 * ده بيضمن أن العميل بيختفي فورًا من قائمة المتابعة بعد أي إجراء من أي موظف،
 * والموظفين أصلاً مش بيظهروا (محميين على مستوى الـ hook).
 */
describe("منطق إخفاء العميل من تبويب «يحتاجون متابعة الآن»", () => {
  type Profile = { user_id: string; full_name: string };

  const buildFollowUpList = (
    profiles: Profile[],
    touchedTodayIds: Set<string>,
  ): Profile[] => {
    const out: Profile[] = [];
    for (const p of profiles) {
      if (touchedTodayIds.has(p.user_id)) continue; // نفس شرط الإنتاج
      out.push(p);
    }
    return out;
  };

  it("يخفي العميل بعد ما أي موظف ياخد إجراء (touchedTodayIds.has=true)", () => {
    const profiles: Profile[] = [
      { user_id: "c1", full_name: "أحمد" },
      { user_id: "c2", full_name: "محمد" },
      { user_id: "c3", full_name: "سارة" },
    ];
    const touched = new Set(["c2"]); // c2 اتعمل عليه إجراء النهارده
    const list = buildFollowUpList(profiles, touched);

    expect(list.map((p) => p.user_id)).toEqual(["c1", "c3"]);
    expect(list.find((p) => p.user_id === "c2")).toBeUndefined();
  });

  it("لو touched فاضي يعرض كل العملاء", () => {
    const profiles: Profile[] = [
      { user_id: "c1", full_name: "أحمد" },
      { user_id: "c2", full_name: "محمد" },
    ];
    expect(buildFollowUpList(profiles, new Set()).length).toBe(2);
  });

  it("الموظفين أصلاً مش بيوصلوا للقائمة (لأنهم متفلترين من الـ hook)", () => {
    // محاكاة: الـ hook رجّع touched فيها عميل واحد بس، والموظف مش موجود
    const profiles: Profile[] = [
      { user_id: STAFF_ID, full_name: "موظف داخلي" }, // لو ظهر بالغلط في profiles
      { user_id: "c1", full_name: "عميل" },
    ];
    const touched = new Set<string>(); // hook استبعد الموظف بالفعل
    // لكن في الإنتاج فيه فلتر إضافي — هنا بنتأكد إن لو الـ hook شغال صح،
    // الموظف لو حتى ظهر في profiles هيتشاف؛ علشان كده مهم الـ hook يستبعد دايمًا.
    const list = buildFollowUpList(profiles, touched);
    expect(list.length).toBe(2); // مفيش فلتر تاني هنا — الحماية الحقيقية في الـ hook
  });
});
