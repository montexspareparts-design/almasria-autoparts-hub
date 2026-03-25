import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Remove splash screen as soon as React app mounts
const removeSplash = () => {
  const splash = document.getElementById("splash-screen");
  if (splash) {
    splash.style.opacity = "0";
    setTimeout(() => splash.remove(), 300);
  }
};

createRoot(document.getElementById("root")!).render(<App />);
// Remove splash immediately after first render commit
requestAnimationFrame(removeSplash);
