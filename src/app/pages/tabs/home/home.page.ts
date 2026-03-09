import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
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
  filteredTasks: Task[] = []; // 👈 NUEVO: Tareas filtradas para mostrar
  loading: boolean = false;
  isOnline: boolean = navigator.onLine;
  
  // Para paginación
  lastVisible: any = null;
  hasMoreData: boolean = true;
  pageSize: number = 10;

  // 👇 CONTROL PARA EVITAR DOBLE CLICK
  public isDeleting: boolean = false;
  public isUpdating: boolean = false;

  // 👇 NUEVO: Control para el buscador
  searchTerm: string = '';
  searchTimeout: any;
  isSearching: boolean = false;

  // 👇 MAPA PARA CONTROLAR EL ESTADO DE EXPANSIÓN DE MATERIALES
  public expandedMateriales: { [taskId: string]: boolean } = {};

  constructor(
    private firebaseSvc: FirebaseService,
    private utilsSvc: UtilsService,
    private authSvc: AuthService,
    private modalCtrl: ModalController,
    private router: Router
  ) {
    window.addEventListener('online', () => this.isOnline = true);
    window.addEventListener('offline', () => this.isOnline = false);
  }

  ngOnInit() {}

  ionViewWillEnter() {
    console.log('Home: ionViewWillEnter');
    this.getUser();
    this.resetPagination();
    this.loadInitialTasks();
  }

  getUser() {
    this.user = this.authSvc.getCurrentUser();
    
    if (!this.user?.uid) {
      console.error('No hay usuario en localStorage');
      this.router.navigate(['/auth']);
    } else {
      console.log(`👤 Usuario: ${this.user.email} (${this.user.role || 'sin rol'})`);
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
  this.expandedMateriales = {}; // 👈 IMPORTANTE: limpiar estados expandidos
  if (this.infiniteScroll) {
    this.infiniteScroll.disabled = false;
  }
  console.log('🔄 Paginación reseteada');
}

  async loadInitialTasks() {
    this.loading = true;
    await this.loadMoreTasks();
    this.loading = false;
  }

 async loadMoreTasks(event?: any) {
  const ownerUid = this.authSvc.getTasksOwnerUid();
  
  if (!ownerUid) {
    if (event) event.target.complete();
    return;
  }

  // Si no hay más datos, no intentar cargar
  if (!this.hasMoreData && this.lastVisible) {
    if (event) event.target.complete();
    return;
  }

  try {
    console.log('Cargando más tareas...', this.lastVisible ? 'con paginación' : 'primera carga');
    
    const result = await this.firebaseSvc.getFilteredTasksPaginated(
      ownerUid,
      { 
        finalizada: false,
        orderByNumber: true,
        limitTo: this.pageSize,
        startAfter: this.lastVisible
      }
    );
    
    if (result.tasks.length > 0) {
      // Evitar duplicados antes de agregar
      const newTasks = result.tasks.filter(newTask => 
        !this.tasks.some(existingTask => existingTask.id === newTask.id)
      );
      
      if (newTasks.length > 0) {
        this.tasks = [...this.tasks, ...newTasks];
        console.log(`📊 Agregadas ${newTasks.length} tareas nuevas. Total: ${this.tasks.length}`);
      }
      
      this.lastVisible = result.lastVisible;
      
      // Si recibimos menos tareas que el límite, no hay más datos
      this.hasMoreData = result.tasks.length === this.pageSize;
      
      console.log(`📊 ¿Hay más datos? ${this.hasMoreData}`);
      
      // Aplicar filtro si hay término de búsqueda
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
  // 👇 NUEVO: Método para buscar en tiempo real
  onSearchInput(event: any) {
    const term = event.detail.value?.toLowerCase().trim() || '';
    
    // Limpiar timeout anterior
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    // Mostrar indicador de búsqueda
    this.isSearching = true;
    
    // Debounce de 300ms para no filtrar en cada tecla
    this.searchTimeout = setTimeout(() => {
      this.searchTerm = term;
      this.applyFilter();
      this.isSearching = false;
    }, 300);
  }

  // 👇 NUEVO: Aplicar filtro a las tareas
  applyFilter() {
    if (!this.searchTerm || this.searchTerm === '') {
      // Si no hay término de búsqueda, mostrar todas
      this.filteredTasks = [...this.tasks];
    } else {
      const term = this.searchTerm.toLowerCase();
      
      // Filtrar por múltiples campos
      this.filteredTasks = this.tasks.filter(task => {
        // Buscar por número de orden (como string)
        const orderNumberMatch = task.orderNumber?.toString().includes(term);
        
        // Buscar por título
        const titleMatch = task.title?.toLowerCase().includes(term);
        
        // Buscar por nombre del técnico
        const tecnicoMatch = task.tecnicoNombre?.toLowerCase().includes(term);
        
        // Buscar por descripción
        const descriptionMatch = task.description?.toLowerCase().includes(term);
        
        // 👇 NUEVO: Buscar por sucursal
        const sucursalMatch = task.sucursal?.toLowerCase().includes(term);
        
        // Buscar por materiales (si existe)
        const materialesMatch = task.materiales?.some(m => 
          m.nombre?.toLowerCase().includes(term) ||
          m.observacion?.toLowerCase().includes(term)
        );
        
        // Buscar por fecha (formato dd/mm/yyyy)
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

  // 👇 NUEVO: Limpiar búsqueda
  clearSearch() {
    this.searchTerm = '';
    this.filteredTasks = [...this.tasks];
  }

  canEditOrDelete(): boolean {
    return this.authSvc.canEditOrDelete();
  }

  async checkPasswordAndAddOrUpdateTask(task?: Task) {
    if (this.canEditOrDelete()) {
      await this.addOrUpdateTask(task);
      return;
    }
    
    const modal = await this.modalCtrl.create({
      component: PasswordModalComponent
    });
  
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
      this.resetPagination();
      await this.loadInitialTasks();
    }
  }

  async checkPasswordAndConfirmDeleteTask(task: Task) {
    if (this.canEditOrDelete()) {
      await this.confirmDeleteTask(task);
      return;
    }
    
    const modal = await this.modalCtrl.create({
      component: PasswordModalComponent
    });
  
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
        {
          text: 'Cancelar',
          role: 'cancel',
        }, {
          text: 'Si, eliminar',
          handler: async () => {
            await this.deleteTask(task);
          }
        }
      ]
    });
  }

  async deleteTask(task: Task) {
    if (this.isDeleting) {
      console.log('⏳ Ya hay una eliminación en curso');
      this.utilsSvc.presentToast({
        message: '⏳ Eliminación en proceso...',
        color: 'warning',
        duration: 2000
      });
      return;
    }
    
    if (!this.isOnline) {
      this.utilsSvc.presentToast({
        message: '❌ Sin conexión. No se puede eliminar.',
        color: 'danger',
        duration: 3000
      });
      return;
    }
    
    this.isDeleting = true;
    const ownerUid = this.authSvc.getTasksOwnerUid();
    const path = `users/${ownerUid}/tasks/${task.id}`;
    await this.utilsSvc.presentLoading({ message: 'Eliminando...' });

    try {
      await this.firebaseSvc.deleteTask(path);
      
      await this.utilsSvc.dismissLoading();
      
      this.utilsSvc.presentToast({
        message: 'Tarea eliminada exitosamente',
        color: 'success',
        icon: 'checkmark-circle-outline',
        duration: 1500
      });
      
      this.resetPagination();
      await this.loadInitialTasks();
      
    } catch (error) {
      console.error('Error eliminando tarea:', error);
      
      await this.utilsSvc.dismissLoading();
      
      this.utilsSvc.presentToast({
        message: 'Error al eliminar la tarea',
        color: 'danger',
        icon: 'alert-circle-outline',
        duration: 3000
      });
    } finally {
      this.isDeleting = false;
    }
  }

  async doRefresh(event?: any) {
    this.resetPagination();
    await this.loadInitialTasks();
    if (event) {
      event.target.complete();
    }
  }

  async viewOrderImage(task: Task) {
    if (task.orderImage) {
      const modal = await this.modalCtrl.create({
        component: ImageModalComponent,
        componentProps: {
          imageUrl: task.orderImage,
          title: `Orden: ${task.title}`
        },
        cssClass: 'fullscreen-image-modal'
      });
      await modal.present();
    } else {
      this.utilsSvc.presentToast({
        message: 'No hay imagen adjunta',
        color: 'warning',
        duration: 2000
      });
    }
  }

  async editOrderNumber(task: Task) {
    if (this.isUpdating) {
      return;
    }
    
    const modal = await this.modalCtrl.create({
      component: EditOrderNumberModalComponent,
      componentProps: { task }
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();

    if (data) {
      await this.updateOrderNumber(task, data.orderNumber);
    }
  }

  async updateOrderNumber(task: Task, newOrderNumber: number) {
    if (this.isUpdating) {
      return;
    }
    
    this.isUpdating = true;
    await this.utilsSvc.presentLoading({ message: 'Actualizando número...' });

    try {
      const ownerUid = this.authSvc.getTasksOwnerUid();
      const taskPath = `users/${ownerUid}/tasks/${task.id}`;
      
      await this.firebaseSvc.updateTask(taskPath, { 
        orderNumber: Number(newOrderNumber) 
      });
      
      await this.utilsSvc.dismissLoading();
      
      this.utilsSvc.presentToast({
        message: '✅ Número actualizado correctamente',
        color: 'success',
        duration: 2000
      });
      
      this.resetPagination();
      await this.loadInitialTasks();
      
    } catch (error) {
      console.error('Error actualizando número:', error);
      await this.utilsSvc.dismissLoading();
      
      this.utilsSvc.presentToast({
        message: 'Error al actualizar el número',
        color: 'danger',
        duration: 3000
      });
    } finally {
      this.isUpdating = false;
    }
  }

  // 👇 NUEVO MÉTODO PARA TOGGLE DE MATERIALES
  toggleMateriales(taskId: string) {
    this.expandedMateriales[taskId] = !this.expandedMateriales[taskId];
  }

  isMaterialesExpanded(taskId: string): boolean {
    return this.expandedMateriales[taskId] || false;
  }

  // 👇 NUEVO MÉTODO PARA DESTACAR COINCIDENCIAS
  taskMatchesSearch(task: Task): boolean {
    if (!this.searchTerm) return false;
    
    const term = this.searchTerm.toLowerCase();
    return (
      task.orderNumber?.toString().includes(term) ||
      task.title?.toLowerCase().includes(term) ||
      task.tecnicoNombre?.toLowerCase().includes(term) ||
      task.description?.toLowerCase().includes(term) ||
      task.sucursal?.toLowerCase().includes(term) || // 👈 NUEVO: Sucursal
      task.materiales?.some(m => 
        m.nombre?.toLowerCase().includes(term) ||
        m.observacion?.toLowerCase().includes(term)
      )
    );
  }

// 👇 NUEVO MÉTODO PARA MOSTrar ID de la tarea (solo admin)
async showTaskId(task: Task) {
  // Crear mensaje con el ID
  const message = `
    🆔 ID de la tarea: 
    ${task.id}
    
    
    
    
  `;

  // Mostrar alert con el ID
  const alert = await this.utilsSvc.presentAlert({
    header: 'ID de la tarea',
    message: message,
    buttons: [
      {
        text: 'Copiar ID',
        handler: () => {
          // Copiar al portapapeles
          navigator.clipboard.writeText(task.id).then(() => {
            this.utilsSvc.presentToast({
              message: '✅ ID copiado al portapapeles',
              color: 'success',
              duration: 2000
            });
          }).catch(() => {
            this.utilsSvc.presentToast({
              message: '❌ No se pudo copiar automáticamente',
              color: 'warning',
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