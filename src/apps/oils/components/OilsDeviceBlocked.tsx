import { LogOut, ShieldAlert, Smartphone } from "lucide-react";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const OILS_WA = "201039313427";

type Props = { boundLabel?: string | null };

/** شاشة منع الدخول من جهاز غير الجهاز المرتبط بالحساب. */
const OilsDeviceBlocked = ({ boundLabel }: Props) => {
  const waLink = `https://wa.me/${OILS_WA}?text=${encodeURIComponent("السلام عليكم، عايز أغيّر الجهاز المرتبط بحسابي في تطبيق الزيوت.")}`;

  return (
    <main className="oils-screen oils-device-block" dir="rtl">
      <div className="oils-device-block-card">
        <span className="oils-device-block-mark"><ShieldAlert /></span>
        <small>حماية الحساب</small>
        <h1>هذا الحساب مرتبط بجهاز آخر</h1>
        <p>
          لأمان حسابك، تطبيق الزيوت يعمل من جهاز واحد فقط — الجهاز الذي سجّلت منه أول مرة
          {boundLabel ? ` (${boundLabel})` : ""}.
        </p>
        <div className="oils-device-block-note"><Smartphone /> لتغيير الجهاز، تواصل مع إدارة الزيت على واتساب.</div>
        <a className="oils-btn-primary oils-device-block-wa" href={waLink} target="_blank" rel="noreferrer">
          <MessageCircle /> <span>واتساب إدارة الزيت</span>
        </a>
        <button type="button" className="oils-device-block-out" onClick={() => void supabase.auth.signOut()}>
          <LogOut /> تسجيل الخروج
        </button>
      </div>
    </main>
  );
};

export default OilsDeviceBlocked;
