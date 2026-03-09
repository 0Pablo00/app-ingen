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
    
    // OPCIÓN: Si quieres mantener el sistema de contraseñas TEMPORALMENTE
    // descomenta el código de abajo y comenta el toast de arriba
    
    /*
    // Evitar abrir múltiples modales
    if (this.isModalOpen) return;
    
    this.isModalOpen = true;
    
    const modal = await this.modalCtrl.create({
      component: PasswordModalComponent
    });
  
    await modal.present();
  
    const { data } = await modal.onWillDismiss();
    this.isModalOpen = false;
  
    if (data) {
      const { password } = data;
      const validPasswords = ['1234', 'servicios2024', 'operario_2024'];
  
      if (validPasswords.includes(password)) {
        this.router.navigate(['/tabs/finalizadas']);
      } else {
        this.utilsSvc.presentToast({
          message: 'Contraseña incorrecta',
          color: 'warning',
          icon: 'alert-circle-outline',
          duration: 3000
        });
      }
    }
    */
  }
}