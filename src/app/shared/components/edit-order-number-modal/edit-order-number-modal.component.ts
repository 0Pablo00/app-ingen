import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-edit-order-number-modal',
  template: `
    <ion-header>
      <ion-toolbar color="warning">
        <ion-title>Editar Número de Orden</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <form [formGroup]="form">
        <ion-item>
          <ion-label position="stacked">Número de orden actual</ion-label>
          <ion-input 
            type="number" 
            formControlName="orderNumber"
            placeholder="Ej: 85">
          </ion-input>
        </ion-item>
        
        <div class="ion-padding-vertical">
          <p class="ion-text-wrap" style="color: var(--ion-color-medium); font-size: 0.9rem;">
            <ion-icon name="information-circle-outline"></ion-icon>
            Cambia este número para corregir duplicados. Debe ser un número único.
          </p>
        </div>

        <div class="ion-padding">
          <ion-button 
            expand="block" 
            (click)="save()" 
            [disabled]="!form.valid"
            color="warning">
            <ion-icon slot="start" name="save-outline"></ion-icon>
            Guardar Cambios
          </ion-button>
        </div>
      </form>
    </ion-content>
  `,
  styles: [`
    ion-content {
      --background: var(--ion-color-light);
    }
  `]
})
export class EditOrderNumberModalComponent implements OnInit {
  @Input() task: any;
  
  form = new FormGroup({
    orderNumber: new FormControl('', [Validators.required, Validators.min(1)])
  });

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    if (this.task) {
      this.form.patchValue({
        orderNumber: this.task.orderNumber || ''
      });
    }
  }

  save() {
    if (this.form.valid) {
      this.modalCtrl.dismiss({
        orderNumber: this.form.value.orderNumber
      });
    }
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}