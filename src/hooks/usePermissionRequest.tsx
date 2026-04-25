import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import RequestPermissionDialog from "@/components/RequestPermissionDialog";

interface PermissionRequestPayload {
  actionType: string;
  actionDescription: string;
  contextData?: Record<string, any>;
}

interface PermissionRequestContextType {
  requestPermission: (payload: PermissionRequestPayload) => void;
}

const PermissionRequestContext = createContext<PermissionRequestContextType>({
  requestPermission: () => {},
});

/**
 * Global provider — wraps the app so any component can open the
 * "Request permission from admin" dialog without prop-drilling.
 *
 * Usage:
 *   const { requestPermission } = usePermissionRequest();
 *   requestPermission({ actionType: "delete_order", actionDescription: "حذف طلب رقم 123" });
 */
export const PermissionRequestProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<PermissionRequestPayload | null>(null);

  const requestPermission = useCallback((p: PermissionRequestPayload) => {
    setPayload(p);
    setOpen(true);
  }, []);

  return (
    <PermissionRequestContext.Provider value={{ requestPermission }}>
      {children}
      {payload && (
        <RequestPermissionDialog
          open={open}
          onOpenChange={setOpen}
          actionType={payload.actionType}
          actionDescription={payload.actionDescription}
          contextData={payload.contextData}
        />
      )}
    </PermissionRequestContext.Provider>
  );
};

export const usePermissionRequest = () => useContext(PermissionRequestContext);
