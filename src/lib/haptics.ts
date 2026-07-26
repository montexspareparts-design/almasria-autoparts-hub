import { isNativePlatform } from "@/lib/native";

/**
 * Thin haptic-feedback wrapper.
 *
 * Silent no-op on the web / in preview. Only fires inside the real
 * iOS/Android shell, and never throws — haptics must never be able to
 * break a UI interaction.
 */
type ImpactWeight = "light" | "medium" | "heavy";

export const haptic = async (weight: ImpactWeight = "light"): Promise<void> => {
  if (!isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    const style =
      weight === "heavy"
        ? ImpactStyle.Heavy
        : weight === "medium"
          ? ImpactStyle.Medium
          : ImpactStyle.Light;
    await Haptics.impact({ style });
  } catch {
    /* ignore — haptics are cosmetic */
  }
};

export const hapticSuccess = async (): Promise<void> => {
  if (!isNativePlatform()) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    /* ignore */
  }
};
