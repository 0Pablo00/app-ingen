import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PasswordModalComponent } from 'src/app/shared/components/password-modal/password-modal.component';
import { UtilsService } from 'src/app/services/utils.service';
import { AuthService } from 'src/app/services/auth.service'; // 👈 IMPORTAR
import { Router } from '@angular/router';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss']
})
export class TabsPage {
  
  // Control para evitar múltiples modales
  private isModalOpen = false;

  constructor(
    private modalCtrl: ModalController,
    private utilsSvc: UtilsService,
    private authSvc: AuthService, // 👈 INYECTAR
    private router: Router
  ) {}

  // 👇 NUEVO: Verificar si es admin
  isAdmin(): boolean {
    return this.authSvc.isAdmin();
  }

  async checkPasswordForFinalizadas(event: any) {
    // Prevenir la navegación automática
    event.preventDefault();
    
    // 👇 VERIFICAR PRIMERO SI ES ADMIN
    if (this.isAdmin()) {
      console.log('👑 Admin detectado, acceso directo a finalizadas');
      this.router.navigate(['/tabs/finalizadas']);
      return;
    }
    
    // Si no es admin, mostrar mensaje de permisos
    this.utilsSvc.presentToast({
      message: 'No tienes permisos para acceder a esta sección',
      color: 'warning',
      icon: 'alert-circle-outline',
      duration: 3000
    });
    
   
  }
}