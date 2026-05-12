import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  android: {
  useLegacyBridge: true
},
  appName: 'Ingen',
  webDir: 'www',
  plugins: {
    LiveUpdates: {
      appId: 'b05ebefd',
      channel: 'production',
      autoUpdateMethod: 'background', // Cambiado de 'auto' a 'background'
      enabled: true
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#ffffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#999999",
      splashFullScreen: false,
      splashImmersive: false,
      layoutName: "launch_screen",
      useDialog: true,
    },
  }
};

export default config;