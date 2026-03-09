import { Component } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-add-guardias',
  templateUrl: './add-guardias.component.html',
  styleUrls: ['./add-guardias.component.scss'],
})
export class AddGuardiasComponent {
  guardiasForm: FormGroup;

  constructor(private fb: FormBuilder, private modalCtrl: ModalController) {
    this.guardiasForm = this.fb.group({
      nombre1: [''],
      nombre2: [''],
      fecha: [new Date().toISOString()],
    });
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  submitForm() {
    const operarios = this.guardiasForm.value;
    this.modalCtrl.dismiss({
      operarios: operarios,
    });
  }
}

