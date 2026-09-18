// Copies the built web app into the standalone "جركن" Android project.
// Usage: node scripts/sync-oils.mjs   (run AFTER `npm run build`)
import { cpSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");
const assets = resolve(root, "android-oils/app/src/main/assets/public");
const assetsDir = resolve(root, "android-oils/app/src/main/assets");

if (!existsSync(dist)) {
  console.error("dist/ not found — run `npm run build` first.");
  process.exit(1);
}

rmSync(assets, { recursive: true, force: true });
cpSync(dist, assets, { recursive: true });

const config = {
  appId: "com.almasria.oils",
  appName: "جركن",
  webDir: "dist",
  ios: {
    backgroundColor: "#FFFFFF",
    contentInset: "never",
    preferredContentMode: "mobile",
    scheme: "Jarkan Oils",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    backgroundColor: "#FFFFFF",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#FFFFFF",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#FFFFFF",
      overlaysWebView: false,
    },
    Keyboard: {
      resize: "native",
      resizeOnFullScreen: true,
    },
  },
};

writeFileSync(resolve(assetsDir, "capacitor.config.json"), JSON.stringify(config, null, "\t") + "\n");
console.log("✔ جركن: dist copied to android-oils + capacitor.config.json written");
