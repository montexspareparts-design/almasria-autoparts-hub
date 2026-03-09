import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.351088b163e6468aa6c4d76c390fdd77',
  appName: 'المصرية جروب',
  webDir: 'dist',
  server: {
    url: 'https://351088b1-63e6-468a-a6c4-d76c390fdd77.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    backgroundColor: '#1E293B',
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'المصرية جروب',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1E293B',
      showSpinner: true,
      spinnerColor: '#DC2626',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
