import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Task } from 'src/app/models/task.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AuthService } from 'src/app/services/auth.service';
import { AddUpdateTaskComponent } from 'src/app/shared/components/add-update-task/add-update-task.component';
import { ModalController, IonInfiniteScroll } from '@ionic/angular';
import { PasswordModalComponent } from 'src/app/shared/components/password-modal/password-modal.component';
import { ImageModalComponent } from 'src/app/components/image-modal/image-modal.component';
import { EditOrderNumberModalComponent } from 'src/app/shared/components/edit-order-number-modal/edit-order-number-modal.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  @ViewChild(IonInfiniteScroll) infiniteScroll: IonInfiniteScroll;
  
  user = {} as User;
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  loading: boolean = false;
  isOnline: boolean = navigator.onLine;
  
  lastVisible: any = null;
  hasMoreData: boolean = true;
  pageSize: number = 10;

  public isDeleting: boolean = false;
  public isUpdating: boolean = false;

currentUserRole: string = '';

  searchTerm: string = '';
  searchTimeout: any;
  isSearching: boolean = false;

  public expandedMateriales: { [taskId: string]: boolean } = {};

  // Variable para controlar si ya se procesó el deep link
  private pendingTaskId: string | null = null;
  // Bandera para saber si estamos en modo búsqueda (todas las tareas cargadas)
  private searchMode: boolean = false;
  // Indica si ya se cargaron todas las tareas para la búsqueda actual
  private allTasksLoadedForSearch: boolean = false;

  constructor(
    private firebaseSvc: FirebaseService,
    private utilsSvc: UtilsService,
    private authSvc: AuthService,
    private modalCtrl: ModalController,
    private router: Router,
    private route: ActivatedRoute
  ) {
    window.addEventListener('online', () => this.isOnline = true);
    window.addEventListener('offline', () => this.isOnline = false);
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const taskId = params['taskId'];
      if (taskId) {
        console.log(`🔗 Deep link recibido, taskId: ${taskId}`);
        this.pendingTaskId = taskId;
        if (this.tasks.length > 0) {
          this.openPendingTask();
        }
      }
    });
  }

  ionViewWillEnter() {
    console.log('Home: ionViewWillEnter');
    this.getUser();
    this.resetPagination();
    this.loadInitialTasks();
  }

  // ==================== DEEP LINK ====================
  private async openPendingTask() {
    if (!this.pendingTaskId) return;
    // Buscar en la lista local
    let task = this.tasks.find(t => t.id === this.pendingTaskId);
    if (task) {
      console.log(`✅ Tarea encontrada en lista local: ${this.pendingTaskId}`);
      this.pendingTaskId = null;
      await this.addOrUpdateTask(task);
      return;
    }

    // Si no está en la lista, buscarla directamente en Firestore
    console.log(`🔍 Tarea ${this.pendingTaskId} no está en lista local. Buscando en Firestore...`);
    await this.utilsSvc.presentLoading({ message: 'Abriendo tarea...' });
    try {
      const ownerUid = this.authSvc.getTasksOwnerUid();
      const path = `users/${ownerUid}/tasks`;
      const taskData = await this.firebaseSvc.getDocument(path, this.pendingTaskId);
      if (taskData) {
        task = taskData as Task;
        console.log(`✅ Tarea encontrada en Firestore: ${task.id}`);
        this.pendingTaskId = null;
        await this.utilsSvc.dismissLoading();
        await this.addOrUpdateTask(task);
      } else {
        console.error(`❌ Tarea ${this.pendingTaskId} no existe en Firestore.`);
        await this.utilsSvc.dismissLoading();
        this.utilsSvc.presentToast({
          message: 'La tarea solicitada no existe o fue eliminada.',
          color: 'danger',
          duration: 3000
        });
        this.pendingTaskId = null;
      }
    } catch (error) {
      console.error('Error al buscar tarea por ID:', error);
      await this.utilsSvc.dismissLoading();
      this.utilsSvc.presentToast({
        message: 'Error al abrir la tarea.',
        color: 'danger',
        duration: 3000
      });
      this.pendingTaskId = null;
    }
  }

  // ==================== MÉTODOS DE CARGA ====================
 getUser() {
  this.user = this.authSvc.getCurrentUser();
  if (!this.user?.uid) {
    console.error('No hay usuario en localStorage');
    this.router.navigate(['/auth']);
  } else {
    console.log(`👤 Usuario: ${this.user.email} (${this.user.role || 'sin rol'})`);
    this.currentUserRole = this.user.role || 'operario'; // por defecto operario
  }
}

getPercentage(task: Task) {
  return this.utilsSvc.getPercentage(task);
}

  resetPagination() {
    this.tasks = [];
    this.filteredTasks = [];
    this.lastVisible = null;
    this.hasMoreData = true;
    this.searchTerm = '';
    this.isSearching = false;
    this.searchMode = false;
    this.allTasksLoadedForSearch = false;
    this.expandedMateriales = {};
    if (this.infiniteScroll) {
      this.infiniteScroll.disabled = false;
    }
    console.log('🔄 Paginación reseteada');
  }

  async loadInitialTasks() {
    this.loading = true;
    await this.loadMoreTasks();
    this.loading = false;
    if (this.pendingTaskId) {
      this.openPendingTask();
    }
  }

  async loadMoreTasks(event?: any) {
  // Si estamos en modo búsqueda, no cargar más con paginación
  if (this.searchMode) {
    if (event) event.target.complete();
    return;
  }
  const ownerUid = this.authSvc.getTasksOwnerUid(); // ✅ Definir ownerUid
  if (!ownerUid) {
    if (event) event.target.complete();
    return;
  }
  if (!this.hasMoreData && this.lastVisible) {
    if (event) event.target.complete();
    return;
  }
  try {
    console.log('Cargando más tareas...', this.lastVisible ? 'con paginación' : 'primera carga');
    
    const options: any = {
      finalizada: false,
      orderByNumber: true,
      limitTo: this.pageSize,
      startAfter: this.lastVisible
    };
    if (this.currentUserRole !== 'admin') {
      options.createdBy = this.user.uid; // solo sus propias tareas
    }
    
    const result = await this.firebaseSvc.getFilteredTasksPaginated(ownerUid, options);
    
    if (result.tasks.length > 0) {
      const newTasks = result.tasks.filter(newTask => 
        !this.tasks.some(existingTask => existingTask.id === newTask.id)
      );
      if (newTasks.length > 0) {
        this.tasks = [...this.tasks, ...newTasks];
        console.log(`📊 Agregadas ${newTasks.length} tareas nuevas. Total: ${this.tasks.length}`);
      }
      this.lastVisible = result.lastVisible;
      this.hasMoreData = result.tasks.length === this.pageSize;
      console.log(`📊 ¿Hay más datos? ${this.hasMoreData}`);
      this.applyFilter();
    } else {
      this.hasMoreData = false;
      console.log('🏁 No hay más tareas');
    }
    if (this.infiniteScroll) {
      this.infiniteScroll.disabled = !this.hasMoreData;
    }
  } catch (error) {
    console.error('Error cargando más tareas:', error);
  } finally {
    if (event) {
      event.target.complete();
    }
  }
}

  // ==================== BÚSQUEDA ====================
  async onSearchInput(event: any) {
    const term = event.detail.value?.toLowerCase().trim() || '';
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    
    if (term === '') {
      this.clearSearch();
      return;
    }
    
    this.isSearching = true;
    this.searchTimeout = setTimeout(async () => {
      this.searchTerm = term;
      await this.performSearch(term);
      this.isSearching = false;
    }, 500);
  }

  private async performSearch(term: string) {
    if (!term) return;
    // Cargar todas las tareas solo la primera vez que se realiza una búsqueda
    if (!this.allTasksLoadedForSearch) {
      await this.loadAllTasksForSearch();
    }
    // Aplicar filtro sobre las tareas ya cargadas (this.tasks contiene todas)
    this.applyFilter();
  }

 private async loadAllTasksForSearch() {
  const loading = await this.utilsSvc.presentLoading({ message: 'Cargando todas las tareas para búsqueda...' });
  try {
    const ownerUid = this.authSvc.getTasksOwnerUid(); // ✅ Declarar ownerUid aquí
    let allTasks: Task[] = [];
    let last = null;
    let hasMore = true;
    const pageLimit = 50;
    while (hasMore) {
      const options: any = {
        finalizada: false,
        orderByNumber: true,
        limitTo: pageLimit,
        startAfter: last
      };
      if (this.currentUserRole !== 'admin') {
        options.createdBy = this.user.uid;
      }
      const result = await this.firebaseSvc.getFilteredTasksPaginated(ownerUid, options);
      allTasks = [...allTasks, ...result.tasks];
      last = result.lastVisible;
      hasMore = result.tasks.length === pageLimit;
    }
    this.tasks = allTasks;
    this.searchMode = true;
    this.allTasksLoadedForSearch = true;
    console.log(`📊 Cargadas ${this.tasks.length} tareas para búsqueda.`);
  } catch (error) {
    console.error('Error cargando todas las tareas:', error);
    this.utilsSvc.presentToast({ message: 'Error al cargar todas las tareas', color: 'danger' });
  } finally {
    loading.dismiss();
  }
}

  applyFilter() {
    if (!this.searchTerm || this.searchTerm === '') {
      if (this.searchMode) {
        this.filteredTasks = [...this.tasks];
      } else {
        this.filteredTasks = [...this.tasks];
      }
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredTasks = this.tasks.filter(task => {
        const orderNumberMatch = task.orderNumber?.toString().includes(term);
        const titleMatch = task.title?.toLowerCase().includes(term);
        const tecnicoMatch = task.tecnicoNombre?.toLowerCase().includes(term);
        const descriptionMatch = task.description?.toLowerCase().includes(term);
        const sucursalMatch = task.sucursal?.toLowerCase().includes(term);
        const materialesMatch = task.materiales?.some(m => 
          m.nombre?.toLowerCase().includes(term) ||
          m.observacion?.toLowerCase().includes(term)
        );
        let fechaMatch = false;
        if (task.createdAt) {
          const fecha = new Date(task.createdAt);
          const fechaStr = `${fecha.getDate().toString().padStart(2,'0')}/${(fecha.getMonth()+1).toString().padStart(2,'0')}/${fecha.getFullYear()}`;
          fechaMatch = fechaStr.includes(term);
        }
        return orderNumberMatch || titleMatch || tecnicoMatch || descriptionMatch || sucursalMatch || materialesMatch || fechaMatch;
      });
    }
    console.log(`🔍 Búsqueda "${this.searchTerm}": ${this.filteredTasks.length} resultados`);
  }

  clearSearch() {
    this.searchTerm = '';
    this.isSearching = false;
    if (this.searchMode) {
      // Salir del modo búsqueda y recargar paginación normal
      this.searchMode = false;
      this.allTasksLoadedForSearch = false;
      this.resetPagination();
      this.loadInitialTasks();
    } else {
      this.applyFilter();
    }
  }

  // ==================== OTROS MÉTODOS ====================
  canEditOrDelete(): boolean {
    return this.authSvc.canEditOrDelete();
  }

  async checkPasswordAndAddOrUpdateTask(task?: Task) {
    if (this.canEditOrDelete()) {
      await this.addOrUpdateTask(task);
      return;
    }
    const modal = await this.modalCtrl.create({ component: PasswordModalComponent });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) {
      const { password } = data;
      const validPasswords = ['1234', 'servicios2024', 'operario_2024'];
      if (validPasswords.includes(password)) {
        await this.addOrUpdateTask(task);
      } else {
        this.utilsSvc.presentToast({
          message: 'Contraseña incorrecta',
          color: 'warning',
          icon: 'alert-circle-outline',
          duration: 3000
        });
      }
    }
  }

  async addOrUpdateTask(task?: Task) {
    let res = await this.utilsSvc.presentModal({
      component: AddUpdateTaskComponent,
      componentProps: { task },
      cssClass: 'add-update-modal'
    });
    if (res && res.success) {
      console.log('Modal cerrado con éxito, recargando tareas...');
      if (this.searchMode) {
        // Recargar todas las tareas para mantener la lista actualizada
        this.allTasksLoadedForSearch = false;
        await this.loadAllTasksForSearch();
        this.applyFilter();
      } else {
        this.resetPagination();
        await this.loadInitialTasks();
      }
    }
  }

  async checkPasswordAndConfirmDeleteTask(task: Task) {
    if (this.canEditOrDelete()) {
      await this.confirmDeleteTask(task);
      return;
    }
    const modal = await this.modalCtrl.create({ component: PasswordModalComponent });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) {
      const { password } = data;
      const validPasswords = ['1234', 'servicios2024', 'operario_2024'];
      if (validPasswords.includes(password)) {
        await this.confirmDeleteTask(task);
      } else {
        this.utilsSvc.presentToast({
          message: 'Contraseña incorrecta',
          color: 'warning',
          icon: 'alert-circle-outline',
          duration: 3000
        });
      }
    }
  }

  async confirmDeleteTask(task: Task) {
    const alert = await this.utilsSvc.presentAlert({
      header: 'Eliminar tarea',
      message: '¿Quieres eliminar esta tarea?',
      mode: 'ios',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Si, eliminar', handler: async () => { await this.deleteTask(task); } }
      ]
    });
  }

  async deleteTask(task: Task) {
    if (this.isDeleting) {
      this.utilsSvc.presentToast({ message: '⏳ Eliminación en proceso...', color: 'warning', duration: 2000 });
      return;
    }
    if (!this.isOnline) {
      this.utilsSvc.presentToast({ message: '❌ Sin conexión. No se puede eliminar.', color: 'danger', duration: 3000 });
      return;
    }
    this.isDeleting = true;
    const ownerUid = this.authSvc.getTasksOwnerUid();
    const path = `users/${ownerUid}/tasks/${task.id}`;
    await this.utilsSvc.presentLoading({ message: 'Eliminando...' });
    try {
      await this.firebaseSvc.deleteTask(path);
      await this.utilsSvc.dismissLoading();
      this.utilsSvc.presentToast({ message: 'Tarea eliminada exitosamente', color: 'success', icon: 'checkmark-circle-outline', duration: 1500 });
      if (this.searchMode) {
        this.allTasksLoadedForSearch = false;
        await this.loadAllTasksForSearch();
        this.applyFilter();
      } else {
        this.resetPagination();
        await this.loadInitialTasks();
      }
    } catch (error) {
      console.error('Error eliminando tarea:', error);
      await this.utilsSvc.dismissLoading();
      this.utilsSvc.presentToast({ message: 'Error al eliminar la tarea', color: 'danger', icon: 'alert-circle-outline', duration: 3000 });
    } finally {
      this.isDeleting = false;
    }
  }

  async doRefresh(event?: any) {
    if (this.searchMode) {
      this.allTasksLoadedForSearch = false;
      await this.loadAllTasksForSearch();
      this.applyFilter();
    } else {
      this.resetPagination();
      await this.loadInitialTasks();
    }
    if (event) event.target.complete();
  }

  async viewOrderImage(task: Task) {
    if (task.orderImage) {
      const modal = await this.modalCtrl.create({
        component: ImageModalComponent,
        componentProps: { imageUrl: task.orderImage, title: `Orden: ${task.title}` },
        cssClass: 'fullscreen-image-modal'
      });
      await modal.present();
    } else {
      this.utilsSvc.presentToast({ message: 'No hay imagen adjunta', color: 'warning', duration: 2000 });
    }
  }

  async editOrderNumber(task: Task) {
    if (this.isUpdating) return;
    const modal = await this.modalCtrl.create({ component: EditOrderNumberModalComponent, componentProps: { task } });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) await this.updateOrderNumber(task, data.orderNumber);
  }

  async updateOrderNumber(task: Task, newOrderNumber: number) {
    if (this.isUpdating) return;
    this.isUpdating = true;
    await this.utilsSvc.presentLoading({ message: 'Actualizando número...' });
    try {
      const ownerUid = this.authSvc.getTasksOwnerUid();
      const taskPath = `users/${ownerUid}/tasks/${task.id}`;
      await this.firebaseSvc.updateTask(taskPath, { orderNumber: Number(newOrderNumber) });
      await this.utilsSvc.dismissLoading();
      this.utilsSvc.presentToast({ message: '✅ Número actualizado correctamente', color: 'success', duration: 2000 });
      if (this.searchMode) {
        this.allTasksLoadedForSearch = false;
        await this.loadAllTasksForSearch();
        this.applyFilter();
      } else {
        this.resetPagination();
        await this.loadInitialTasks();
      }
    } catch (error) {
      console.error('Error actualizando número:', error);
      await this.utilsSvc.dismissLoading();
      this.utilsSvc.presentToast({ message: 'Error al actualizar el número', color: 'danger', duration: 3000 });
    } finally {
      this.isUpdating = false;
    }
  }

  toggleMateriales(taskId: string) {
    this.expandedMateriales[taskId] = !this.expandedMateriales[taskId];
  }

  isMaterialesExpanded(taskId: string): boolean {
    return this.expandedMateriales[taskId] || false;
  }

  taskMatchesSearch(task: Task): boolean {
    if (!this.searchTerm) return false;
    const term = this.searchTerm.toLowerCase();
    return (
      task.orderNumber?.toString().includes(term) ||
      task.title?.toLowerCase().includes(term) ||
      task.tecnicoNombre?.toLowerCase().includes(term) ||
      task.description?.toLowerCase().includes(term) ||
      task.sucursal?.toLowerCase().includes(term) ||
      task.materiales?.some(m => m.nombre?.toLowerCase().includes(term) || m.observacion?.toLowerCase().includes(term))
    );
  }

  async showTaskId(task: Task) {
    const message = `🆔 ID de la tarea: ${task.id}`;
    const alert = await this.utilsSvc.presentAlert({
      header: 'ID de la tarea',
      message: message,
      buttons: [
        {
          text: 'Copiar ID',
          handler: () => {
            navigator.clipboard.writeText(task.id).then(() => {
              this.utilsSvc.presentToast({ message: '✅ ID copiado al portapapeles', color: 'success', duration: 2000 });
            }).catch(() => {
              this.utilsSvc.presentToast({ message: '❌ No se pudo copiar automáticamente', color: 'warning', duration: 2000 });
            });
          }
        },
        { text: 'Cerrar', role: 'cancel' }
      ]
    });
  }
}