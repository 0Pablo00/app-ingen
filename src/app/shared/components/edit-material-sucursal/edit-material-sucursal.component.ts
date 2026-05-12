import { Component, Input, OnInit } from '@angular/core';
import { ModalController, AlertController, ActionSheetController } from '@ionic/angular';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AuthService } from 'src/app/services/auth.service';
import { MaterialSucursal, MovimientoMaterial } from 'src/app/models/insumo.model';

@Component({
  selector: 'app-edit-material-sucursal',
  templateUrl: './edit-material-sucursal.component.html',
  styleUrls: ['./edit-material-sucursal.component.scss'],
})
export class EditMaterialSucursalComponent implements OnInit {
  @Input() sucursal!: string;
  @Input() material!: MaterialSucursal;
  ownerUid!: string;
  movimientos: MovimientoMaterial[] = [];
  mostrarHistorial: boolean = false;
  cargandoHistorial: boolean = false;
  cantidadConsumo: number = 0;
  ordenTrabajo: string = '';
  
  // Variables para transferencia
  sucursalesDisponibles: string[] = [];
  cantidadTransferir: number = 0;

  constructor(
    private modalCtrl: ModalController,
    private firebaseSvc: FirebaseService,
    private utilsSvc: UtilsService,
    private authSvc: AuthService,
    private alertCtrl: AlertController,
    private actionSheetCtrl: ActionSheetController
  ) {}

  async ngOnInit() {
    this.ownerUid = this.authSvc.getTasksOwnerUid();
    await this.cargarSucursalesDisponibles();
  }

  async cargarSucursalesDisponibles() {
    // Obtener todas las sucursales excepto la actual
    const todasSucursales = [
      'CAUCETE', 'CHIMBAS', 'CONCEPCION', 'GRANADEROS', 'LA ROSA',
      'MEDIA AGUA', 'POCITO', 'RAWSON', 'SANTA LUCIA', 'ZONDA 4'
    ];
    this.sucursalesDisponibles = todasSucursales.filter(s => s !== this.sucursal);
  }

  async cargarHistorial() {
    this.cargandoHistorial = true;
    try {
      this.movimientos = await this.firebaseSvc.getMovimientosMaterial(
        this.ownerUid,
        this.sucursal,
        this.material.insumoId
      );
      if (this.movimientos.length === 0) {
        this.utilsSvc.presentToast({ message: 'No hay movimientos registrados', color: 'medium', duration: 2000 });
      }
    } catch (error: any) {
      console.error('Error cargando historial:', error);
      this.utilsSvc.presentToast({ message: 'Error al cargar historial', color: 'danger', duration: 3000 });
    } finally {
      this.cargandoHistorial = false;
    }
  }

  dismiss(actualizado: boolean = false) {
    this.modalCtrl.dismiss({ actualizado });
  }

  async consumirMaterial() {
    if (!this.cantidadConsumo || this.cantidadConsumo <= 0) {
      this.utilsSvc.presentToast({ message: 'Ingrese una cantidad válida', color: 'warning', duration: 2000 });
      return;
    }
    if (this.cantidadConsumo > this.material.cantidad) {
      this.utilsSvc.presentToast({ message: 'Stock insuficiente en sucursal', color: 'danger', duration: 2000 });
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Confirmar consumo',
      message: `¿Registrar consumo de ${this.cantidadConsumo} ${this.material.unidad} de "${this.material.nombre}"?`,
      inputs: [
        {
          name: 'orden',
          type: 'text',
          placeholder: 'Número de orden (opcional)',
          value: this.ordenTrabajo
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar',
          handler: async (data) => {
            const loading = await this.utilsSvc.presentLoading({ message: 'Registrando consumo...' });
            try {
              await this.firebaseSvc.usarMaterialEnSucursal(
                this.ownerUid,
                this.sucursal,
                this.material.insumoId,
                this.cantidadConsumo,
                data.orden,
                `Consumo en ${this.sucursal}`
              );
              await loading.dismiss();
              this.utilsSvc.presentToast({ message: '✅ Material consumido', color: 'success', duration: 2000 });
              this.material.cantidad -= this.cantidadConsumo;
              this.cantidadConsumo = 0;
              this.ordenTrabajo = '';
              if (this.mostrarHistorial) {
                this.cargarHistorial();
              }
              this.dismiss(true);
            } catch (error: any) {
              await loading.dismiss();
              this.utilsSvc.presentToast({ message: error.message || 'Error al consumir', color: 'danger', duration: 3000 });
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async eliminarMaterialDeSucursal() {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar material de la sucursal',
      message: `¿Eliminar completamente "${this.material.nombre}" de ${this.sucursal}? Se devolverá el stock (${this.material.cantidad} ${this.material.unidad}) al inventario central.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          cssClass: 'danger',
          handler: async () => {
            const loading = await this.utilsSvc.presentLoading({ message: 'Procesando...' });
            try {
              await this.firebaseSvc.eliminarMaterialDeSucursal(
                this.ownerUid,
                this.sucursal,
                this.material.insumoId,
                this.material.cantidad,
                this.material.unidad
              );
              await loading.dismiss();
              this.utilsSvc.presentToast({ message: `✅ Material eliminado de ${this.sucursal}`, color: 'success', duration: 2000 });
              this.dismiss(true);
            } catch (error: any) {
              await loading.dismiss();
              this.utilsSvc.presentToast({ message: error.message || 'Error al eliminar', color: 'danger', duration: 3000 });
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async eliminarMovimiento(movimiento: MovimientoMaterial) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar registro',
      message: `¿Eliminar este movimiento del historial? (${movimiento.tipo} - ${movimiento.cantidad} ${movimiento.unidad})`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          cssClass: 'danger',
          handler: async () => {
            const loading = await this.utilsSvc.presentLoading({ message: 'Eliminando...' });
            try {
              await this.firebaseSvc.eliminarMovimiento(
                this.ownerUid,
                this.sucursal,
                movimiento.id!
              );
              await loading.dismiss();
              this.utilsSvc.presentToast({ message: 'Registro eliminado', color: 'success', duration: 2000 });
              this.cargarHistorial();
            } catch (error: any) {
              await loading.dismiss();
              this.utilsSvc.presentToast({ message: error.message || 'Error al eliminar', color: 'danger', duration: 3000 });
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async transferirMaterial() {
    // Mostrar action sheet para seleccionar sucursal destino
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Transferir a sucursal',
      buttons: [
        ...this.sucursalesDisponibles.map(suc => ({
          text: suc,
          handler: () => this.promptCantidadTransferir(suc)
        })),
        { text: 'Cancelar', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  async promptCantidadTransferir(sucursalDestino: string) {
    const alert = await this.alertCtrl.create({
      header: `Transferir a ${sucursalDestino}`,
      subHeader: `Stock disponible: ${this.material.cantidad} ${this.material.unidad}`,
      inputs: [
        {
          name: 'cantidad',
          type: 'number',
          placeholder: `Cantidad en ${this.material.unidad}`,
          min: 0.1,
         
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Transferir',
          handler: async (data) => {
            const cantidad = +data.cantidad;
            if (!cantidad || cantidad <= 0) {
              this.utilsSvc.presentToast({ message: 'Cantidad inválida', color: 'warning', duration: 2000 });
              return false;
            }
            if (cantidad > this.material.cantidad) {
              this.utilsSvc.presentToast({ message: 'Stock insuficiente', color: 'danger', duration: 2000 });
              return false;
            }
            const loading = await this.utilsSvc.presentLoading({ message: `Transfiriendo a ${sucursalDestino}...` });
            try {
              await this.firebaseSvc.transferirMaterialEntreSucursales(
                this.ownerUid,
                this.sucursal,
                sucursalDestino,
                this.material.insumoId,
                cantidad,
                this.material.unidad,
                this.material.nombre
              );
              await loading.dismiss();
              this.utilsSvc.presentToast({ message: `✅ ${cantidad} ${this.material.unidad} transferido a ${sucursalDestino}`, color: 'success', duration: 2000 });
              // Actualizar stock local
              this.material.cantidad -= cantidad;
              this.dismiss(true);
            } catch (error: any) {
              await loading.dismiss();
              this.utilsSvc.presentToast({ message: error.message || 'Error al transferir', color: 'danger', duration: 3000 });
            }
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  toggleHistorial() {
    this.mostrarHistorial = !this.mostrarHistorial;
    if (this.mostrarHistorial && this.movimientos.length === 0) {
      this.cargarHistorial();
    }
  }
}