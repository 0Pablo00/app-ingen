import { Component } from '@angular/core';
import { UtilsService } from './services/utils.service';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { NotificationService } from './services/notification.service';
import { LocationTrackingService } from './services/location-tracking.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor(
    private utilsSvc: UtilsService,
    private notificationSvc: NotificationService,  // ← AGREGADO
  ) {
    this.initializeApp();
    this.showSplash();
  }

  async showSplash(){
    await SplashScreen.show({
      autoHide: true,
      showDuration: 3000
    });
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

    // 🔥 NUEVO: Inicializar notificaciones PWA
    setTimeout(() => {
      this.initNotifications();
    }, 5000);

    
  }

  // 🔥 NUEVO: Método para inicializar notificaciones
async initNotifications() {
  try {
    // Obtener el uid desde localStorage (donde se guarda el usuario)
    let userId = null;
    
    // Intentar obtener del objeto user
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        userId = user.uid;
      } catch(e) {
        console.log('Error parseando user:', e);
      }
    }
    
    // Si no, intentar con uid directo
    if (!userId) {
      userId = localStorage.getItem('uid');
    }
    
    if (userId) {
      console.log('🔄 Inicializando notificaciones para usuario:', userId);
      const token = await this.notificationSvc.requestPermissionAndGetToken(userId);
      if (token) {
        console.log('✅ Token FCM obtenido correctamente');
        this.notificationSvc.listenToMessages();
      } else {
        console.log('⚠️ No se pudo obtener token de notificaciones');
      }
    } else {
      console.log('⚠️ Usuario no autenticado, notificaciones no inicializadas');
    }
  } catch (error) {
    console.error('❌ Error al inicializar notificaciones:', error);
  }
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