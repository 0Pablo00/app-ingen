import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AddGuardiasComponent } from 'src/app/shared/components/add-guardias/add-guardias.component';
import { FirebaseService } from 'src/app/services/firebase.service';
import { PasswordModalComponent } from 'src/app/shared/components/password-modal/password-modal.component';
import { UtilsService } from 'src/app/services/utils.service';
import { AddElectricistasComponent } from 'src/app/shared/components/add-electricistas/add-electricistas.component';

@Component({
  selector: 'app-guardias',
  templateUrl: './guardias.page.html',
  styleUrls: ['./guardias.page.scss'],
})
export class GuardiasPage implements OnInit {
  operarios: { nombre1: string; nombre2: string; fecha: string } = { nombre1: '', nombre2: '', fecha: new Date().toISOString() };
  additionalOperarios: { nombre1: string; nombre2: string; fecha: string }[] = [];
  electricistaGuardiaActual: string = '';
  electricistaGuardiaProximo: string = '';

  constructor(
    private modalCtrl: ModalController,
    private firebaseSvc: FirebaseService,
    private utilsSvc: UtilsService,
  ) {}

  ngOnInit() {
    console.log('ngOnInit: Cargando datos...');
    this.loadOperarios();
    this.loadAdditionalOperarios();
    this.loadElectricistaGuardias();
  }

///// FUNCION para AGREGAR GUARDIA DEL DIA sabado

async checkPasswordAndOpenAddGuardiasModal() {
  const modal = await this.modalCtrl.create({
    component: PasswordModalComponent
  });

  await modal.present();

  const { data } = await modal.onWillDismiss();

  if (data && data.password === 'mfi0140') { // Reemplaza 'mfi0140' con la contraseña correcta
    await this.openAddGuardiasModal();
  } else {
    this.utilsSvc.presentToast({
      message: 'Contraseña incorrecta',
      color: 'warning',
      icon: 'alert-circle-outline',
      duration: 3000
    });
  }
}


  async openAddGuardiasModal() {
    const modal = await this.modalCtrl.create({
      component: AddGuardiasComponent,
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data) {
      this.operarios = data.operarios;
      await this.saveOperarios();
    }
  }
///// FUNCION para AGREGAR GUARDIA DEL DIA DOMINGO

async checkPasswordAndOpenAddMoreGuardiasModal() {
  const modal = await this.modalCtrl.create({
    component: PasswordModalComponent
  });

  await modal.present();

  const { data } = await modal.onWillDismiss();

  if (data && data.password === 'mfi0140') { // Reemplaza 'mfi0140' con la contraseña correcta
    await this.openAddMoreGuardiasModal();
  } else {
    this.utilsSvc.presentToast({
      message: 'Contraseña incorrecta',
      color: 'warning',
      icon: 'alert-circle-outline',
      duration: 3000
    });
  }
}



  async openAddMoreGuardiasModal() {
    const modal = await this.modalCtrl.create({
      component: AddGuardiasComponent,
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data) {
      this.additionalOperarios.push(data.operarios);
      await this.saveAdditionalOperarios();
    }
  }

  async loadOperarios() {
    try {
      console.log('Cargando operarios...');
      const doc: any = await this.firebaseSvc.getDocument('guardias', 'currentGuardia');
      console.log('Operarios cargados:', doc); // Agrega un log aquí
      if (doc && doc.nombre1 && doc.nombre2 && doc.fecha) {
        this.operarios = doc;
      }
    } catch (error) {
      console.error('Error loading operarios from Firebase:', error);
    }
  }

  async saveOperarios() {
    try {
      await this.firebaseSvc.setDocument('guardias', 'currentGuardia', this.operarios);
      console.log('Guardias guardadas correctamente en Firebase');
    } catch (error) {
      console.error('Error guardando operarios en Firebase:', error);
    }
  }

  async loadAdditionalOperarios() {
    try {
      console.log('Cargando operarios adicionales...');
      const doc: any = await this.firebaseSvc.getDocument('guardias', 'additionalGuardias');
      console.log('Operarios adicionales cargados:', doc); // Agrega un log aquí
      if (doc && Array.isArray(doc.operarios)) {
        this.additionalOperarios = doc.operarios;
      }
    } catch (error) {
      console.error('Error loading additional operarios:', error);
    }
  }

  async saveAdditionalOperarios() {
    try {
      await this.firebaseSvc.setDocument('guardias', 'additionalGuardias', { operarios: this.additionalOperarios });
      console.log('Additional operarios guardados correctamente en Firebase');
    } catch (error) {
      console.error('Error guardando additional operarios en Firebase:', error);
    }
  }

  async checkPasswordAndConfirmDelete(index: number) {
    const modal = await this.modalCtrl.create({
      component: PasswordModalComponent
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();

    if (data && data.password === 'mfi0140') { // Reemplaza 'pablo' con la contraseña correcta
      await this.removeOperario(index);
    } else {
      this.utilsSvc.presentToast({
        message: 'Contraseña incorrecta',
        color: 'warning',
        icon: 'alert-circle-outline',
        duration: 3000
      });
    }
  }

  async removeOperario(index: number) {
    this.additionalOperarios.splice(index, 1);
    await this.saveAdditionalOperarios();
  }

// //////Funcion para agregar un electricista de guardia


async checkPasswordAndOpenAddElectricistasModal() {
  const modal = await this.modalCtrl.create({
    component: PasswordModalComponent
  });

  await modal.present();

  const { data } = await modal.onWillDismiss();

  if (data && data.password === 'mfi0140') { // Reemplaza 'mfi0140' con la contraseña correcta
    await this.openAddElectricistasModal();
  } else {
    this.utilsSvc.presentToast({
      message: 'Contraseña incorrecta',
      color: 'warning',
      icon: 'alert-circle-outline',
      duration: 3000
    });
  }
}



  async openAddElectricistasModal() {
    const modal = await this.modalCtrl.create({
      component: AddElectricistasComponent
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data && data.electricista) {
      this.electricistaGuardiaActual = data.electricista.nombreGuardia;
      this.electricistaGuardiaProximo = data.electricista.nombreProximo;

      // Guarda los datos en Firebase o actualiza la UI según sea necesario
      await this.saveElectricistaGuardias({
        nombreGuardia: this.electricistaGuardiaActual,
        nombreProximo: this.electricistaGuardiaProximo
      });
    }
  }

  async loadElectricistaGuardias() {
    try {
      console.log('Cargando guardias de electricistas...');
      const doc: any = await this.firebaseSvc.getElectricistaGuardias();
      console.log('Electricista guardias cargados:', doc); // Agrega un log aquí
      if (doc) {
        this.electricistaGuardiaActual = doc.nombreGuardia || '';
        this.electricistaGuardiaProximo = doc.nombreProximo || '';
      }
    } catch (error) {
      console.error('Error loading electricista guardias:', error);
    }
  }

  async saveElectricistaGuardias(data: { nombreGuardia: string; nombreProximo: string }) {
    try {
      await this.firebaseSvc.setElectricistaGuardias(data);
      console.log('Electricista guardias guardados correctamente en Firebase');
    } catch (error) {
      console.error('Error guardando electricista guardias:', error);
    }
  }


/////// FUNCIO QUE ELIMINA UN ELECTRICISTA

async checkPasswordAndDeleteElectricistaGuardias() {
  const modal = await this.modalCtrl.create({
    component: PasswordModalComponent
  });

  await modal.present();

  const { data } = await modal.onWillDismiss();

  if (data && data.password === 'mfi0140') { // Reemplaza 'mfi0140' con la contraseña correcta
    await this.deleteElectricistaGuardias();
  } else {
    this.utilsSvc.presentToast({
      message: 'Contraseña incorrecta',
      color: 'warning',
      icon: 'alert-circle-outline',
      duration: 3000
    });
  }
}



  async deleteElectricistaGuardias() {
    try {
      await this.firebaseSvc.deleteElectricistaGuardias();
      console.log('Electricista guardias eliminados correctamente');
      this.electricistaGuardiaActual = '';
      this.electricistaGuardiaProximo = '';
    } catch (error) {
      console.error('Error deleting electricista guardias:', error);
    }
  }
}
