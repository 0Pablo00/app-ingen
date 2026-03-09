import { Component, OnInit } from '@angular/core';
import { AddHysComponent } from 'src/app/shared/components/add-hys/add-hys.component';
import { HysOrdenes } from 'src/app/models/hys.model';

import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { ModalController } from '@ionic/angular';
import { Router } from '@angular/router';


@Component({
  selector: 'app-hys',
  templateUrl: './hys.page.html',
  styleUrls: ['./hys.page.scss'],
})
export class HysPage implements OnInit {

  higienes: HysOrdenes[] = [];
  loading: boolean = false;

  constructor(
    private firebaseSvc: FirebaseService,
    private utilsSvc: UtilsService,
    private modalCtrl: ModalController,
    private router: Router
  ) { }

  ngOnInit() {}

  ionViewWillEnter() {
    this.getMaterial();
  }

  async addOrUpdateTask(higiene?: HysOrdenes) {
    let res = await this.utilsSvc.presentModal({
      component: AddHysComponent,
      componentProps: { higiene },
      cssClass: 'add-update-modal'
    });
    if (res && res.success) {
      this.getMaterial();
    }
  }

  async getMaterial() {
    let userUID = 'default'; // O usa el UID del usuario si está disponible
    let docPath = `userhigienes/${userUID}`;
    let subcollectionName = 'higienes'; // Subcolección dentro del documento
    this.loading = true;

    try {
      const higienes = await this.firebaseSvc.getSubcollection(docPath, subcollectionName);
      this.higienes = higienes;
    } catch (error) {
      console.error('Error fetching higienes:', error);
      this.utilsSvc.presentToast({
        message: 'Error al obtener elementos',
        color: 'warning',
        icon: 'alert-circle-outline',
        duration: 5000
      });
    } finally {
      this.loading = false;
    }
  }



  async confirmDeleteTask(higiene: HysOrdenes) {
    const alert = await this.utilsSvc.presentAlert({
      header: 'Eliminar recordatorio',
      message: '¿Quieres eliminar el recordatorio?',
      mode: 'ios',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        }, {
          text: 'Si, eliminar',
          handler: async () => {
            await this.deleteMaterial(higiene);
          }
        }
      ]
    });
  }





 // ====== Eliminar Tarea ======
 async deleteMaterial(higiene: HysOrdenes) {
  // Suponiendo que tienes el UID del usuario disponible en algún lugar
  let userUID = 'default'; // Cambia esto para usar el UID real del usuario si es necesario
  let path = `userhigienes/${userUID}/higienes/${higiene.id}`;

  await this.utilsSvc.presentLoading();

  try {
    await this.firebaseSvc.deleteDocument(path);
    this.utilsSvc.presentToast({
      message: 'Recordatorio eliminado exitosamente',
      color: 'success',
      icon: 'checkmark-circle-outline',
      duration: 1500
    });
    this.getMaterial(); // Vuelve a cargar los materiales después de la eliminación
  } catch (error) {
    this.utilsSvc.presentToast({
      message: error.message || 'Error al eliminar el tarea',
      color: 'warning',
      icon: 'alert-circle-outline',
      duration: 5000
    });
  } finally {
    this.utilsSvc.dismissLoading();
  }
}


}

