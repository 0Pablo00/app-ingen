import { Component, OnInit } from '@angular/core';
import { ModalController, ActionSheetController } from '@ionic/angular';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { MaintenanceCheckModalComponent } from 'src/app/components/maintenance-check-modal/maintenance-check-modal.component';
import { MaintenanceCheck } from 'src/app/models/maintenance-check.model';

export interface GrupoSucursal {
  provincia: string;
  expanded: boolean;
  sucursales: string[];
}

@Component({
  selector: 'app-check',
  templateUrl: './check.page.html',
  styleUrls: ['./check.page.scss'],
})
export class CheckPage implements OnInit {
  grupos: GrupoSucursal[] = [
    {
      provincia: 'Mendoza',
      expanded: false,
      sucursales: [
        'ALGARROBAL', 'AMIGORENA', 'AVELLANEDA', 'BARRIALES', 'BELTRAN',
        'BUENA NUEVA', 'CANO', 'CAPILLA DEL ROSARIO', 'CARRODILLA', 'CASTELLI',
        'CATITAS', 'CENTRAL', 'CERVANTES', 'COLONIA', 'CORRALITO',
        'CORREA SAA', 'COSTA DE ARAUJO', 'COVIMET', 'DON BOSCO', 'DOVIR',
        'EL BOSQUE', 'EL CISNE', 'EL PIDIO', 'ESTACION', 'ESTANZUELA',
        'FAUSTINO', 'FRIMI 2', 'GIOL', 'GUTEMBERG', 'INDEPENDENCIA',
        'JARDIN SERRANO', 'JUAN B JUSTO', 'JUNIN', 'LAVALLE', 'LUJAN',
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
      expanded: false,
      sucursales: [
        'CAUCETE', 'CHIMBAS', 'CONCEPCION', 'GRANADEROS', 'LA ROSA',
        'MEDIA AGUA', 'POCITO', 'RAWSON', 'SANTA LUCIA', 'ZONDA 4'
      ]
    }
  ];

  historialChecks: { [sucursal: string]: MaintenanceCheck[] } = {};
  estadoMensual: { [sucursal: string]: boolean } = {};
  currentYear: number = new Date().getFullYear();
  currentMonth: number = new Date().getMonth() + 1;

  constructor(
    private firebaseSvc: FirebaseService,
    private utilsSvc: UtilsService,
    private modalCtrl: ModalController,
    private actionSheetCtrl: ActionSheetController
  ) {}

  async ngOnInit() {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    console.log('📱 Usuario actual:', currentUser);
    await this.cargarEstadosMensuales();
  }

  toggleGrupo(grupo: GrupoSucursal) {
    grupo.expanded = !grupo.expanded;
  }

  async cargarEstadosMensuales() {
    console.log(`🔁 Cargando estados para ${this.currentYear}/${this.currentMonth}`);
    const checksDelMes = await this.firebaseSvc.getMaintenanceChecksByMonth(this.currentYear, this.currentMonth);
    console.log('Checks obtenidos:', checksDelMes);
    this.estadoMensual = {};
    checksDelMes.forEach(check => {
      console.log(`- Sucursal ${check.sucursal} tiene checklist`);
      this.estadoMensual[check.sucursal] = true;
    });
  }

  async abrirSeleccionMes(sucursal: string) {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const buttons = months.map((month, index) => ({
      text: month,
      handler: () => {
        this.abrirChecklistPorMes(sucursal, this.currentYear, index + 1);
      }
    }));

    buttons.push({
      text: 'Cancelar',
      handler: () => {}
    });

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Seleccione el mes',
      buttons: buttons
    });
    await actionSheet.present();
  }

  async abrirChecklistPorMes(sucursal: string, year: number, month: number) {
    const checkExistente = await this.firebaseSvc.getMaintenanceCheckBySucursalAndMonth(sucursal, year, month);

    const modal = await this.modalCtrl.create({
      component: MaintenanceCheckModalComponent,
      componentProps: {
        sucursal: sucursal,
        ultimoCheck: checkExistente,
        mesPreseleccionado: { year, month }
      },
      cssClass: 'wide-modal'
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data?.actualizado) {
      if (year === this.currentYear && month === this.currentMonth) {
        await this.cargarEstadosMensuales();
      }
      this.utilsSvc.presentToast({ message: `Checklist de ${sucursal} guardado`, color: 'success', duration: 2000 });
    }
  }
}