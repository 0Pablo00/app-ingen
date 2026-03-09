import { Component } from '@angular/core';
import { UtilsService } from './services/utils.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor(private utilsSvc: UtilsService) {
    this.initializeApp();
  }

  initializeApp() {
    // Manejo global de errores no capturados
    window.addEventListener('unhandledrejection', (event) => {
      console.error('❌ Error no manejado:', event.reason);
      
      // Mostrar toast solo para errores específicos
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

    // Manejo de errores de red
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
  }
}