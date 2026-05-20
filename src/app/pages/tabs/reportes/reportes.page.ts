import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Task } from 'src/app/models/task.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AuthService } from 'src/app/services/auth.service';
import { TaskDetailModalComponent } from 'src/app/shared/components/task-detail-modal/task-detail-modal.component';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  mesParaLista: string = ''; // Se inicializará con el mes actual

  meses: { label: string; value: string }[] = [];
  mesSeleccionado = '';

  sucursalesReporte: { nombre: string; cantidad: number; tareas: Task[]; expanded: boolean }[] = [];
  totalTrabajos = 0;
  reporteCargado = false;

  operarios: { nombre: string; cantidad: number }[] = [];
  mostrarOperarios = false;
  tareasDelMes: Task[] = [];

  // Nueva funcionalidad para lista de verificación
  provinciaSeleccionada: string = 'Mendoza';
  listaSucursalesProvincia: string[] = [];
  fechaActual: string = new Date().toLocaleDateString();


  

  // Lista completa de sucursales por provincia
  sucursalesMendoza: string[] = [
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
  ];

  sucursalesSanJuan: string[] = [
    'CAUCETE', 'CHIMBAS', 'CONCEPCION', 'GRANADEROS', 'LA ROSA',
    'MEDIA AGUA', 'POCITO', 'RAWSON', 'SANTA LUCIA', 'ZONDA 4'
  ];

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
    this.cargarSucursalesPorProvincia();


      const ahora = new Date();
  const mesActual = ahora.toLocaleString('es', { month: 'long' });
  const año = ahora.getFullYear();
  this.mesParaLista = `${mesActual.charAt(0).toUpperCase() + mesActual.slice(1)} ${año}`;
  this.cargarSucursalesPorProvincia();
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

  cargarSucursalesPorProvincia() {
    if (this.provinciaSeleccionada === 'Mendoza') {
      this.listaSucursalesProvincia = [...this.sucursalesMendoza];
    } else {
      this.listaSucursalesProvincia = [...this.sucursalesSanJuan];
    }
  }

  onProvinciaChange() {
    this.cargarSucursalesPorProvincia();
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
      const [año, mes] = this.mesSeleccionado.split('-').map(Number);
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

  // ========== NUEVO: GENERAR PDF DE LISTA DE VERIFICACIÓN ==========
async imprimirListaVerificacion() {
  const mes = this.mesParaLista || this.getNombreMes();
  const provincia = this.provinciaSeleccionada;
  const fechaImpresion = new Date().toLocaleDateString();

  // Distribución uniforme por página (sin contar el título)
  const sucursalesPorPagina = 23; // cantidad que cabe bien
  const total = this.listaSucursalesProvincia.length;
  const pageSizes: number[] = [];
  let remaining = total;
  while (remaining > 0) {
    pageSizes.push(Math.min(sucursalesPorPagina, remaining));
    remaining -= sucursalesPorPagina;
  }

  this.utilsSvc.presentLoading({ message: `Generando PDF (${pageSizes.length} páginas)...` });

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 190;
  const startX = 10;
  const startY = 15;
  const bottomMargin = 15;

  let offset = 0;
  for (let p = 0; p < pageSizes.length; p++) {
    const size = pageSizes[p];
    const sucursalesPagina = this.listaSucursalesProvincia.slice(offset, offset + size);
    offset += size;

    const isFirstPage = (p === 0);

    let htmlContent = `
      <div style="font-family: Arial, sans-serif; width: 800px; margin: 0 auto; padding: 10px; padding-bottom: 30px;">
    `;

    if (isFirstPage) {
      // Título completo en la primera página
      htmlContent += `
        <h2 style="text-align: center; color: #2c3e66;">Lista de Verificación de Sucursales</h2>
        <p><strong>Mes:</strong> ${mes}</p>
        <p><strong>Provincia:</strong> ${provincia}</p>
       
      `;
    } else {
      // Cabecera compacta en las siguientes páginas
      htmlContent += `
        <p style="margin: 0 0 10px 0;"><strong>Mes:</strong> ${mes} | <strong>Provincia:</strong> ${provincia} | <strong>Fecha:</strong> ${fechaImpresion}</p>
      `;
    }

    htmlContent += `
        <table style="width: 100%; border-collapse: collapse; margin-top: 5px;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Sucursal</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: center;">Visitado (✓)</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Fecha de visita</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (const suc of sucursalesPagina) {
      htmlContent += `
            <tr>
              <td style="border: 1px solid #ddd; padding: 6px;">${suc}</td>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">☐</td>
              <td style="border: 1px solid #ddd; padding: 6px;">___________</td>
            </tr>
      `;
    }

    htmlContent += `
          </tbody>
        </table>
        <p style="margin-top: 20px; font-size: 11px; color: #666;">* Marcar con una X o ✓ según corresponda.</p>
      </div>
    `;

    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '800px';
    tempDiv.innerHTML = htmlContent;
    document.body.appendChild(tempDiv);

    await this.delay(150);
    const canvas = await html2canvas(tempDiv, { scale: 2, backgroundColor: '#ffffff' });
    document.body.removeChild(tempDiv);

    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (p === 0) {
      pdf.addImage(imgData, 'JPEG', startX, startY, imgWidth, imgHeight);
    } else {
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', startX, startY, imgWidth, imgHeight);
    }

    // Número de página
    pdf.setFontSize(10);
    pdf.text(`Hoja ${p+1}`, pdf.internal.pageSize.getWidth() - 20, pdf.internal.pageSize.getHeight() - bottomMargin);
  }

  pdf.save(`Lista_Verificacion_${provincia}_${mes.replace(/\s/g, '_')}.pdf`);
  await this.utilsSvc.dismissLoading();
  this.utilsSvc.presentToast({ message: 'PDF generado correctamente', color: 'success' });
}
// Agregar este método auxiliar si no existe
private delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}


async imprimirPlanillaReclamos() {
  const mes = this.mesParaLista || this.getNombreMes();
  const provincia = this.provinciaSeleccionada;
  const fechaImpresion = new Date().toLocaleDateString();

  // Ajustamos la cantidad por página porque ahora las filas son más altas (aprox 12 por hoja)
  const sucursalesPorPagina = 12; 
  const total = this.listaSucursalesProvincia.length;
  const pageSizes: number[] = [];
  let remaining = total;
  while (remaining > 0) {
    pageSizes.push(Math.min(sucursalesPorPagina, remaining));
    remaining -= sucursalesPorPagina;
  }

  this.utilsSvc.presentLoading({ message: `Generando PDF de Reclamos (${pageSizes.length} páginas)...` });

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 190;
  const startX = 10;
  const startY = 15;
  const bottomMargin = 15;

  let offset = 0;
  for (let p = 0; p < pageSizes.length; p++) {
    const size = pageSizes[p];
    const sucursalesPagina = this.listaSucursalesProvincia.slice(offset, offset + size);
    offset += size;

    const isFirstPage = (p === 0);

    let htmlContent = `
      <div style="font-family: Arial, sans-serif; width: 800px; margin: 0 auto; padding: 10px; padding-bottom: 30px; background-color: white;">
    `;

    if (isFirstPage) {
      htmlContent += `
        <h2 style="text-align: center; color: #2c3e66; margin-bottom: 20px;">Planilla de Reclamos - Sucursales</h2>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
          <span><strong>Mes:</strong> ${mes}</span>
          <span><strong>Provincia:</strong> ${provincia}</span>
       
        </div>
      `;
    } else {
      htmlContent += `
        <p style="margin: 0 0 15px 0; font-size: 12px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
          <strong>Mes:</strong> ${mes} | <strong>Provincia:</strong> ${provincia} | <strong>Fecha:</strong> ${fechaImpresion}
        </p>
      `;
    }

    htmlContent += `
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="border: 1px solid #ccc; padding: 10px; text-align: left; width: 25%;">Sucursal</th>
              <th style="border: 1px solid #ccc; padding: 10px; text-align: left; width: 60%;">Reclamos realizados</th>
              <th style="border: 1px solid #ccc; padding: 10px; text-align: left; width: 15%;">Fecha</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (const suc of sucursalesPagina) {
      htmlContent += `
            <tr>
              <td style="border: 1px solid #ccc; padding: 15px 10px; font-weight: bold; font-size: 13px;">${suc}</td>
              <td style="border: 1px solid #ccc; padding: 15px 10px; vertical-align: bottom;">
                <div style=" width: 100%; height: 25px;"></div>
              </td>
              <td style="border: 1px solid #ccc; padding: 15px 10px; vertical-align: bottom;">
                <div style=" width: 100%; height: 25px;"></div>
              </td>
            </tr>
      `;
    }

    htmlContent += `
          </tbody>
        </table>
        <p style="margin-top: 25px; font-size: 11px; color: #666; font-style: italic;">
          * Espacio diseñado para anotaciones manuales de reclamos técnicos y fechas de intervención.
        </p>
      </div>
    `;

    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '800px';
    tempDiv.innerHTML = htmlContent;
    document.body.appendChild(tempDiv);

    await this.delay(200); // Un poquito más de tiempo para asegurar el renderizado
    const canvas = await html2canvas(tempDiv, { scale: 2, backgroundColor: '#ffffff' });
    document.body.removeChild(tempDiv);

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (p > 0) pdf.addPage();
    
    pdf.addImage(imgData, 'JPEG', startX, startY, imgWidth, imgHeight);

    pdf.setFontSize(10);
    pdf.setTextColor(100);
    pdf.text(`Página ${p + 1} de ${pageSizes.length}`, pdf.internal.pageSize.getWidth() - 30, pdf.internal.pageSize.getHeight() - bottomMargin);
  }

  pdf.save(`Planilla_Reclamos_${provincia}_${mes.replace(/\s/g, '_')}.pdf`);
  await this.utilsSvc.dismissLoading();
  this.utilsSvc.presentToast({ message: 'Planilla de reclamos generada con éxito', color: 'success' });
}
}