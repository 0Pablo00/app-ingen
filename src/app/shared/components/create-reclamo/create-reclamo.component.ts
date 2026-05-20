import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { FirebaseService } from 'src/app/services/firebase.service';
import { Reclamo } from 'src/app/models/reclamo.model';
import { UtilsService } from 'src/app/services/utils.service';  // 🔥 NUEVO

@Component({
  selector: 'app-create-reclamo',
  templateUrl: './create-reclamo.component.html',
  styleUrls: ['./create-reclamo.component.scss'],
})
export class CreateReclamoComponent implements OnInit {
  @Input() reclamo: Reclamo | null = null;

  provinciasData = [
    {
      provincia: 'Mendoza',
      sucursales: [
        'ALGARROBAL', 'AMIGORENA', 'AVELLANEDA', 'BARRIALES', 'BELTRAN',
        'BUENA NUEVA', 'CANO', 'CAPILLA DEL ROSARIO', 'CARRODILLA', 'CASTELLI',
        'CATITAS', 'CENTRAL', 'CERVANTES', 'COLONIA', 'CORRALITO',
        'CORREA SAA', 'COSTA DE ARAUJO', 'COVIMET', 'DON BOSCO', 'DOVIR',
        'EL BOSQUE', 'EL CISNE', 'EL PIDIO', 'ESTACION', 'ESTANZUELA',
        'FAUSTINO', 'FRIMI 2', 'GIOL', 'GUTEMBERG', 'INDEPENDENCIA',
        'JARDIN SERRANO', 'JUAN B JUSTO', 'JUNIN', 'LA COLONIA', 'LAVALLE', 'LUJAN',
        'LUZURIAGA', 'MARINI', 'MARTIN FIERRO', 'MOYANO', 'NUEVO DORREGO',
        'OLASCOAGA', 'PADDLE', 'PADRE LLORENS', 'PALMIRA', 'PEDRIEL',
        'PEDRO MOLINA', 'PERITO MORENO', 'PERU', 'RAIZ', 'RIVADAVIA 2',
        'RIVADAVIA 3', 'RODEO DEL MEDIO', 'ROTONDA', 'SAN MIGUEL', 'SANTA ANA',
        'SOMECA', 'SPORTMAN', 'TERMINAL', 'TROME', 'TROPERO SOSA',
        'TULUMAYA', 'UNIMED', 'VISTALBA'
      ]
    },
    {
      provincia: 'San Juan',
      sucursales: [
        'CAUCETE', 'CHIMBAS', 'CONCEPCION', 'GRANADEROS', 'LA ROSA',
        'MEDIA AGUA', 'POCITO', 'RAWSON', 'SANTA LUCIA', 'ZONDA 4'
      ]
    }
  ];

  selectedProvincia: string = '';
  selectedSucursal: string = '';
  texto: string = '';
  isEditing = false;

  // 🔥 Agregar esta propiedad (faltaba)
  sucursalesFiltradas: string[] = [];

  constructor(
    private modalCtrl: ModalController,
    private firebaseSvc: FirebaseService,
        private utilsSvc: UtilsService   // 🔥 NUEVO
  ) {}

    ngOnInit() {
    if (this.reclamo) {
      this.isEditing = true;
      this.selectedProvincia = this.reclamo.provincia;
      this.onProvinciaChange();
      this.selectedSucursal = this.reclamo.sucursal;
      this.texto = this.reclamo.texto;
    }
  }

  onProvinciaChange() {
    const provinciaObj = this.provinciasData.find(p => p.provincia === this.selectedProvincia);
    this.sucursalesFiltradas = provinciaObj ? provinciaObj.sucursales : [];
    if (!this.isEditing) {
      this.selectedSucursal = '';
    }
  }

  async guardar() {
    // Obtener usuario del localStorage
    const user = this.utilsSvc.getElementFromLocalStorage('user');
    const userName = user ? user.name : 'Desconocido';

    if (this.isEditing && this.reclamo) {
      const updatedData: Partial<Reclamo> = {
        texto: this.texto.trim(),
        sucursal: this.selectedSucursal,
        provincia: this.selectedProvincia,
      };
      await this.firebaseSvc.updateReclamo(this.reclamo.id!, updatedData);
    } else {
      const reclamo: Omit<Reclamo, 'id'> = {
        provincia: this.selectedProvincia,
        sucursal: this.selectedSucursal,
        texto: this.texto.trim(),
        createdAt: new Date().toISOString(),
        finalizado: false,
        createdByName: userName  // 🔥 Agregado
      };
      await this.firebaseSvc.addReclamo(reclamo);
    }
    this.modalCtrl.dismiss({ refresh: true });
  }

  async finalizarReclamo() {
    if (!this.reclamo) return;
    await this.firebaseSvc.updateReclamo(this.reclamo.id!, {
      finalizado: true,
      fechaFinalizado: new Date().toISOString()
    });
    this.modalCtrl.dismiss({ refresh: true });
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}