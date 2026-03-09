import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-add-electricistas',
  templateUrl: './add-electricistas.component.html',
  styleUrls: ['./add-electricistas.component.scss'],
})
export class AddElectricistasComponent {
  electricistaForm: FormGroup;

  constructor(private modalCtrl: ModalController, private fb: FormBuilder) {
    this.electricistaForm = this.fb.group({
      nombreGuardia: ['', Validators.required],
      nombreProximo: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.electricistaForm.valid) {
      const formData = this.electricistaForm.value;

      const electricista = {
        nombreGuardia: formData.nombreGuardia,
        nombreProximo: formData.nombreProximo
      };

      this.modalCtrl.dismiss({ electricista });
    }
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
