import { supabase } from "@/integrations/supabase/client";
import { isNativePlatform, isNativeIOS } from "@/lib/native";

// VAPID public key - this is safe to expose (it's a public key)
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

/**
 * Feature-gate for Web Push. On native Capacitor iOS the WKWebView does
 * NOT support the Web Push API — native path uses APNs via
 * `@capacitor/push-notifications` and the `device_tokens` table.
 */
export const isWebPushSupported = (): boolean => {
  if (isNativePlatform()) return false;
  if (typeof window === "undefined") return false;
  return "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function getSafeRegistration(timeoutMs = 3000): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
  ]);
}

// ============================================================================
// NATIVE (iOS APNs) path
// ============================================================================

/**
 * Register the device with APNs and persist the token to `device_tokens`.
 * Safe to call on web (early-returns). Idempotent — re-registration updates
 * the existing row via upsert on (user_id, token).
 */
export async function registerNativePush(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const perm = await PushNotifications.checkPermissions();
    let granted = perm.receive === "granted";
    if (!granted) {
      const req = await PushNotifications.requestPermissions();
      granted = req.receive === "granted";
    }
    if (!granted) {
      console.log("[push] permission denied");
      return false;
    }

    return await new Promise<boolean>((resolve) => {
      let done = false;
      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        resolve(ok);
      };

      PushNotifications.addListener("registration", async (t) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return finish(false);

          await supabase.from("device_tokens").upsert({
            user_id: user.id,
            token: t.value,
            platform: isNativeIOS() ? "ios" : "android",
            bundle_id: "com.almasria.autoparts",
          } as never, { onConflict: "user_id,token" });

          finish(true);
        } catch (e) {
          console.error("[push] save token failed", e);
          finish(false);
        }
      });

      PushNotifications.addListener("registrationError", (err) => {
        console.error("[push] registration error", err);
        finish(false);
      });

      PushNotifications.register().catch(() => finish(false));
      // Timeout safety
      setTimeout(() => finish(false), 10000);
    });
  } catch (err) {
    console.error("[push] native register failed", err);
    return false;
  }
}

// ============================================================================
// WEB (VAPID) path — unchanged
// ============================================================================

export async function requestPushPermission(): Promise<boolean> {
  if (isNativePlatform()) return registerNativePush();

  if (!isWebPushSupported()) {
    console.log("Push notifications not supported on this platform");
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return false;
  }

  try {
    const registration = await getSafeRegistration();
    if (!registration) return false;

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription && VAPID_PUBLIC_KEY) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    if (subscription) {
      await saveSubscription(subscription);
      return true;
    }
  } catch (error) {
    console.error("Push subscription failed:", error);
  }

  return false;
}

async function saveSubscription(subscription: PushSubscription) {
  const { data: { user } } = await supabase.auth.getUser();
  const keys = subscription.toJSON().keys;

  if (user) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", subscription.endpoint);
  }

  await supabase.from("push_subscriptions").insert({
    user_id: user?.id || null,
    endpoint: subscription.endpoint,
    p256dh: keys?.p256dh || "",
    auth: keys?.auth || "",
  } as never);
}

export async function isPushSubscribed(): Promise<boolean> {
  if (isNativePlatform()) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await supabase
        .from("device_tokens")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      return !!data;
    } catch { return false; }
  }
  if (!("serviceWorker" in navigator)) return false;
  try {
    const registration = await getSafeRegistration();
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

export async function unsubscribePush(): Promise<boolean> {
  if (isNativePlatform()) {
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      await PushNotifications.removeAllListeners();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("device_tokens").delete().eq("user_id", user.id);
      }
      return true;
    } catch { return false; }
  }
  if (!("serviceWorker" in navigator)) return false;
  try {
    const registration = await getSafeRegistration();
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", subscription.endpoint);
      return true;
    }
  } catch (error) {
    console.error("Unsubscribe failed:", error);
  }
  return false;
}
