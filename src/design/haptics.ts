/**
 * Al Masria Design System — haptics.
 * Uses Capacitor Haptics when running natively, falls back to vibrate().
 */

type Style = "light" | "medium" | "success" | "warning";

const fallback = (ms: number) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* no-op */
  }
};

const run = async (style: Style) => {
  try {
    const mod: any = await import("@capacitor/haptics").catch(() => null);
    if (!mod?.Haptics) return fallback(style === "light" ? 8 : 14);

    const { Haptics, ImpactStyle, NotificationType } = mod;
    if (style === "light") return await Haptics.impact({ style: ImpactStyle.Light });
    if (style === "medium") return await Haptics.impact({ style: ImpactStyle.Medium });
    if (style === "success") return await Haptics.notification({ type: NotificationType.Success });
    return await Haptics.notification({ type: NotificationType.Warning });
  } catch {
    fallback(10);
  }
};

export const light = () => void run("light");
export const medium = () => void run("medium");
export const success = () => void run("success");
export const warning = () => void run("warning");

export default { light, medium, success, warning };
