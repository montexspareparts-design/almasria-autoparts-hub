import { useEffect, useRef, useState } from "react";
import logo from "@/assets/oils/almasria-oils-wholesale-transparent.png";

const INTRO_KEY = "oils_intro_shown_v1";

/** انترو افتتاحي سينمائي لتطبيق جملة الزيوت — يظهر مرة واحدة لكل جلسة */
const OilsIntro = () => {
  const alreadyShown = useRef(typeof window !== "undefined" && sessionStorage.getItem(INTRO_KEY) === "1");
  const [phase, setPhase] = useState<"hidden" | "playing" | "leaving">(alreadyShown.current ? "hidden" : "playing");

  useEffect(() => {
    if (alreadyShown.current) return;
    sessionStorage.setItem(INTRO_KEY, "1");
    const leave = window.setTimeout(() => setPhase("leaving"), 2450);
    const done = window.setTimeout(() => setPhase("hidden"), 3150);
    return () => { window.clearTimeout(leave); window.clearTimeout(done); };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div className={`oils-intro ${phase === "leaving" ? "is-leaving" : ""}`} dir="rtl" role="presentation">
      <div className="oils-intro-aura" aria-hidden="true" />
      <div className="oils-intro-rings" aria-hidden="true"><span /><span /><span /></div>
      <div className="oils-intro-stage">
        <div className="oils-intro-logo">
          <img src={logo} alt="المصرية زيوت جملة" />
          <span className="oils-intro-sheen" aria-hidden="true" />
        </div>
        <div className="oils-intro-copy">
          <strong>المصرية زيوت جملة</strong>
          <span>موزع معتمد لزيوت تويوتا الأصلية</span>
        </div>
        <div className="oils-intro-rule" aria-hidden="true"><i /></div>
        <p className="oils-intro-tag">تطبيق الجملة — أسعار التاجر ومخزون لحظي</p>
      </div>
      <div className="oils-intro-drop" aria-hidden="true" />
    </div>
  );
};

export default OilsIntro;
