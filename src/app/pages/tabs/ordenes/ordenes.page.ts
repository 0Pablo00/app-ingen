import { Component, OnInit } from '@angular/core';
import { AddOrdenesComponent } from 'src/app/shared/components/add-ordenes/add-ordenes.component';
import { Ordenes } from 'src/app/models/ordenes.model';

import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { ModalController } from '@ionic/angular';
import { Router } from '@angular/router';


@Component({
  selector: 'app-ordenes',
  templateUrl: './ordenes.page.html',
  styleUrls: ['./ordenes.page.scss'],
})
export class OrdenesPage implements OnInit {

  ordenes: Ordenes[] = [];
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

  async addOrUpdateTask(orden?: Ordenes) {
    let res = await this.utilsSvc.presentModal({
      component: AddOrdenesComponent,
      componentProps: { orden },
      cssClass: 'add-update-modal'
    });
    if (res && res.success) {
      this.getMaterial();
    }
  }

  async getMaterial() {
    let userUID = 'default'; // O usa el UID del usuario si está disponible
    let docPath = `userordenes/${userUID}`;
    let subcollectionName = 'ordenes'; // Subcolección dentro del documento
    this.loading = true;

    try {
      const ordenes = await this.firebaseSvc.getSubcollection(docPath, subcollectionName);
      this.ordenes = ordenes;
    } catch (error) {
      console.error('Error fetching materiales:', error);
      this.utilsSvc.presentToast({
        message: 'Error al obtener materiales',
        color: 'warning',
        icon: 'alert-circle-outline',
        duration: 5000
      });
    } finally {
      this.loading = false;
    }
  }



  async confirmDeleteTask(orden: Ordenes) {
    const alert = await this.utilsSvc.presentAlert({
      header: 'Eliminar tarea',
      message: '¿Quieres eliminar la tarea?',
      mode: 'ios',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        }, {
          text: 'Si, eliminar',
          handler: async () => {
            await this.deleteMaterial(orden);
          }
        }
      ]
    });
  }





 // ====== Eliminar Tarea ======
 async deleteMaterial(orden: Ordenes) {
  // Suponiendo que tienes el UID del usuario disponible en algún lugar
  let userUID = 'default'; // Cambia esto para usar el UID real del usuario si es necesario
  let path = `userordenes/${userUID}/ordenes/${orden.id}`;

  await this.utilsSvc.presentLoading();

  try {
    await this.firebaseSvc.deleteDocument(path);
    this.utilsSvc.presentToast({
      message: 'Tarea eliminada exitosamente',
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
