import { create } from "zustand";

interface PermissionRequestPayload {
  actionType: string;
  actionDescription: string;
  contextData?: Record<string, any>;
}

interface PermissionRequestStore {
  open: boolean;
  payload: PermissionRequestPayload | null;
  requestPermission: (payload: PermissionRequestPayload) => void;
  close: () => void;
}

/**
 * Global store for opening the RequestPermissionDialog from anywhere in the app.
 *
 * Usage in any component:
 *   const requestPermission = usePermissionRequest((s) => s.requestPermission);
 *   requestPermission({
 *     actionType: "delete_order",
 *     actionDescription: "حذف طلب رقم ORD-123",
 *     contextData: { orderId: "..." },
 *   });
 */
export const usePermissionRequest = create<PermissionRequestStore>((set) => ({
  open: false,
  payload: null,
  requestPermission: (payload) => set({ open: true, payload }),
  close: () => set({ open: false }),
}));
