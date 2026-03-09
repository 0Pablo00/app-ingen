import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { Router } from '@angular/router';
import { PasswordModalComponent } from 'src/app/shared/components/password-modal/password-modal.component';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
})
export class AuthPage implements OnInit {

  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  })

  constructor(
    private router: Router,
    private firebaseSvc: FirebaseService,
    private utilsSvc: UtilsService,
    private modalCtrl: ModalController,
  ) { }

  ngOnInit() { }

  async submit() {
    if (this.form.valid) {
      
      console.log('1️⃣ Intentando login con:', this.form.value.email);
      
      // 👈 GUARDAR REFERENCIA DEL LOADING CON AWAIT
      const loading = await this.utilsSvc.presentLoading({ message: 'Autenticando...' });
      
      try {
        // PASO 1: Login en Firebase Auth
        const res = await this.firebaseSvc.login(this.form.value as User);
        console.log('2️⃣ Login exitoso en Firebase Auth:', res);
        console.log('3️⃣ UID del usuario:', res.user.uid);
        console.log('4️⃣ Email:', res.user.email);
        console.log('5️⃣ DisplayName:', res.user.displayName);
        
        // PASO 2: Obtener datos desde Firestore (incluye rol)
        console.log('6️⃣ Buscando documento en Firestore...');
        const userData = await this.firebaseSvc.getUserData(res.user.uid);
        console.log('7️⃣ Datos desde Firestore:', userData);
        
        // PASO 3: Crear objeto de usuario
        let user: User = {
          uid: res.user.uid,
          name: res.user.displayName || userData?.name || 'Usuario',
          email: res.user.email || '',
          role: userData?.role || 'operario'
        };
        
        console.log('8️⃣ Objeto user a guardar:', user);
        console.log('9️⃣ Rol asignado:', user.role);
        
        // PASO 4: Guardar en localStorage
        this.utilsSvc.setElementToLocalStorage('user', user);
        console.log('🔟 Usuario guardado en localStorage');
        
        // PASO 5: Verificar lo que se guardó
        const storedUser = this.utilsSvc.getElementFromLocalStorage('user');
        console.log('1️⃣1️⃣ Usuario en localStorage después de guardar:', storedUser);
        
        // 👈 DISMISS CON AWAIT (CUANDO TODO SALE BIEN)
        await loading.dismiss();
        
        // PASO 6: Redirigir
        await this.utilsSvc.routerLink('/tabs/menu');
        
        this.utilsSvc.presentToast({
          message: `Te damos la bienvenida ${user.name}`,
          duration: 1500,
          color: 'primary',
          icon: 'person-outline'
        });
        
        this.form.reset();
        
      } catch (error) {
        console.error('❌ Error en login:', error);
        
        // 👈 DISMISS CON AWAIT (TAMBIÉN EN ERROR)
        await loading.dismiss();
        
        this.utilsSvc.presentToast({
          message: error.message || 'Error al iniciar sesión',
          duration: 5000,
          color: 'warning',
          icon: 'alert-circle-outline'
        });
      }
    }
  }

  async checkPasswordAndRedirect() {
    const modal = await this.modalCtrl.create({
      component: PasswordModalComponent
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();

    if (data) {
      const { password } = data;
      const validPasswords = ['mfi0140'];

      if (validPasswords.includes(password)) {
        await this.router.navigate(['/sign-up']);
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
}