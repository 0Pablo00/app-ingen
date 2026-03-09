import { Component, OnInit } from '@angular/core';
import { MaterialComponent } from 'src/app/shared/components/material/material.component';
import { Material } from 'src/app/models/material.model';

import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { ModalController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-aires',
  templateUrl: './aires.page.html',
  styleUrls: ['./aires.page.scss'],
})
export class AiresPage implements OnInit {
  materiales: Material[] = [];
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

  async addOrUpdateTask(material?: Material) {
    let res = await this.utilsSvc.presentModal({
      component: MaterialComponent,
      componentProps: { material },
      cssClass: 'add-update-modal'
    });
    if (res && res.success) {
      this.getMaterial();
    }
  }

  async getMaterial() {
    let userUID = 'default'; // O usa el UID del usuario si está disponible
    let docPath = `useraires/${userUID}`;
    let subcollectionName = 'materiales'; // Subcolección dentro del documento
    this.loading = true;

    try {
      const materiales = await this.firebaseSvc.getSubcollection(docPath, subcollectionName);
      this.materiales = materiales;
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



  async confirmDeleteTask(material: Material) {
    const alert = await this.utilsSvc.presentAlert({
      header: 'Eliminar Pedido',
      message: '¿Quieres eliminar el pedido?',
      mode: 'ios',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        }, {
          text: 'Si, eliminar',
          handler: async () => {
            await this.deleteMaterial(material);
          }
        }
      ]
    });
  }





 // ====== Eliminar Tarea ======
 async deleteMaterial(material: Material) {
  // Suponiendo que tienes el UID del usuario disponible en algún lugar
  let userUID = 'default'; // Cambia esto para usar el UID real del usuario si es necesario
  let path = `useraires/${userUID}/materiales/${material.id}`;

  await this.utilsSvc.presentLoading();

  try {
    await this.firebaseSvc.deleteDocument(path);
    this.utilsSvc.presentToast({
      message: 'Material eliminado exitosamente',
      color: 'success',
      icon: 'checkmark-circle-outline',
      duration: 1500
    });
    this.getMaterial(); // Vuelve a cargar los materiales después de la eliminación
  } catch (error) {
    this.utilsSvc.presentToast({
      message: error.message || 'Error al eliminar el material',
      color: 'warning',
      icon: 'alert-circle-outline',
      duration: 5000
    });
  } finally {
    this.utilsSvc.dismissLoading();
  }
}


}
