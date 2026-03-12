import { Component } from '@angular/core';
import { UtilsService } from './services/utils.service';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor(private utilsSvc: UtilsService) {
    this.initializeApp();
  }

  async initializeApp() {
    // Manejo global de errores no capturados
    window.addEventListener('unhandledrejection', (event) => {
      console.error('❌ Error no manejado:', event.reason);
      
      if (event.reason?.code === 'permission-denied') {
        this.utilsSvc.presentToast({
          message: 'Error de permisos. Por favor inicia sesión nuevamente.',
          color: 'danger',
          duration: 4000
        });
      } else if (event.reason?.code === 'unauthenticated') {
        this.utilsSvc.presentToast({
          message: 'Sesión expirada. Por favor inicia sesión nuevamente.',
          color: 'warning',
          duration: 4000
        });
      }
    });

    window.addEventListener('offline', () => {
      this.utilsSvc.presentToast({
        message: 'Sin conexión a internet. Algunas funciones pueden no estar disponibles.',
        color: 'warning',
        duration: 3000
      });
    });

    window.addEventListener('online', () => {
      this.utilsSvc.presentToast({
        message: 'Conexión restablecida.',
        color: 'success',
        duration: 2000
      });
    });

    // Esperar a que la app esté completamente cargada
    setTimeout(() => {
      this.checkForUpdates();
    }, 3000);
  }

  async checkForUpdates() {
    try {
      console.log('🔄 Verificando actualizaciones...');
      
      // MÉTODO 1: Usar Capacitor.Plugins (el más confiable)
      try {
        const plugins = (Capacitor as any).getPlugin('LiveUpdates') || 
                        (Capacitor as any).Plugins?.LiveUpdates;
        
        if (plugins) {
          console.log('✅ Plugin encontrado en Capacitor');
          const result = await plugins.sync();
          console.log('✅ Resultado:', result);
          
          if (result?.updated) {
            this.utilsSvc.presentToast({
              message: 'Actualización descargada. Reinicia la app.',
              color: 'success',
              duration: 4000
            });
          }
          return;
        }
      } catch (e) {
        console.log('Método 1 falló:', e);
      }
      
      // MÉTODO 2: Import dinámico con el nombre correcto
      try {
        const module = await import('@capacitor/live-updates');
        // En v0.2.0, el export es 'LiveUpdate' (singular)
        const LiveUpdate = (module as any).LiveUpdate || module;
        
        if (LiveUpdate && typeof LiveUpdate.sync === 'function') {
          console.log('✅ Plugin encontrado vía import dinámico');
          const result = await LiveUpdate.sync();
          console.log('✅ Resultado:', result);
          return;
        }
      } catch (e) {
        console.log('Método 2 falló:', e);
      }
      
      // MÉTODO 3: Buscar en window
      try {
        // Buscar posibles nombres del plugin
        const posiblesNombres = ['LiveUpdates', 'LiveUpdate', 'CapacitorLiveUpdates'];
        
        for (const nombre of posiblesNombres) {
          const plugin = (window as any)[nombre];
          if (plugin && typeof plugin?.sync === 'function') {
            console.log(`✅ Plugin encontrado en window.${nombre}`);
            const result = await plugin.sync();
            console.log('✅ Resultado:', result);
            return;
          }
        }
      } catch (e) {
        console.log('Método 3 falló:', e);
      }
      
      console.log('⚠️ No se pudo encontrar el plugin LiveUpdate');
      
    } catch (error) {
      console.error('❌ Error general:', error);
    }
  }
}