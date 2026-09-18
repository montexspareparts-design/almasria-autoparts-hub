import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for the STANDALONE oils app (تطبيق «المصرية زيوت جملة»).
 *
 * This is a SEPARATE app published next to the main parts app:
 *   - Main app : com.almasria.autoparts  (android/ — capacitor.config.ts)
 *   - Oils app : com.almasria.oils       (android-oils/ — this file)
 *
 * Build the android project for this app with:
 *   npx cap sync android-oils --config capacitor.oils.config.ts   (not needed; project is pre-generated)
 *   cd android-oils && gradlew.bat bundleRelease
 */
const OILS_WHITE = '#FFFFFF';
const OILS_CARBON = '#0A0A0C';

const config: CapacitorConfig = {
  appId: 'com.almasria.oils',
  appName: 'المصرية زيوت جملة',
  webDir: 'dist',
  ios: {
    backgroundColor: OILS_WHITE,
    contentInset: 'never',
    preferredContentMode: 'mobile',
    scheme: 'Jarkan Oils',
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    backgroundColor: OILS_WHITE,
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: OILS_WHITE,
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: OILS_WHITE,
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
