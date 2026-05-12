import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { FirebaseService } from 'src/app/services/firebase.service';
import { MaintenanceCheck, ControlItem } from 'src/app/models/maintenance-check.model';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-maintenance-check-modal',
  templateUrl: './maintenance-check-modal.component.html',
  styleUrls: ['./maintenance-check-modal.component.scss'],
})
export class MaintenanceCheckModalComponent implements OnInit {
  @Input() sucursal: string;
  @Input() ultimoCheck: MaintenanceCheck | null;
  @Input() mesPreseleccionado?: { year: number, month: number };

  controlesBase: string[] = [
    'ILUMINACION DE INGRESO',
    'ILUMINACION LINEA DE CAJAS',
    'ILUMINACION SALON DE VENTAS',
    'ILUMINACION HELADERAS / POZOS DE FRIO',
    'CERRAMIENTO DE PUERTAS HELADERAS',
    'BURLETES PUERTA HELADERAS',
    'VERIFICACION TEMPERATURA HELADERAS / POZOS DE FRIO',
    'FUNCIONAMIENTO Y ESTADO FORZADORES DE HELADERAS / POZOS',
    'CONTROL ESTADO / FUGAS CIRCUITO FRIO DE HELADERAS',
    'ESTADO DE CONDENSADORES',
    'ESTADO EVAPORADORES',
    'SALA CENTRAL DE FRIO - LIMPIEZA-',
    'CENTRAL DE FRIO ESTADO - FUGAS',
    'CENTRAL DE FRIO FUNCIONAMIENTO COMPRESORES',
    'COMPRESORES NIVEL DE ACEITE- PRESIONES DE SUCCION Y DESCARGA',
    'CENTRAL DE FRIO ESTADO DE TABLEROS ELECTRICOS - ALARMAS',
    'TABLEROS ELECTRICOS INSPECCIONAR ESTADO CABLES Y CONEXIONES',
    'CICLOS DE DESCONGELACION(INICIO, DURACION, FINALIZACION)'
  ];

  controles: ControlItem[] = [];
  fecha: string = new Date().toISOString();
  fechaStr: string = '';
  tecnicoNombre: string = '';
  observaciones: string = '';

  constructor(
    private modalCtrl: ModalController,
    private firebaseSvc: FirebaseService,
    private utilsSvc: UtilsService,
  ) {}

  ngOnInit() {
    if (this.ultimoCheck && this.ultimoCheck.controles && this.ultimoCheck.controles.length > 0) {
      this.fecha = this.ultimoCheck.fecha;
      this.tecnicoNombre = this.ultimoCheck.tecnicoNombre;
      this.observaciones = this.ultimoCheck.observaciones;
      this.controles = [...this.ultimoCheck.controles];
      this.fechaStr = this.formatDateToDisplay(this.fecha);
    } 
    else if (this.mesPreseleccionado) {
      const fechaInicio = new Date(this.mesPreseleccionado.year, this.mesPreseleccionado.month - 1, 1);
      this.fecha = fechaInicio.toISOString();
      this.fechaStr = this.formatDateToDisplay(this.fecha);
      this.controles = this.controlesBase.map(nombre => ({ nombre, estado: '' }));
    } 
    else {
      this.controles = this.controlesBase.map(nombre => ({ nombre, estado: '' }));
      this.fechaStr = this.formatDateToDisplay(new Date().toISOString());
      this.fecha = new Date().toISOString();
    }
  }

  private formatDateToDisplay(dateValue: string | Date): string {
    const date = new Date(dateValue);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private parseDisplayDateToISO(dateStr: string): string | null {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  }

  onFechaChange() {
    const iso = this.parseDisplayDateToISO(this.fechaStr);
    if (iso) {
      this.fecha = iso;
    }
  }

  async guardar() {
    console.log('📦 Controles a guardar:', JSON.stringify(this.controles));

    if (!this.tecnicoNombre.trim()) {
      this.utilsSvc.presentToast({ 
        message: 'Ingrese el nombre del técnico', 
        color: 'warning',
        duration: 3000
      });
      return;
    }

    const fechaISO = this.parseDisplayDateToISO(this.fechaStr);
    if (!fechaISO) {
      this.utilsSvc.presentToast({ 
        message: 'Ingrese una fecha válida en formato dd/mm/aaaa (ej: 24/04/2026)', 
        color: 'warning',
        duration: 3000
      });
      return;
    }
    this.fecha = fechaISO;

    const controlesIncompletos = this.controles.filter(c => !c.estado);
    if (controlesIncompletos.length > 0) {
      this.utilsSvc.presentToast({ 
        message: `⚠️ Debe seleccionar B, R o M en ${controlesIncompletos.length} control(es)`, 
        color: 'warning',
        duration: 3000
      });
      return;
    }

    const checkData: MaintenanceCheck = {
      sucursal: this.sucursal,
      fecha: this.fecha,
      tecnicoNombre: this.tecnicoNombre,
      observaciones: this.observaciones,
      controles: this.controles,
      createdAt: new Date().toISOString(),
      createdBy: '',
      createdByName: ''
    };

    try {
      await this.firebaseSvc.saveMaintenanceCheck(checkData);
      await this.modalCtrl.dismiss({ actualizado: true });
    } catch (error) {
      console.error(error);
      this.utilsSvc.presentToast({ 
        message: 'Error al guardar', 
        color: 'danger',
        duration: 3000
      });
    }
  }

  cerrar() {
    this.modalCtrl.dismiss();
  }
}