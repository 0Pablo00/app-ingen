import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Task } from 'src/app/models/task.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { ModalController, IonInfiniteScroll } from '@ionic/angular';
import { AddUpdateTaskComponent } from 'src/app/shared/components/add-update-task/add-update-task.component';
import { ImageModalComponent } from 'src/app/components/image-modal/image-modal.component';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-finalizadas',
  templateUrl: './finalizadas.page.html',
  styleUrls: ['./finalizadas.page.scss'],
})
export class FinalizadasPage implements OnInit {
  @ViewChild(IonInfiniteScroll) infiniteScroll: IonInfiniteScroll;
  
  user = {} as User;
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  loading: boolean = false;
  loadingMore: boolean = false;
  isOnline: boolean = navigator.onLine;
  
  lastVisible: any = null;
  hasMoreData: boolean = true;
  pageSize: number = 10;

  searchTerm: string = '';
  searchTimeout: any;
  isSearching: boolean = false;

  public expandedMateriales: { [taskId: string]: boolean } = {};

  // Control de modo búsqueda y carga completa
  private searchMode: boolean = false;
  private allTasksLoadedForSearch: boolean = false;

  constructor(
    private firebaseSvc: FirebaseService,
    private utilsSvc: UtilsService,
    private modalCtrl: ModalController,
    private router: Router,
    private authSvc: AuthService
  ) {
    window.addEventListener('online', () => this.isOnline = true);
    window.addEventListener('offline', () => this.isOnline = false);
  }

  ngOnInit() {}

  ionViewWillEnter() {
    console.log('Finalizadas: ionViewWillEnter');
    this.getUser();
    this.resetPagination();
    this.loadInitialTasks();
  }

  getUser() {
    this.user = this.utilsSvc.getElementFromLocalStorage('user');
    if (!this.user?.uid) {
      console.error('No hay usuario en localStorage');
      this.router.navigate(['/auth']);
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
    console.log('🔄 Paginación reseteada (finalizadas)');
  }

  async loadInitialTasks() {
    this.loading = true;
    await this.loadMoreTasks();
    this.loading = false;
  }

  async loadMoreTasks(event?: any) {
    // Si estamos en modo búsqueda, no cargar más con paginación
    if (this.searchMode) {
      if (event) event.target.complete();
      return;
    }
    if (!this.hasMoreData || this.loadingMore || !this.user?.uid) {
      if (event) event.target.complete();
      return;
    }

    this.loadingMore = true;

    try {
      console.log('Cargando más tareas finalizadas...');
      const result = await this.firebaseSvc.getFilteredTasksPaginated(
        this.user.uid,
        { 
          finalizada: true,
          orderByNumber: true,
          limitTo: this.pageSize,
          startAfter: this.lastVisible
        }
      );
      
      if (result.tasks.length > 0) {
        const newTasks = result.tasks.filter(newTask => 
          !this.tasks.some(existingTask => existingTask.id === newTask.id)
        );
        this.tasks = [...this.tasks, ...newTasks];
        this.lastVisible = result.lastVisible;
        this.hasMoreData = result.tasks.length === this.pageSize;
        this.applyFilter();
        console.log(`📊 Total finalizadas: ${this.tasks.length}`);
      } else {
        this.hasMoreData = false;
        console.log('🏁 No hay más tareas finalizadas');
      }
      
      if (this.infiniteScroll) {
        this.infiniteScroll.disabled = !this.hasMoreData;
      }
      
    } catch (error) {
      console.error('Error cargando finalizadas:', error);
      this.utilsSvc.presentToast({
        message: 'Error al cargar más tareas',
        color: 'danger',
        duration: 3000
      });
    } finally {
      this.loadingMore = false;
      if (event) {
        event.target.complete();
      }
    }
  }

  // ==================== BÚSQUEDA ====================
  onSearchInput(event: any) {
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
    // Cargar todas las tareas finalizadas solo la primera vez que se busca
    if (!this.allTasksLoadedForSearch) {
      await this.loadAllTasksForSearch();
    }
    this.applyFilter();
  }

  private async loadAllTasksForSearch() {
    const loading = await this.utilsSvc.presentLoading({ message: 'Cargando todas las tareas finalizadas para búsqueda...' });
    try {
      const ownerUid = this.user.uid;
      let allTasks: Task[] = [];
      let last = null;
      let hasMore = true;
      const pageLimit = 50;
      while (hasMore) {
        const result = await this.firebaseSvc.getFilteredTasksPaginated(
          ownerUid,
          {
            finalizada: true,
            orderByNumber: true,
            limitTo: pageLimit,
            startAfter: last
          }
        );
        allTasks = [...allTasks, ...result.tasks];
        last = result.lastVisible;
        hasMore = result.tasks.length === pageLimit;
      }
      this.tasks = allTasks;
      this.searchMode = true;
      this.allTasksLoadedForSearch = true;
      console.log(`📊 Cargadas ${this.tasks.length} tareas finalizadas para búsqueda.`);
    } catch (error) {
      console.error('Error cargando todas las tareas finalizadas:', error);
      this.utilsSvc.presentToast({ message: 'Error al cargar todas las tareas', color: 'danger' });
    } finally {
      loading.dismiss();
    }
  }

  applyFilter() {
    if (!this.searchTerm || this.searchTerm === '') {
      this.filteredTasks = [...this.tasks];
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
    console.log(`🔍 Búsqueda "${this.searchTerm}": ${this.filteredTasks.length} resultados en finalizadas`);
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

  // ==================== CRUD Y OTRAS FUNCIONES ====================
  async viewTask(task: Task) {
    await this.utilsSvc.presentLoading({ message: 'Cargando...' });
    try {
      const modal = await this.modalCtrl.create({
        component: AddUpdateTaskComponent,
        componentProps: { task },
        cssClass: 'add-update-modal'
      });
      await this.utilsSvc.dismissLoading();
      await modal.present();
      const { data } = await modal.onWillDismiss();
      if (data?.success) {
        // Si estamos en modo búsqueda, recargar todas las tareas para actualizar la lista
        if (this.searchMode) {
          this.allTasksLoadedForSearch = false;
          await this.loadAllTasksForSearch();
          this.applyFilter();
        } else {
          this.resetPagination();
          await this.loadInitialTasks();
        }
      }
    } catch (error) {
      console.error('Error al abrir tarea:', error);
      await this.utilsSvc.dismissLoading();
      this.utilsSvc.presentToast({
        message: 'Error al cargar la tarea',
        color: 'danger',
        duration: 3000
      });
    }
  }

  async viewOrderImage(task: Task) {
    if (task.orderImage) {
      await this.utilsSvc.presentLoading({ message: 'Cargando imagen...' });
      try {
        const modal = await this.modalCtrl.create({
          component: ImageModalComponent,
          componentProps: {
            imageUrl: task.orderImage,
            title: `Orden: ${task.title}`
          },
          cssClass: 'fullscreen-image-modal'
        });
        await this.utilsSvc.dismissLoading();
        await modal.present();
      } catch (error) {
        console.error('Error al abrir imagen:', error);
        await this.utilsSvc.dismissLoading();
        this.utilsSvc.presentToast({
          message: 'Error al cargar la imagen',
          color: 'danger',
          duration: 3000
        });
      }
    } else {
      this.utilsSvc.presentToast({
        message: 'No hay imagen adjunta',
        color: 'warning',
        duration: 2000
      });
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
    if (event) {
      event.target.complete();
    }
  }

  toggleMateriales(taskId: string) {
    this.expandedMateriales[taskId] = !this.expandedMateriales[taskId];
  }

  isMaterialesExpanded(taskId: string): boolean {
    return this.expandedMateriales[taskId] || false;
  }

  canEditOrDelete(): boolean {
    return this.authSvc.canEditOrDelete();
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
              this.utilsSvc.presentToast({
                message: '✅ ID copiado al portapapeles',
                color: 'success',
                duration: 2000
              });
            });
          }
        },
        {
          text: 'Cerrar',
          role: 'cancel'
        }
      ]
    });
  }
}