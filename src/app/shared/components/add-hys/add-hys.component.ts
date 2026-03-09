import { Component, OnInit, Input } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ItemReorderEventDetail } from '@ionic/angular';
import { ItemHys, HysOrdenes } from 'src/app/models/hys.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { UserHys } from 'src/app/models/userHys.model';


@Component({
  selector: 'app-add-hys',
  templateUrl: './add-hys.component.html',
  styleUrls: ['./add-hys.component.scss'],
})
export class AddHysComponent  implements OnInit {

  @Input() higiene: HysOrdenes;
  userHys:  UserHys | null = null; // Se mantiene para depuración, pero no se usa en la lógica

  form = new FormGroup({
    id: new FormControl(''),
    title: new FormControl('', [Validators.required, Validators.minLength(4)]),
    description: new FormControl('', []),
    items: new FormControl([], [Validators.required, Validators.minLength(1)]),
  });

  constructor(
    private firebaseSvc: FirebaseService,
    private utilsSvc: UtilsService
  ) { }

  ngOnInit() {
    this.userHys = this.utilsSvc.getElementFromLocalStorage('userAires');
    console.log('userAires in ngOnInit:', this.userHys); // Mensaje de depuración
    if (this.higiene) {
      this.form.setValue(this.higiene);
      this.form.updateValueAndValidity();
    }
  }

  submit() {
    if (this.form.valid) {
      if (this.higiene) {
        this.updateTask();
      } else {
        this.createTask();
      }
    }
  }

  createTask() {
    // Eliminamos la validación de userAires
    let path = `userhigienes/default`; // Utilizamos un valor predeterminado o la ruta que desees
    this.utilsSvc.presentLoading();
    delete this.form.value.id;

    this.firebaseSvc.addSubcollection(path, 'higienes', this.form.value).then(res => {
      this.utilsSvc.dismissModal({ success: true });
      this.utilsSvc.presentToast({
        message: 'Recordatorio creado exitosamente',
        color: 'success',
        icon: 'checkmark-circle-outline',
        duration: 1500
      });
      this.utilsSvc.dismissLoading();
    }).catch(error => {
      this.utilsSvc.presentToast({
        message: error.message || 'Error al crear recordatorio',
        color: 'warning',
        icon: 'alert-circle-outline',
        duration: 5000
      });
      this.utilsSvc.dismissLoading();
    });
  }

  updateTask() {
    // Eliminamos la validación de userAires
    let path = `userhigienes/default/higienes/${this.higiene.id}`; // Utilizamos un valor predeterminado o la ruta que desees
    this.utilsSvc.presentLoading();
    delete this.form.value.id;

    this.firebaseSvc.updateDocument(path, this.form.value).then(res => {
      this.utilsSvc.dismissModal({ success: true });
      this.utilsSvc.presentToast({
        message: 'Tarea actualizada exitosamente',
        color: 'success',
        icon: 'checkmark-circle-outline',
        duration: 1500
      });
      this.utilsSvc.dismissLoading();
    }).catch(error => {
      this.utilsSvc.presentToast({
        message: error.message || 'Error al actualizar tarea',
        color: 'warning',
        icon: 'alert-circle-outline',
        duration: 5000
      });
      this.utilsSvc.dismissLoading();
    });
  }

  handleReorder(ev: CustomEvent<ItemReorderEventDetail>) {
    this.form.value.items = ev.detail.complete(this.form.value.items);
    this.form.updateValueAndValidity();
  }

  removeItem(index: number) {
    this.form.value.items.splice(index, 1);
    this.form.controls.items.updateValueAndValidity();
  }

  createItem() {
    this.utilsSvc.presentAlert({
      header: 'Ingresar :',
      backdropDismiss: false,
      inputs: [
        {
          name: 'name',
          type: 'textarea',
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Agregar',
          handler: (res) => {
            let item: ItemHys = { name: res.name, completed: false };
            let currentItems = this.form.value.items;
            currentItems.push(item);
            this.form.controls.items.setValue(currentItems);
            this.form.controls.items.updateValueAndValidity();
          }
        }
      ]
    });
  }

}
