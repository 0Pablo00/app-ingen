import { Component, OnInit, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Insumo } from 'src/app/models/insumo.model';

@Component({
  selector: 'app-add-insumo-modal',
  templateUrl: './add-insumo-modal.component.html',
  styleUrls: ['./add-insumo-modal.component.scss'],
})
export class AddInsumoModalComponent implements OnInit {
  @Input() insumo?: Insumo;  // Si se recibe, es modo edición

  form = new FormGroup({
    nombre: new FormControl('', Validators.required),
    cantidad: new FormControl(0),
    unidad: new FormControl('unidad', Validators.required),
    observacion: new FormControl('')
  });

  unidades = [
    'unidad', 'unidades', 'metro', 'metros', 'kilogramo', 'kilogramos',
    'litro', 'litros', 'caja', 'cajas', 'paquete', 'paquetes',
    'bolsa', 'bolsas', 'metro cuadrado', 'metros cuadrados',
    'hora', 'horas', 'día', 'días'
  ];

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    if (this.insumo) {
      this.form.patchValue({
        nombre: this.insumo.nombre,
        cantidad: this.insumo.cantidad,
        unidad: this.insumo.unidad,
        observacion: this.insumo.observacion || ''
      });
    }
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  guardar() {
    if (this.form.valid) {
      this.modalCtrl.dismiss(this.form.value);
    }
  }
}