import { Component, OnInit, Input } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import {
  ItemReorderEventDetail,
  ActionSheetController,
  ModalController
} from '@ionic/angular';

import { Item, Task, Material } from 'src/app/models/task.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AuthService } from 'src/app/services/auth.service';
import { PasswordModalComponent } from 'src/app/shared/components/password-modal/password-modal.component';
import { ImageModalComponent } from 'src/app/components/image-modal/image-modal.component';

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-add-update-task',
  templateUrl: './add-update-task.component.html',
  styleUrls: ['./add-update-task.component.scss'],
})
export class AddUpdateTaskComponent implements OnInit {

  @Input() task!: Task;
  isTecnicoReadOnly: boolean = false; // Campo de solo lectura para técnico
  user = {} as User;

  selectedDate!: string;
  minDate!: string;
  maxDate!: string;

  orderImage = '';
  orderImagePath = '';
  orderFileName = '';
  isUploadingImage = false;
  
  // Campo para trabajo finalizado
  finalizada: boolean = false;
  isOnline: boolean = navigator.onLine;

  // Control para el campo de material
  nuevoMaterialNombre: string = '';
  nuevoMaterialCantidad: number = 1;
  nuevoMaterialUnidad: string = 'unidad';
  nuevoMaterialObservacion: string = '';

  // 👇 NUEVO: Lista de sucursales agrupadas por provincia con control de expansión
  sucursalesPorProvincia = [
    {
      provincia: 'Mendoza',
      expanded: false, // Mendoza empieza expandido
      sucursales: [
        'ALGARROBAL', 'AMIGONERA', 'BARRIALES', 'BELTRAN', 'CATITAS',
        'CENTRAL', 'CERVANTES', 'COLONIA', 'COSTA DE ARAUJO', 'DOVIR',
        'EL BOSQUE', 'FAUSTINO', 'FRIMI 2', 'INDEPENDENCIA', 'JUAN B JUSTO',
        'JUNIN', 'LAVALLE', 'MARTIN FIERRO', 'MOYANO', 'OLASCOAGA',
        'PADRE LLORENS', 'PALMIRA', 'PERITO MORENO', 'PERU', 'RAIZ',
        'RIVADAVIA 2', 'RIVADAVIA 3', 'RODEO DEL MEDIO', 'ROTONDA',
        'SAN MIGUEL', 'SANTA ANA', 'SOMECA', 'SPORTMAN', 'TERMINAL',
        'TROME', 'TROPERO SOSA', 'TULUMAYA'
      ]
    },
    {
      provincia: 'San Juan',
      expanded: false, // San Juan empieza colapsado
      sucursales: [
        'CAUCETE', 'CHIMBAS', 'CONCEPCION', 'GRANADEROS', 'LA ROSA',
        'MEDIA AGUA', 'POCITO', 'RAWSON', 'SANTA LUCIA', 'ZONDA 4'
      ]
    }
  ];

  // 👇 NUEVO: Control para el buscador de sucursales
  searchSucursal: string = '';
  filteredSucursales: { provincia: string; expanded: boolean; sucursales: string[] }[] = [];

  form = new FormGroup({
    title: new FormControl('', [Validators.required, Validators.minLength(4)]),
    description: new FormControl('', [Validators.required, Validators.minLength(4)]),
    items: new FormControl<Item[]>([], [Validators.required]),
    createdAt: new FormControl<string>(''),
    orderImage: new FormControl(''),
    orderImagePath: new FormControl(''),
    orderFileName: new FormControl(''),
    orderImageAt: new FormControl<string | null>(null),
    
    // NUEVOS CAMPOS
    tecnicoNombre: new FormControl('', [Validators.required, Validators.minLength(3)]),
    materiales: new FormControl<Material[]>([]),
    sucursal: new FormControl('', [Validators.required]) // 👈 NUEVO CAMPO SUCURSAL
  });

  // Opciones para unidades de medida
  unidadesMedida: string[] = [
    'unidad', 'unidades',
    'metro', 'metros',
    'kilogramo', 'kilogramos',
    'litro', 'litros',
    'caja', 'cajas',
    'paquete', 'paquetes',
    'bolsa', 'bolsas',
    'metro cuadrado', 'metros cuadrados',
    'hora', 'horas',
    'día', 'días'
  ];

  constructor(
    private firebaseSvc: FirebaseService,
    private utilsSvc: UtilsService,
    private authSvc: AuthService,
    private modalCtrl: ModalController,
    private actionSheetCtrl: ActionSheetController
  ) {
    window.addEventListener('online', () => this.isOnline = true);
    window.addEventListener('offline', () => this.isOnline = false);
  }

  isAdmin(): boolean {
    return this.authSvc.isAdmin();
  }

  // 👇 NUEVO: Filtrar sucursales por búsqueda
  filterSucursales() {
    const term = this.searchSucursal.toLowerCase().trim();
    
    if (!term) {
      // Restaurar la estructura original con los estados expandidos
      this.filteredSucursales = this.sucursalesPorProvincia.map(grupo => ({
        provincia: grupo.provincia,
        expanded: grupo.expanded,
        sucursales: [...grupo.sucursales]
      }));
      return;
    }

    this.filteredSucursales = this.sucursalesPorProvincia
      .map(grupo => ({
        provincia: grupo.provincia,
        expanded: true, // En búsqueda, mostrar todos expandidos
        sucursales: grupo.sucursales.filter(s => 
          s.toLowerCase().includes(term)
        )
      }))
      .filter(grupo => grupo.sucursales.length > 0);
  }

  // 👇 NUEVO: Seleccionar sucursal
  selectSucursal(sucursal: string) {
    this.form.patchValue({ sucursal });
    this.searchSucursal = ''; // Limpiar búsqueda
    this.filteredSucursales = this.sucursalesPorProvincia.map(grupo => ({
      provincia: grupo.provincia,
      expanded: grupo.expanded,
      sucursales: [...grupo.sucursales]
    }));
  }

  // 👇 NUEVO: Expandir/colapsar provincia
  toggleProvincia(index: number) {
    if (!this.searchSucursal) { // Solo permitir toggle cuando no hay búsqueda
      this.filteredSucursales[index].expanded = !this.filteredSucursales[index].expanded;
      // También actualizar el estado en sucursalesPorProvincia para mantener consistencia
      this.sucursalesPorProvincia[index].expanded = this.filteredSucursales[index].expanded;
    }
  }

  async ngOnInit() {
    this.user = this.utilsSvc.getElementFromLocalStorage('user');

    if (!this.task) {
      this.finalizada = false;
    }

    const now = new Date();
    this.minDate = this.formatDateForDateTimePicker(now);
    const max = new Date();
    max.setFullYear(now.getFullYear() + 1);
    this.maxDate = this.formatDateForDateTimePicker(max);

    // Inicializar lista filtrada
    this.filteredSucursales = this.sucursalesPorProvincia.map(grupo => ({
      provincia: grupo.provincia,
      expanded: grupo.expanded,
      sucursales: [...grupo.sucursales]
    }));

    if (this.task) {
      // Es edición - cargar datos existentes
      const taskData = {
        title: this.task.title || '',
        description: this.task.description || '',
        items: this.task.items || [],
        createdAt: this.convertToIsoString(this.task.createdAt),
        orderImage: this.task.orderImage || '',
        orderImagePath: this.task.orderImagePath || '',
        orderFileName: this.task.orderFileName || '',
        orderImageAt: this.convertToIsoString(this.task.orderImageAt),
        tecnicoNombre: this.task.tecnicoNombre || '',
        materiales: this.task.materiales || [],
        sucursal: this.task.sucursal || '' // 👈 CARGAR SUCURSAL
      };

      this.form.patchValue(taskData);
      this.finalizada = this.task.finalizada || false;
      this.orderImage = this.task.orderImage || '';
      this.orderImagePath = this.task.orderImagePath || '';
      this.orderFileName = this.task.orderFileName || '';
      this.selectedDate = this.formatDateForInput(this.task.createdAt);
      
      // En edición TAMBIÉN debe ser readonly para técnico
      this.isTecnicoReadOnly = true;
      
    } else {
      // Es NUEVA tarea - AUTCOMPLETAR con el nombre del usuario logueado
      const now = new Date();
      this.selectedDate = this.formatDateForDateTimePicker(now);
      
      // Autocompletar el nombre del técnico
      const tecnicoNombre = this.user?.name || '';
      console.log('👤 Autocompletando técnico con:', tecnicoNombre);
      
      this.form.patchValue({
        createdAt: now.toISOString(),
        materiales: [],
        tecnicoNombre: tecnicoNombre,
        sucursal: '' // Inicializar vacío
      });
      
      // Activar modo solo lectura para el técnico
      this.isTecnicoReadOnly = true;

      if (tecnicoNombre) {
        setTimeout(() => {
          this.utilsSvc.presentToast({
            message: `✅ Técnico asignado: ${tecnicoNombre}`,
            color: 'success',
            duration: 2000
          });
        }, 500);
      }
    }
  }

  convertToIsoString(date: string | Date | null | undefined): string {
    if (!date) return '';
    try {
      if (typeof date === 'string') {
        const dateObj = new Date(date);
        return isNaN(dateObj.getTime()) ? '' : dateObj.toISOString();
      } else {
        return date.toISOString();
      }
    } catch (error) {
      console.error('Error convirtiendo fecha:', error);
      return '';
    }
  }

  onDateChange(ev: any) {
    const localDateString = ev.detail.value;
    const localDate = new Date(localDateString);
    this.form.patchValue({
      createdAt: localDate.toISOString()
    });
  }

  formatDateForDateTimePicker(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  formatDateForInput(date: string | Date | undefined): string {
    if (!date) {
      const now = new Date();
      return this.formatDateForDateTimePicker(now);
    }
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        const now = new Date();
        return this.formatDateForDateTimePicker(now);
      }
      return this.formatDateForDateTimePicker(dateObj);
    } catch (error) {
      console.error('Error formateando fecha:', error);
      const now = new Date();
      return this.formatDateForDateTimePicker(now);
    }
  }

  // ========== MÉTODOS PARA TAREAS (ITEMS) ==========
  createItem() {
    this.utilsSvc.presentAlert({
      header: 'Nueva tarea',
      inputs: [{ 
        name: 'name', 
        type: 'textarea', 
        placeholder: 'Detalle de la tarea...',
        attributes: { maxlength: 200 }
      }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Agregar',
          handler: res => {
            if (!res.name || !res.name.trim()) return;
            const item: Item = { name: res.name.trim(), completed: false };
            const currentItems = this.form.value.items || [];
            this.form.patchValue({ items: [...currentItems, item] });
            this.form.controls.items.updateValueAndValidity();
          }
        }
      ]
    });
  }

  removeItem(index: number) {
    const currentItems = this.form.value.items || [];
    currentItems.splice(index, 1);
    this.form.patchValue({ items: currentItems });
    this.form.controls.items.updateValueAndValidity();
  }

  handleReorder(ev: CustomEvent<ItemReorderEventDetail>) {
    const items = ev.detail.complete(this.form.value.items || []);
    this.form.patchValue({ items });
    this.form.updateValueAndValidity();
  }

  getPercentage(): number {
    const items = this.form.value.items || [];
    if (!items.length) return 0;
    const completed = items.filter(i => i.completed).length;
    return Math.round((completed / items.length) * 100);
  }

  // ========== MÉTODOS PARA MATERIALES ==========
  agregarMaterial() {
    if (!this.nuevoMaterialNombre || !this.nuevoMaterialNombre.trim()) {
      this.utilsSvc.presentToast({
        message: '⚠️ Debes ingresar el nombre del material',
        color: 'warning',
        duration: 2000
      });
      return;
    }

    const nuevoMaterial: Material = {
      nombre: this.nuevoMaterialNombre.trim(),
      cantidad: this.nuevoMaterialCantidad || 1,
      unidad: this.nuevoMaterialUnidad || 'unidad',
      observacion: this.nuevoMaterialObservacion?.trim() || ''
    };

    const materialesActuales = this.form.value.materiales || [];
    this.form.patchValue({ materiales: [...materialesActuales, nuevoMaterial] });
    this.resetMaterialForm();

    this.utilsSvc.presentToast({
      message: '✅ Material agregado',
      color: 'success',
      duration: 1500
    });
  }

  eliminarMaterial(index: number) {
    const materialesActuales = this.form.value.materiales || [];
    materialesActuales.splice(index, 1);
    this.form.patchValue({ materiales: materialesActuales });
    this.utilsSvc.presentToast({
      message: 'Material eliminado',
      color: 'warning',
      duration: 1500
    });
  }

  editarMaterial(index: number) {
    const material = this.form.value.materiales?.[index];
    if (!material) return;

    this.nuevoMaterialNombre = material.nombre;
    this.nuevoMaterialCantidad = material.cantidad || 1;
    this.nuevoMaterialUnidad = material.unidad || 'unidad';
    this.nuevoMaterialObservacion = material.observacion || '';

    this.eliminarMaterial(index);

    setTimeout(() => {
      const element = document.querySelector('.materiales-form-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }

  resetMaterialForm() {
    this.nuevoMaterialNombre = '';
    this.nuevoMaterialCantidad = 1;
    this.nuevoMaterialUnidad = 'unidad';
    this.nuevoMaterialObservacion = '';
  }

  getMaterialesResumen(): string {
    const materiales = this.form.value.materiales || [];
    if (materiales.length === 0) return 'Sin materiales registrados';
    const totalItems = materiales.length;
    const totalCantidad = materiales.reduce((sum, m) => sum + (m.cantidad || 0), 0);
    return `${totalItems} material(es) - Total: ${totalCantidad} ${materiales[0]?.unidad || 'unidades'}`;
  }

  // ========== MÉTODOS PARA IMÁGENES ==========
  async showOrderImageOptions() {
    const buttons: any[] = [
      { text: 'Tomar Foto', icon: 'camera', handler: () => this.takePhoto() },
      { text: 'Galería', icon: 'images', handler: () => this.selectFromGallery() },
      { text: 'Cancelar', role: 'cancel' }
    ];

    if (this.orderImage) {
      buttons.splice(2, 0,
        { text: 'Ver Imagen', icon: 'eye', handler: () => this.viewCurrentImage() },
        { text: 'Eliminar Imagen', icon: 'trash', role: 'destructive', handler: () => this.removeImage() }
      );
    }

    const sheet = await this.actionSheetCtrl.create({
      header: 'Orden de trabajo',
      buttons
    });
    await sheet.present();
  }

  async takePhoto() {
    try {
      const img = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 1024,
        height: 1024,
        presentationStyle: 'popover'
      });
      this.processImageWithSizeCheck(img.dataUrl!, 'camera');
    } catch (error) {
      console.error('Error tomando foto:', error);
      this.utilsSvc.presentToast({
        message: 'Error al tomar la foto',
        color: 'danger',
        duration: 3000
      });
    }
  }

  async selectFromGallery() {
    try {
      const img = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        width: 1024,
        height: 1024,
        presentationStyle: 'popover'
      });
      this.processImageWithSizeCheck(img.dataUrl!, 'gallery');
    } catch (error) {
      console.error('Error seleccionando imagen:', error);
      this.utilsSvc.presentToast({
        message: 'Error al seleccionar imagen',
        color: 'danger',
        duration: 3000
      });
    }
  }

  processImageWithSizeCheck(dataUrl: string, source: string) {
    const sizeInMB = this.getDataUrlSizeInMB(dataUrl);
    
    if (sizeInMB > 0.95) {
      this.utilsSvc.presentAlert({
        header: 'Imagen demasiado grande',
        message: `La imagen es de ${sizeInMB.toFixed(2)}MB. El límite de Firestore es 1MB.\n\n¿Quieres intentar con una configuración más reducida?`,
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          {
            text: 'Reducir tamaño',
            handler: () => this.retryWithReducedSettings(source)
          },
          {
            text: 'Usar igual (arriesgado)',
            handler: () => this.saveImageAnyway(dataUrl, source)
          }
        ]
      });
      return;
    }
    this.saveImage(dataUrl, source, sizeInMB);
  }

  getDataUrlSizeInMB(dataUrl: string): number {
    if (!dataUrl.includes(',')) return 0;
    const base64Data = dataUrl.split(',')[1];
    const padding = (dataUrl.charAt(dataUrl.length - 2) === '=') ? 2 : 
                   (dataUrl.charAt(dataUrl.length - 1) === '=') ? 1 : 0;
    const sizeInBytes = (base64Data.length * 3) / 4 - padding;
    return sizeInBytes / (1024 * 1024);
  }

  saveImage(dataUrl: string, source: string, sizeInMB?: number) {
    const now = new Date();
    const fileName = `orden_${now.getTime()}.jpg`;

    this.orderImage = dataUrl;
    this.orderFileName = fileName;
    this.orderImagePath = source;

    this.form.patchValue({
      orderImage: dataUrl,
      orderFileName: fileName,
      orderImagePath: source,
      orderImageAt: now.toISOString()
    });

    const sizeMsg = sizeInMB ? ` (${sizeInMB.toFixed(2)}MB)` : '';
    this.utilsSvc.presentToast({
      message: `Imagen cargada${sizeMsg}`,
      color: 'success',
      duration: 2000
    });
  }

  saveImageAnyway(dataUrl: string, source: string) {
    const sizeInMB = this.getDataUrlSizeInMB(dataUrl);
    if (sizeInMB > 1.0) {
      this.utilsSvc.presentToast({
        message: `¡ADVERTENCIA! Imagen de ${sizeInMB.toFixed(2)}MB supera el límite de 1MB`,
        color: 'warning',
        duration: 4000
      });
    }
    this.saveImage(dataUrl, source, sizeInMB);
  }

  async retryWithReducedSettings(source: string) {
    try {
      const img = await Camera.getPhoto({
        quality: 70,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
        width: 800,
        height: 600,
        presentationStyle: 'popover'
      });
      this.processImageWithSizeCheck(img.dataUrl!, source);
    } catch (error) {
      console.error('Error con configuración reducida:', error);
      this.utilsSvc.presentToast({
        message: 'Error al tomar foto con configuración reducida',
        color: 'danger',
        duration: 3000
      });
    }
  }

  removeImage() {
    this.orderImage = '';
    this.orderImagePath = '';
    this.orderFileName = '';
    this.form.patchValue({
      orderImage: '',
      orderImagePath: '',
      orderFileName: '',
      orderImageAt: null
    });
    this.utilsSvc.presentToast({
      message: 'Imagen eliminada',
      color: 'success',
      duration: 2000
    });
  }

  async viewCurrentImage() {
    const modal = await this.modalCtrl.create({
      component: ImageModalComponent,
      componentProps: {
        imageUrl: this.orderImage,
        title: this.orderFileName || 'Orden de trabajo'
      }
    });
    await modal.present();
  }

  async checkPasswordAndSubmit() {
    if (!this.isOnline) {
      this.utilsSvc.presentToast({
        message: '❌ Sin conexión. No se puede guardar.',
        color: 'danger',
        duration: 3000
      });
      return;
    }

    if (this.form.invalid) {
      this.utilsSvc.presentToast({
        message: '❌ Complete todos los campos requeridos',
        color: 'danger',
        duration: 3000
      });
      return;
    }

    const modal = await this.modalCtrl.create({
      component: PasswordModalComponent
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (!data) return;

    const valid = ['1234', 'servicios2024', 'operario_2024'];
    if (!valid.includes(data.password)) {
      this.utilsSvc.presentToast({ message: 'Contraseña incorrecta', color: 'danger' });
      return;
    }

    this.submit();
  }

  submit() {
    if (this.form.invalid || this.isUploadingImage) {
      console.log('Formulario inválido:', this.form.errors);
      return;
    }
    this.task ? this.updateTask() : this.createTask();
  }

  // MÉTODO CREATE TASK
  async createTask() {
    await this.utilsSvc.presentLoading({ message: 'Creando tarea...' });
    
    try {
      console.log('🚀 ===== INICIANDO CREACIÓN DE TAREA =====');
      const startTime = performance.now();
      
      const ownerUid = this.authSvc.getTasksOwnerUid();
      console.log('1️⃣ Owner UID:', ownerUid);
      
      const orderStart = performance.now();
      const orderNumber = await this.firebaseSvc.getNextOrderNumber(ownerUid);
      const orderEnd = performance.now();
      console.log(`2️⃣ Número de orden: ${orderNumber} (${(orderEnd - orderStart).toFixed(0)}ms)`);
      
      const formData = {
        ...this.form.value,
        orderNumber,
        finalizada: this.finalizada,
        createdAt: this.form.value.createdAt || new Date().toISOString(),
        orderImageAt: this.form.value.orderImageAt || null,
        createdBy: this.user.uid,
        createdByName: this.user.name,
        createdByEmail: this.user.email,
        tecnicoNombre: this.form.value.tecnicoNombre,
        materiales: this.form.value.materiales || [],
        sucursal: this.form.value.sucursal // 👈 NUEVO CAMPO
      };
      
      console.log('3️⃣ Datos a guardar:', {
        ...formData,
        orderImage: formData.orderImage ? '[IMAGEN PRESENTE]' : null
      });
      
      const addStart = performance.now();
      await this.firebaseSvc.addTask(ownerUid, formData);
      const addEnd = performance.now();
      console.log(`4️⃣ Tarea guardada en Firestore (${(addEnd - addStart).toFixed(0)}ms)`);
      
      const endTime = performance.now();
      console.log(`✅ ===== TAREA CREADA EN ${(endTime - startTime).toFixed(0)}ms =====`);
      
      await this.utilsSvc.dismissLoading();
      await this.utilsSvc.dismissModal({ success: true });
      
      this.utilsSvc.presentToast({
        message: '✅ Tarea creada correctamente',
        color: 'success',
        duration: 2000
      });
      
    } catch (error) {
      console.error('❌ Error en createTask:', error);
      await this.utilsSvc.dismissLoading();
      
      this.utilsSvc.presentToast({
        message: 'Error al crear la tarea',
        color: 'danger',
        duration: 3000
      });
    }
  }

  // MÉTODO UPDATE TASK
  async updateTask() {
    if (!this.task?.id) return;

    await this.utilsSvc.presentLoading({ message: 'Actualizando...' });
    
    try {
      const ownerUid = this.authSvc.getTasksOwnerUid();
      const taskPath = `users/${ownerUid}/tasks/${this.task.id}`;
      
      const formData = {
        ...this.form.value,
        finalizada: this.finalizada,
        createdAt: this.form.value.createdAt || new Date().toISOString(),
        orderImageAt: this.form.value.orderImageAt || null,
        updatedBy: this.user.uid,
        updatedByName: this.user.name,
        updatedAt: new Date().toISOString(),
        tecnicoNombre: this.form.value.tecnicoNombre,
        materiales: this.form.value.materiales || [],
        sucursal: this.form.value.sucursal // 👈 NUEVO CAMPO
      };
      
      await this.firebaseSvc.updateTask(taskPath, formData);
      
      await this.utilsSvc.dismissLoading();
      await this.utilsSvc.dismissModal({ success: true });
      
      this.utilsSvc.presentToast({
        message: '✅ Tarea actualizada correctamente',
        color: 'success',
        duration: 2000
      });
      
    } catch (error) {
      console.error('Error en updateTask:', error);
      await this.utilsSvc.dismissLoading();
      
      this.utilsSvc.presentToast({
        message: 'Error al actualizar la tarea',
        color: 'danger',
        duration: 3000
      });
    }
  }
}