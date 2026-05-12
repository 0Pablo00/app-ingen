import { Component, OnInit } from '@angular/core';
import { AlertController, ActionSheetController, ModalController } from '@ionic/angular';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AuthService } from 'src/app/services/auth.service';
import { Insumo, MaterialSucursal } from 'src/app/models/insumo.model';
import { take } from 'rxjs/operators';
import { AddInsumoModalComponent } from 'src/app/shared/components/add-insumo-modal/add-insumo-modal.component';
import { EditMaterialSucursalComponent } from 'src/app/shared/components/edit-material-sucursal/edit-material-sucursal.component';

@Component({
  selector: 'app-insumos',
  templateUrl: './insumos.page.html',
  styleUrls: ['./insumos.page.scss'],
})
export class InsumosPage implements OnInit {
  insumos: Insumo[] = [];
  sucursales: string[] = [
    'CAUCETE', 'CHIMBAS', 'CONCEPCION', 'GRANADEROS', 'LA ROSA',
    'MEDIA AGUA', 'POCITO', 'RAWSON', 'SANTA LUCIA', 'ZONDA 4'
  ];
  stockSucursalMap: Map<string, MaterialSucursal[]> = new Map();
  ownerUid: string = '';

  constructor(
    private firebaseSvc: FirebaseService,
    private utilsSvc: UtilsService,
    private authSvc: AuthService,
    private alertCtrl: AlertController,
    private actionSheetCtrl: ActionSheetController,
    private modalCtrl: ModalController
  ) {}

  async ngOnInit() {
    this.ownerUid = this.authSvc.getTasksOwnerUid();
    await this.cargarDatos();
  }

  async cargarDatos() {
    await this.utilsSvc.presentLoading({ message: 'Cargando insumos...' });
    try {
      this.insumos = await this.firebaseSvc.getInsumos(this.ownerUid);
      for (const suc of this.sucursales) {
        const stock = await this.firebaseSvc.getSucursalStock(this.ownerUid, suc);
        this.stockSucursalMap.set(suc, stock);
      }
      await this.utilsSvc.dismissLoading();
    } catch (error: any) {
      await this.utilsSvc.dismissLoading();
      this.utilsSvc.presentToast({ message: `Error: ${error.message}`, color: 'danger', duration: 3000 });
    }
  }

  // ========== AGREGAR INSUMO (MODAL) ==========
  async agregarInsumo() {
    const modal = await this.modalCtrl.create({
      component: AddInsumoModalComponent
    });
    modal.onDidDismiss().then(async (result) => {
      if (result.data) {
        const loading = await this.utilsSvc.presentLoading({ message: 'Guardando...' });
        try {
          await this.firebaseSvc.addInsumo(this.ownerUid, result.data);
          await loading.dismiss();
          this.utilsSvc.presentToast({ message: '✅ Insumo agregado', color: 'success', duration: 2000 });
          this.cargarDatos();
        } catch (error: any) {
          await loading.dismiss();
          this.utilsSvc.presentToast({ message: `Error: ${error.message}`, color: 'danger', duration: 3000 });
        }
      }
    });
    await modal.present();
  }

  // ========== EDITAR INSUMO ==========
  async editarInsumo(insumo: Insumo) {
    const modal = await this.modalCtrl.create({
      component: AddInsumoModalComponent,
      componentProps: { insumo }
    });
    modal.onDidDismiss().then(async (result) => {
      if (result.data) {
        const loading = await this.utilsSvc.presentLoading({ message: 'Actualizando...' });
        try {
          await this.firebaseSvc.updateInsumo(this.ownerUid, insumo.id!, result.data);
          await loading.dismiss();
          this.utilsSvc.presentToast({ message: '✅ Insumo actualizado', color: 'success', duration: 2000 });
          this.cargarDatos();
        } catch (error: any) {
          await loading.dismiss();
          this.utilsSvc.presentToast({ message: `Error: ${error.message}`, color: 'danger', duration: 3000 });
        }
      }
    });
    await modal.present();
  }

  // ========== ELIMINAR INSUMO ==========
  async eliminarInsumo(insumo: Insumo) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar insumo',
      message: `¿Eliminar ${insumo.nombre}? También se perderán sus asignaciones en sucursales.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          handler: async () => {
            const loading = await this.utilsSvc.presentLoading({ message: 'Eliminando...' });
            try {
              await this.firebaseSvc.deleteInsumo(this.ownerUid, insumo.id!);
              await loading.dismiss();
              this.utilsSvc.presentToast({ message: '✅ Insumo eliminado', color: 'success', duration: 2000 });
              this.cargarDatos();
            } catch (error: any) {
              await loading.dismiss();
              this.utilsSvc.presentToast({ message: `Error: ${error.message}`, color: 'danger', duration: 3000 });
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // ========== ASIGNAR MATERIAL A SUCURSAL ==========
  async asignarMaterial(insumo: Insumo) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: `Asignar ${insumo.nombre}`,
      buttons: [
        ...this.sucursales.map(suc => ({
          text: suc,
          handler: () => this.promptCantidadAsignar(insumo, suc)
        })),
        { text: 'Cancelar', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  async promptCantidadAsignar(insumo: Insumo, sucursal: string) {
    const alert = await this.alertCtrl.create({
      header: `Asignar a ${sucursal}`,
      subHeader: `Stock disponible: ${insumo.cantidad} ${insumo.unidad}`,
      inputs: [
        {
          name: 'cantidad',
          type: 'number',
          placeholder: `Cantidad en ${insumo.unidad}`,
          min: 0.1,
          attributes: { step: 0.1 }
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Asignar',
          handler: async (data) => {
            const cantidad = +data.cantidad;
            if (!cantidad || cantidad <= 0) {
              this.utilsSvc.presentToast({ message: 'Cantidad inválida', color: 'warning', duration: 2000 });
              return false;
            }
            if (cantidad > insumo.cantidad) {
              this.utilsSvc.presentToast({ message: 'Stock insuficiente', color: 'danger', duration: 2000 });
              return false;
            }
            const loading = await this.utilsSvc.presentLoading({ message: 'Asignando...' });
            try {
              await this.firebaseSvc.asignarMaterialASucursal(
                this.ownerUid,
                insumo.id!,
                insumo.nombre,
                insumo.unidad,
                sucursal,
                cantidad
              );
              await loading.dismiss();
              this.utilsSvc.presentToast({ message: `✅ Asignado ${cantidad} a ${sucursal}`, color: 'success', duration: 2000 });
              this.cargarDatos();
            } catch (error: any) {
              await loading.dismiss();
              this.utilsSvc.presentToast({ message: error.message || 'Error al asignar', color: 'danger', duration: 3000 });
            }
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  // ========== VER MATERIALES DE UNA SUCURSAL ==========
  // ========== VER MATERIALES DE UNA SUCURSAL (CON MODAL) ==========
async verMaterialesSucursal(sucursal: string) {
  const materiales = this.stockSucursalMap.get(sucursal) || [];
  if (materiales.length === 0) {
    this.utilsSvc.presentToast({ message: 'Sin materiales asignados', color: 'medium', duration: 2000 });
    return;
  }
  
  // Si hay un solo material, abrir directamente su gestión
  if (materiales.length === 1) {
    this.abrirModalMaterial(sucursal, materiales[0]);
  } else {
    // Mostrar action sheet para elegir material
    const actionSheet = await this.actionSheetCtrl.create({
      header: `Seleccionar material en ${sucursal}`,
      buttons: [
        ...materiales.map(mat => ({
          text: `${mat.nombre} (${mat.cantidad} ${mat.unidad})`,
          handler: () => this.abrirModalMaterial(sucursal, mat)
        })),
        { text: 'Cancelar', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }
}

async abrirModalMaterial(sucursal: string, material: MaterialSucursal) {
  const modal = await this.modalCtrl.create({
    component: EditMaterialSucursalComponent,
    componentProps: { sucursal, material }
  });
  modal.onDidDismiss().then((result) => {
    if (result.data?.actualizado) {
      this.cargarDatos(); // recargar para actualizar stock y lista
    }
  });
  await modal.present();
}
}