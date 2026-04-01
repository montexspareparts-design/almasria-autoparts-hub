import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupLazyImportRecovery } from "@/lib/lazyImportRecovery";

// Remove splash screen as soon as React app mounts
const removeSplash = () => {
  const splash = document.getElementById("splash-screen");
  if (splash) {
    splash.style.opacity = "0";
    setTimeout(() => splash.remove(), 300);
  }
};

const disposeLazyImportRecovery = setupLazyImportRecovery();

createRoot(document.getElementById("root")!).render(<App />);
// Remove splash immediately after first render commit
requestAnimationFrame(removeSplash);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeLazyImportRecovery?.();
  });
}

