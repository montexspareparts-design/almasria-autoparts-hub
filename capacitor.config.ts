import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Production Capacitor configuration.
 *
 * NOTE: `server.url` is intentionally NOT set. The iOS app bundles the
 * built web assets from `dist/` locally (offline-capable shell). The
 * backend (Supabase, Paymob, WhatsApp, etc.) continues to run from its
 * existing production infrastructure via normal HTTPS calls.
 *
 * If a developer needs live-reload during local development against the
 * Lovable sandbox, they can temporarily add:
 *   server: { url: 'https://<sandbox>.lovableproject.com', cleartext: true }
 * but this MUST be removed before an App Store archive.
 */
const BRAND_NAVY = '#0A1A2F';
const CARBON_BG = '#0A0A0C';

const config: CapacitorConfig = {
  appId: 'com.almasria.autoparts',
  appName: 'ALMASRIA GROUP',
  webDir: 'dist',
  ios: {
    backgroundColor: BRAND_NAVY,
    contentInset: 'never',
    preferredContentMode: 'mobile',
    scheme: 'Al Masria Auto Parts',
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    backgroundColor: CARBON_BG,
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1400,
      launchAutoHide: true,
      backgroundColor: BRAND_NAVY,
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: CARBON_BG,
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
