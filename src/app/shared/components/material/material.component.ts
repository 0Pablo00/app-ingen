import { Component, OnInit, Input } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ItemReorderEventDetail } from '@ionic/angular';
import { ItemMaterial, Material } from 'src/app/models/material.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { UserAires } from 'src/app/models/userAires.model';

@Component({
  selector: 'app-material',
  templateUrl: './material.component.html',
  styleUrls: ['./material.component.scss'],
})
export class MaterialComponent implements OnInit {
  @Input() material: Material;
  userAires: UserAires | null = null; // Se mantiene para depuración, pero no se usa en la lógica

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
    this.userAires = this.utilsSvc.getElementFromLocalStorage('userAires');
    console.log('userAires in ngOnInit:', this.userAires); // Mensaje de depuración
    if (this.material) {
      this.form.setValue(this.material);
      this.form.updateValueAndValidity();
    }
  }

  submit() {
    if (this.form.valid) {
      if (this.material) {
        this.updateTask();
      } else {
        this.createTask();
      }
    }
  }

  createTask() {
    // Eliminamos la validación de userAires
    let path = `useraires/default`; // Utilizamos un valor predeterminado o la ruta que desees
    this.utilsSvc.presentLoading();
    delete this.form.value.id;

    this.firebaseSvc.addSubcollection(path, 'materiales', this.form.value).then(res => {
      this.utilsSvc.dismissModal({ success: true });
      this.utilsSvc.presentToast({
        message: 'Pedido creado exitosamente',
        color: 'success',
        icon: 'checkmark-circle-outline',
        duration: 1500
      });
      this.utilsSvc.dismissLoading();
    }).catch(error => {
      this.utilsSvc.presentToast({
        message: error.message || 'Error al crear Pedido',
        color: 'warning',
        icon: 'alert-circle-outline',
        duration: 5000
      });
      this.utilsSvc.dismissLoading();
    });
  }

  updateTask() {
    // Eliminamos la validación de userAires
    let path = `useraires/default/materiales/${this.material.id}`; // Utilizamos un valor predeterminado o la ruta que desees
    this.utilsSvc.presentLoading();
    delete this.form.value.id;

    this.firebaseSvc.updateDocument(path, this.form.value).then(res => {
      this.utilsSvc.dismissModal({ success: true });
      this.utilsSvc.presentToast({
        message: 'Pedido actualizado exitosamente',
        color: 'success',
        icon: 'checkmark-circle-outline',
        duration: 1500
      });
      this.utilsSvc.dismissLoading();
    }).catch(error => {
      this.utilsSvc.presentToast({
        message: error.message || 'Error al actualizar pedido',
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
      header: 'Material :',
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
            let item: ItemMaterial = { name: res.name, completed: false };
            let currentItems = this.form.value.items;
            this.form.value.items.push(item);
            this.form.controls.items.setValue(currentItems);
            this.form.controls.items.updateValueAndValidity();
          }
        }
      ]
    });
  }
}
