import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  isAppleSignInAvailable,
  startAppleSignIn,
  AppleSignInCanceledError,
} from "@/lib/appleSignIn";

/**
 * Native-iOS-only Sign in with Apple button.
 * Renders nothing on web / Android. Handles the full flow via
 * `startAppleSignIn()` and surfaces Arabic user-friendly errors only.
 */
export const AppleSignInButton = ({
  onSuccess,
  className = "",
}: {
  onSuccess?: () => void;
  className?: string;
}) => {
  const [loading, setLoading] = useState(false);

  if (!isAppleSignInAvailable()) return null;

  const handleClick = async () => {
    setLoading(true);
    try {
      await startAppleSignIn();
      toast.success("تم تسجيل الدخول بنجاح");
      onSuccess?.();
    } catch (err) {
      if (err instanceof AppleSignInCanceledError) {
        // Silent — user backed out.
      } else {
        console.error("[apple] login failed", err);
        toast.error("تعذّر تسجيل الدخول بحساب Apple. حاول مرة أخرى.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={loading}
      className={
        "w-full gap-2.5 h-11 text-sm font-semibold bg-black text-white hover:bg-black/90 border-black " +
        className
      }
    >
      {loading ? (
        "جاري التحميل..."
      ) : (
        <>
          <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.564 12.65c-.02-2.2 1.796-3.253 1.878-3.305-1.023-1.5-2.617-1.705-3.184-1.73-1.356-.137-2.647.8-3.336.8-.69 0-1.75-.78-2.879-.76-1.482.022-2.848.86-3.61 2.183-1.542 2.67-.393 6.614 1.107 8.777.735 1.06 1.611 2.25 2.76 2.208 1.107-.045 1.526-.716 2.865-.716 1.339 0 1.717.716 2.887.694 1.192-.02 1.947-1.08 2.677-2.143.843-1.23 1.19-2.42 1.21-2.482-.027-.012-2.32-.89-2.375-3.526zM15.34 5.86c.61-.74 1.022-1.767.91-2.79-.88.035-1.945.586-2.577 1.326-.566.653-1.062 1.7-.928 2.702.984.076 1.984-.5 2.595-1.238z"/>
          </svg>
          <span>تسجيل الدخول بحساب Apple</span>
        </>
      )}
    </Button>
  );
};

export default AppleSignInButton;
