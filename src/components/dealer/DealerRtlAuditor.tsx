import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { auditDirectionalAndWarn } from "@/lib/devDirectionalAudit";

/**
 * Dev-only component: mounts inside dealer pages and runs a directional audit
 * after the page settles. Logs a warning + shows a one-time toast if any
 * legacy mr/ml/pr/pl/text-right/text-left classes are detected.
 *
 * In production it renders nothing and does no work.
 */
const DealerRtlAuditor = () => {
  const location = useLocation();

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!location.pathname.startsWith("/dealer")) return;

    let toastShown = false;
    const run = () => {
      const offenders = auditDirectionalAndWarn(`route ${location.pathname}`);
      if (offenders.length > 0 && !toastShown) {
        toastShown = true;
        toast.warning(
          `RTL Audit: ${offenders.length} كلاس اتجاهي قديم في ${location.pathname}`,
          {
            description:
              "افتح الكونسول لرؤية القائمة الكاملة. حوّل mr/ml → ms/me و pr/pl → ps/pe.",
            duration: 6000,
          },
        );
      }
    };

    // Initial pass after layout settles
    const t1 = window.setTimeout(run, 800);
    // Second pass after lazy content typically loads
    const t2 = window.setTimeout(run, 2500);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [location.pathname]);

  return null;
};

export default DealerRtlAuditor;
