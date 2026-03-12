import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'tareas-mfi',
  webDir: 'www',
  plugins: {
    LiveUpdates: {
      appId: 'b05ebefd',
      channel: 'production',
      autoUpdateMethod: 'background', // Cambiado de 'auto' a 'background'
      enabled: true
    }
  }
};

export default config;