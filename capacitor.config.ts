import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'tareas-mfi',
  webDir: 'www',
  plugins: {
    LiveUpdates: {
      appId: 'b05ebefd',      // ✅ Este debe ser tu App ID de Appflow
      channel: 'production',   // ✅ El canal debe coincidir
      autoUpdateMethod: 'auto', // ✅ Para actualización automática
      enabled: true            // ✅ Importante!
    }
  }
};

export default config;