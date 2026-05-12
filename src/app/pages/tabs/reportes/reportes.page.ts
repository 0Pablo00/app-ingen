import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Task } from 'src/app/models/task.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AuthService } from 'src/app/services/auth.service';
import { TaskDetailModalComponent } from 'src/app/shared/components/task-detail-modal/task-detail-modal.component';

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.page.html',
  styleUrls: ['./reportes.page.scss'],
})
export class ReportesPage implements OnInit {
  user: User = {} as User;
  loading = false;
  errorMensaje = '';
  loadingMessage = '';

  meses: { label: string; value: string }[] = [];
  mesSeleccionado = '';

  sucursalesReporte: { nombre: string; cantidad: number; tareas: Task[]; expanded: boolean }[] = [];
  totalTrabajos = 0;
  reporteCargado = false;

  operarios: { nombre: string; cantidad: number }[] = [];
  mostrarOperarios = false;
  tareasDelMes: Task[] = [];

  constructor(
    private firebaseSvc: FirebaseService,
    private utilsSvc: UtilsService,
    private authSvc: AuthService,
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {
    this.user = this.utilsSvc.getElementFromLocalStorage('user');
    if (!this.user?.uid) {
      this.utilsSvc.routerLink('/auth');
      return;
    }
    this.generarMeses();
    this.seleccionarMesActual();
  }

  generarMeses() {
    const hoy = new Date();
    for (let i = 11; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const año = fecha.getFullYear();
      const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
      const label = `${fecha.toLocaleString('es', { month: 'long' })} ${año}`;
      this.meses.push({ label: label.charAt(0).toUpperCase() + label.slice(1), value: `${año}-${mes}` });
    }
  }

  seleccionarMesActual() {
    const ahora = new Date();
    const mesActual = `${ahora.getFullYear()}-${(ahora.getMonth() + 1).toString().padStart(2, '0')}`;
    if (this.meses.find(m => m.value === mesActual)) {
      this.mesSeleccionado = mesActual;
    } else {
      this.mesSeleccionado = this.meses[0]?.value || '';
    }
  }

  async cargarReporteMensual() {
    console.log('🚀 [Reportes] Iniciando cargarReporteMensual');
    console.time('[Reportes] Total');

    if (!this.mesSeleccionado) {
      this.utilsSvc.presentToast({ message: 'Seleccioná un mes', color: 'warning' });
      return;
    }

    this.loading = true;
    this.reporteCargado = false;
    this.errorMensaje = '';
    this.loadingMessage = 'Consultando a Firestore...';

    try {
      // Obtener el año y mes seleccionado
      const [año, mes] = this.mesSeleccionado.split('-').map(Number);
      
      // NUEVO: Consultar directamente las tareas finalizadas del mes
      this.loadingMessage = 'Obteniendo tareas del mes...';
      console.log(`[Reportes] 1. Consultando tareas finalizadas de ${año}-${mes}`);
      console.time('[Reportes] consulta_firestore');
      this.tareasDelMes = await this.firebaseSvc.getFinalizedTasksByMonth(this.user.uid, año, mes);
      console.timeEnd('[Reportes] consulta_firestore');
      console.log(`[Reportes] Tareas obtenidas: ${this.tareasDelMes.length}`);

      if (this.tareasDelMes.length === 0) {
        this.errorMensaje = 'No hay trabajos finalizados en este mes.';
        this.reporteCargado = false;
        this.loading = false;
        this.utilsSvc.presentToast({
          message: `📭 No hay trabajos en ${this.getNombreMes()}`,
          color: 'warning',
          duration: 2000,
        });
        console.timeEnd('[Reportes] Total');
        return;
      }

      // Agrupar por sucursal
      this.loadingMessage = 'Agrupando por sucursal...';
      console.log('[Reportes] 2. Agrupando por sucursal...');
      console.time('[Reportes] agrupacion');
      const sucursalMap = new Map<string, Task[]>();
      for (const task of this.tareasDelMes) {
        const sucursal = task.sucursal || 'Sin sucursal';
        if (!sucursalMap.has(sucursal)) sucursalMap.set(sucursal, []);
        sucursalMap.get(sucursal)!.push(task);
      }
      this.sucursalesReporte = Array.from(sucursalMap.entries())
        .map(([nombre, tareas]) => ({
          nombre,
          cantidad: tareas.length,
          tareas: tareas.sort((a, b) => (b.orderNumber || 0) - (a.orderNumber || 0)),
          expanded: false,
        }))
        .sort((a, b) => b.cantidad - a.cantidad);
      console.timeEnd('[Reportes] agrupacion');
      console.log(`[Reportes] Sucursales: ${this.sucursalesReporte.length}`);

      this.totalTrabajos = this.tareasDelMes.length;
      this.reporteCargado = true;
      this.calcularOperarios();

      this.utilsSvc.presentToast({
        message: `✅ ${this.totalTrabajos} trabajo(s) en ${this.getNombreMes()}`,
        color: 'success',
        duration: 2000,
      });
      console.log('[Reportes]✅ Carga exitosa');
    } catch (error: any) {
      console.error('[Reportes]❌ Error:', error);
      // Si el error es por falta de índice, mostrar mensaje especial
      if (error?.message?.includes('index')) {
        this.errorMensaje = 'Falta un índice en Firestore. Hacé clic en "Crear índice" en la consola.';
        this.utilsSvc.presentToast({
          message: '⚠️ Necesitas crear un índice. Revisá la consola.',
          color: 'warning',
          duration: 5000,
        });
        console.error('👉 Crear índice en:', error.message.match(/https:\/\/console\.firebase\.google\.com\/[^\s]+/)?.[0]);
      } else {
        this.errorMensaje = 'Error al cargar el reporte. Verificá tu conexión.';
      }
      this.reporteCargado = false;
    } finally {
      this.loading = false;
      this.loadingMessage = '';
      console.timeEnd('[Reportes] Total');
    }
  }

  calcularOperarios() {
    const operarioMap = new Map<string, number>();
    for (const task of this.tareasDelMes) {
      const nombre = task.tecnicoNombre || 'Sin técnico';
      operarioMap.set(nombre, (operarioMap.get(nombre) || 0) + 1);
    }
    this.operarios = Array.from(operarioMap.entries())
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }

  async verDetalleOperario(operario: string) {
    const tareasOperario = this.tareasDelMes.filter(t => (t.tecnicoNombre || 'Sin técnico') === operario);
    if (!tareasOperario.length) return;
    let detalles = '';
    for (const task of tareasOperario) {
      const fecha = task.createdAt ? new Date(task.createdAt).toLocaleDateString('es-AR') : 'Sin fecha';
      const sucursal = task.sucursal || 'Sin sucursal';
      const orden = task.orderNumber || 'N/A';
      detalles += `📅 ${fecha} | 🏢 ${sucursal} | 🔢 Orden: ${orden}\n`;
    }
    const alert = await this.utilsSvc.presentAlert({
      header: `👤 ${operario} - ${tareasOperario.length} trabajo(s)`,
      message: detalles,
      buttons: ['Cerrar'],
    });
  }

  async verDetalleTarea(task: Task) {
    const modal = await this.modalCtrl.create({
      component: TaskDetailModalComponent,
      componentProps: { task },
    });
    await modal.present();
  }

  toggleSucursal(index: number) {
    this.sucursalesReporte[index].expanded = !this.sucursalesReporte[index].expanded;
  }

  getNombreMes(): string {
    const encontrado = this.meses.find(m => m.value === this.mesSeleccionado);
    return encontrado ? encontrado.label : '';
  }
}