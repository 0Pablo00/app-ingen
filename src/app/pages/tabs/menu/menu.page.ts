import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PasswordModalComponent } from 'src/app/shared/components/password-modal/password-modal.component';
import { UtilsService } from 'src/app/services/utils.service';
import { AuthService } from 'src/app/services/auth.service'; // 👈 IMPORTAR
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
})
export class MenuPage implements OnInit {

  constructor(
    private router: Router,
    private utilsSvc: UtilsService,
    private authSvc: AuthService, // 👈 INYECTAR
    private modalCtrl: ModalController,
  ) { }

  ngOnInit() { }

  // 👇 NUEVO: Verificar si es admin
  isAdmin(): boolean {
    return this.authSvc.isAdmin();
  }

  handleRefresh(event) {
    setTimeout(() => {
      event.target.complete();
    }, 2000);
  }

  goToGuardias() {
    this.router.navigate(['/tabs/guardias']);
  }

  goToObras() {
    this.router.navigate(['/tabs/home']);
  }

  // 👇 MODIFICADO: Aires con verificación de rol
  async checkPasswordAndGoToAires() {
    // Si es admin, acceso directo
    if (this.isAdmin()) {
      console.log('👑 Admin accediendo a Aires');
      this.router.navigate(['/tabs/aires']);
      return;
    }
    
    // Para operarios, mantener sistema de contraseñas temporal
    const modal = await this.modalCtrl.create({
      component: PasswordModalComponent
    });
  
    await modal.present();
  
    const { data } = await modal.onWillDismiss();
  
    if (data) {
      const { password } = data;
      const validPasswords = ['1234', 'aires_2024'];

      if (validPasswords.includes(password)) {
        this.router.navigate(['/tabs/aires']);
      } else {
        this.utilsSvc.presentToast({
          message: 'Contraseña incorrecta',
          color: 'warning',
          icon: 'alert-circle-outline',
          duration: 3000
        });
      }
    }
  }

  goToOrdenes() {
    this.router.navigate(['/tabs/ordenes']);
  }

  // 👇 MODIFICADO: Hys con verificación de rol
  async checkPasswordAndGoToHys() {
    // Si es admin, acceso directo
    if (this.isAdmin()) {
      console.log('👑 Admin accediendo a Hys');
      this.router.navigate(['/tabs/hys']);
      return;
    }
    
    // Para operarios, mantener sistema de contraseñas temporal
    const modal = await this.modalCtrl.create({
      component: PasswordModalComponent
    });
  
    await modal.present();
  
    const { data } = await modal.onWillDismiss();
  
    if (data && data.password === 'mfi0140') {
      this.router.navigate(['/tabs/hys']);
    } else {
      this.utilsSvc.presentToast({
        message: 'Contraseña incorrecta',
        color: 'warning',
        icon: 'alert-circle-outline',
        duration: 3000
      });
    }
  }
}