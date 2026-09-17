import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEVICE_KEY = "oils_device_id";

/** معرّف ثابت للجهاز محفوظ محليًا (يتولّد مرة واحدة). */
export const getOilsDeviceId = (): string => {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
};

const deviceLabel = () => {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "iPhone / iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac/i.test(ua)) return "Mac";
  return "جهاز غير معروف";
};

export type DeviceLockState = "checking" | "allowed" | "blocked";

/**
 * ربط حساب تاجر الزيوت بأول جهاز يسجّل الدخول منه.
 * أي جهاز آخر يُمنع ويُحوَّل لواتساب إدارة الزيت.
 */
export const useOilsDeviceLock = (userId: string | undefined) => {
  const [state, setState] = useState<DeviceLockState>("checking");
  const [boundLabel, setBoundLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setState("allowed");
      return;
    }

    let active = true;
    const deviceId = getOilsDeviceId();

    const run = async () => {
      const { data, error } = await supabase
        .from("oils_device_bindings")
        .select("device_id, device_label")
        .eq("user_id", userId)
        .maybeSingle();

      if (!active) return;

      // في حالة خطأ شبكة لا نحجب المستخدم
      if (error) { setState("allowed"); return; }

      if (!data) {
        const { error: insertError } = await supabase
          .from("oils_device_bindings")
          .insert({ user_id: userId, device_id: deviceId, device_label: deviceLabel() });
        if (!active) return;
        if (insertError) {
          // سباق: صفّ موجود بالفعل من جهاز آخر
          const { data: existing } = await supabase
            .from("oils_device_bindings")
            .select("device_id, device_label")
            .eq("user_id", userId)
            .maybeSingle();
          if (!active) return;
          if (existing && existing.device_id !== deviceId) {
            setBoundLabel(existing.device_label);
            setState("blocked");
            return;
          }
        }
        setState("allowed");
        return;
      }

      if (data.device_id !== deviceId) {
        setBoundLabel(data.device_label);
        setState("blocked");
        return;
      }

      setState("allowed");
      void supabase
        .from("oils_device_bindings")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("user_id", userId);
    };

    setState("checking");
    void run();
    return () => { active = false; };
  }, [userId]);

  return { state, boundLabel };
};
