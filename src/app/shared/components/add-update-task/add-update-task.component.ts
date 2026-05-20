import { Component, OnInit, Input } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import {
  ItemReorderEventDetail,
  ActionSheetController,
  ModalController,
  AlertController
} from '@ionic/angular';

import { Item, Task, Material } from 'src/app/models/task.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AuthService } from 'src/app/services/auth.service';
import { PasswordModalComponent } from 'src/app/shared/components/password-modal/password-modal.component';
import { ImageModalComponent } from 'src/app/components/image-modal/image-modal.component';
import { MaterialSucursal } from 'src/app/models/insumo.model';

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-add-update-task',
  templateUrl: './add-update-task.component.html',
  styleUrls: ['./add-update-task.component.scss'],
})
export class AddUpdateTaskComponent implements OnInit {

  isIOSWeb(): boolean {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
    return isIOS && !isNative;
  }

  @Input() task!: Task;
  isTecnicoReadOnly: boolean = false;
  user = {} as User;

  selectedDate!: string;
  minDate!: string;
  maxDate!: string;

  orderImage = '';
  orderImagePath = '';
  orderFileName = '';
  isUploadingImage = false;
  
  finalizada: boolean = false;
  isOnline: boolean = navigator.onLine;

  // Variables para materiales (manuales / nuevos)
  nuevoMaterialNombre: string = '';
  nuevoMaterialCantidad: number = 1;
  nuevoMaterialUnidad: string = 'unidad';
  nuevoMaterialObservacion: string = '';
  editandoMaterialIndex: number | null = null;

  // Variables para materiales desde stock
  materialesDisponibles: MaterialSucursal[] = [];

  // Control para saber si es edición y si ya había materiales
  materialesOriginales: Material[] = [];
  nuevosMaterialesAgregados: Material[] = []; // para saber cuáles consumir al guardar

  sucursalesPorProvincia = [
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
        'JARDIN SERRANO', 'JUAN B JUSTO', 'JUNIN', 'LA COLONIA', 'LAVALLE', 'LUJAN',
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
    tecnicoNombre: new FormControl('', [Validators.required, Validators.minLength(3)]),
    materiales: new FormControl<Material[]>([]),
    sucursal: new FormControl('', [Validators.required])
  });

  unidadesMedida: string[] = [
    'unidad', 'unidades', 'metro', 'metros', 'kilogramo', 'kilogramos',
    'litro', 'litros', 'caja', 'cajas', 'paquete', 'paquetes',
    'bolsa', 'bolsas', 'metro cuadrado', 'metros cuadrados',
    'hora', 'horas', 'día', 'días'
  ];

  constructor(
    private firebaseSvc: FirebaseService,
    private utilsSvc: UtilsService,
    private authSvc: AuthService,
    private modalCtrl: ModalController,
    private actionSheetCtrl: ActionSheetController,
    private alertCtrl: AlertController
  ) {
    window.addEventListener('online', () => this.isOnline = true);
    window.addEventListener('offline', () => this.isOnline = false);
  }

  isAdmin(): boolean {
    return this.authSvc.isAdmin();
  }

  isEditMode(): boolean {
    return !!this.task;
  }

  private necesitaPasswordParaMateriales(): boolean {
    // Solo se necesita contraseña para editar o eliminar materiales que ya existían originalmente
    return this.isEditMode() && this.materialesOriginales.length > 0;
  }

  private async validarPasswordMaterial(): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header: 'Verificar contraseña',
        message: 'Para modificar o eliminar materiales ya guardados, ingrese la contraseña:',
        inputs: [
          {
            name: 'password',
            type: 'password',
            placeholder: 'Contraseña',
            attributes: { maxlength: 10 }
          }
        ],
        buttons: [
          { text: 'Cancelar', role: 'cancel', handler: () => resolve(false) },
          {
            text: 'Confirmar',
            handler: (data) => {
              if (data.password === '0140') {
                resolve(true);
              } else {
                this.utilsSvc.presentToast({ message: 'Contraseña incorrecta', color: 'danger', duration: 2000 });
                resolve(false);
              }
            }
          }
        ]
      });
      await alert.present();
    });
  }

  filterSucursales() {
    const term = this.searchSucursal.toLowerCase().trim();
    if (!term) {
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
        expanded: true,
        sucursales: grupo.sucursales.filter(s => s.toLowerCase().includes(term))
      }))
      .filter(grupo => grupo.sucursales.length > 0);
  }

  selectSucursal(sucursal: string) {
    this.form.patchValue({ sucursal });
    this.searchSucursal = '';
    this.filteredSucursales = this.sucursalesPorProvincia.map(grupo => ({
      provincia: grupo.provincia,
      expanded: grupo.expanded,
      sucursales: [...grupo.sucursales]
    }));
    this.cargarMaterialesSucursal(sucursal);
  }

  toggleProvincia(index: number) {
    if (!this.searchSucursal) {
      this.filteredSucursales[index].expanded = !this.filteredSucursales[index].expanded;
      this.sucursalesPorProvincia[index].expanded = this.filteredSucursales[index].expanded;
    }
  }

  async ngOnInit() {
    this.user = this.utilsSvc.getElementFromLocalStorage('user');
    if (!this.task) this.finalizada = false;

    const now = new Date();
    this.minDate = this.formatDateForDateTimePicker(now);
    const max = new Date();
    max.setFullYear(now.getFullYear() + 1);
    this.maxDate = this.formatDateForDateTimePicker(max);

    this.filteredSucursales = this.sucursalesPorProvincia.map(grupo => ({
      provincia: grupo.provincia,
      expanded: grupo.expanded,
      sucursales: [...grupo.sucursales]
    }));

    if (this.task) {
      this.materialesOriginales = JSON.parse(JSON.stringify(this.task.materiales || []));
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
        sucursal: this.task.sucursal || ''
      };
      this.form.patchValue(taskData);
      this.finalizada = this.task.finalizada || false;
      this.orderImage = this.task.orderImage || '';
      this.orderImagePath = this.task.orderImagePath || '';
      this.orderFileName = this.task.orderFileName || '';
      this.selectedDate = this.formatDateForInput(this.task.createdAt);
      this.isTecnicoReadOnly = true;
      if (this.task.sucursal) {
        this.cargarMaterialesSucursal(this.task.sucursal);
      }
    } else {
      const now = new Date();
      this.selectedDate = this.formatDateForDateTimePicker(now);
      const tecnicoNombre = this.user?.name || '';
      this.form.patchValue({
        createdAt: now.toISOString(),
        materiales: [],
        tecnicoNombre: tecnicoNombre,
        sucursal: ''
      });
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

    this.form.get('sucursal')?.valueChanges.subscribe(sucursal => {
      if (sucursal) {
        this.cargarMaterialesSucursal(sucursal);
      } else {
        this.materialesDisponibles = [];
      }
    });
  }

  // ========== MÉTODOS PARA MATERIALES DESDE STOCK ==========
  async cargarMaterialesSucursal(sucursal: string) {
    try {
      const ownerUid = this.authSvc.getTasksOwnerUid();
      this.materialesDisponibles = await this.firebaseSvc.getSucursalStock(ownerUid, sucursal);
    } catch (error) {
      console.error('Error cargando stock de sucursal', error);
    }
  }

  async agregarMaterialDesdeStock() {
    if (!this.form.value.sucursal) {
      this.utilsSvc.presentToast({ message: 'Primero selecciona una sucursal', color: 'warning', duration: 2000 });
      return;
    }
    if (this.materialesDisponibles.length === 0) {
      this.utilsSvc.presentToast({ message: 'No hay materiales disponibles en esta sucursal', color: 'medium', duration: 2000 });
      return;
    }

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Seleccionar material',
      buttons: [
        ...this.materialesDisponibles.map(mat => ({
          text: `${mat.nombre} (${mat.cantidad} ${mat.unidad})`,
          handler: () => this.promptCantidadDesdeStock(mat)
        })),
        { text: 'Cancelar', role: 'cancel' }
      ]
    });
    await actionSheet.present();
  }

  async promptCantidadDesdeStock(material: MaterialSucursal) {
    const alert = await this.alertCtrl.create({
      header: `Usar ${material.nombre}`,
      subHeader: `Stock en sucursal: ${material.cantidad} ${material.unidad}`,
      inputs: [
        {
          name: 'cantidad',
          type: 'number',
          placeholder: `Cantidad (${material.unidad})`,
          min: 0.1,
     
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Agregar',
          handler: async (data) => {
            const cantidad = +data.cantidad;
            if (!cantidad || cantidad <= 0) {
              this.utilsSvc.presentToast({ message: 'Cantidad inválida', color: 'warning' });
              return;
            }
            if (cantidad > material.cantidad) {
              this.utilsSvc.presentToast({ message: `Solo hay ${material.cantidad} ${material.unidad}`, color: 'danger' });
              return;
            }
            const nuevoMaterial: Material = {
              insumoId: material.insumoId,
              nombre: material.nombre,
              cantidad: cantidad,
              unidad: material.unidad,
              observacion: `Consumo desde orden #${this.form.value.title || 'nueva'}`
            };
            const materialesActuales = this.form.value.materiales || [];
            this.form.patchValue({ materiales: [...materialesActuales, nuevoMaterial] });
            this.nuevosMaterialesAgregados.push(nuevoMaterial);
            this.utilsSvc.presentToast({ message: 'Material agregado (se descontará al guardar)', color: 'success', duration: 2000 });
            this.cargarMaterialesSucursal(this.form.value.sucursal!);
          }
        }
      ]
    });
    await alert.present();
  }

  // ========== MÉTODOS PARA MATERIALES MANUALES ==========
  resetMaterialForm() {
    this.nuevoMaterialNombre = '';
    this.nuevoMaterialCantidad = 1;
    this.nuevoMaterialUnidad = 'unidad';
    this.nuevoMaterialObservacion = '';
    this.editandoMaterialIndex = null;
  }

  async editarMaterial(index: number) {
    const material = this.form.value.materiales?.[index];
    if (!material) return;
    if (this.necesitaPasswordParaMateriales()) {
      const ok = await this.validarPasswordMaterial();
      if (!ok) return;
    }
    this.nuevoMaterialNombre = material.nombre;
    this.nuevoMaterialCantidad = material.cantidad || 1;
    this.nuevoMaterialUnidad = material.unidad || 'unidad';
    this.nuevoMaterialObservacion = material.observacion || '';
    this.editandoMaterialIndex = index;
    setTimeout(() => {
      const element = document.querySelector('.materiales-form-section');
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  async eliminarMaterial(index: number) {
    if (this.necesitaPasswordParaMateriales()) {
      const ok = await this.validarPasswordMaterial();
      if (!ok) return;
    }
    const materialesActuales = this.form.value.materiales || [];
    const eliminado = materialesActuales[index];
    materialesActuales.splice(index, 1);
    this.form.patchValue({ materiales: materialesActuales });
    const idxNuevo = this.nuevosMaterialesAgregados.findIndex(m => m === eliminado);
    if (idxNuevo !== -1) this.nuevosMaterialesAgregados.splice(idxNuevo, 1);
    this.utilsSvc.presentToast({ message: 'Material eliminado', color: 'warning', duration: 1500 });
    if (this.editandoMaterialIndex === index) {
      this.resetMaterialForm();
    } else if (this.editandoMaterialIndex !== null && this.editandoMaterialIndex > index) {
      this.editandoMaterialIndex--;
    }
  }

  async agregarMaterialManual() {
    if (!this.nuevoMaterialNombre || !this.nuevoMaterialNombre.trim()) {
      this.utilsSvc.presentToast({ message: '⚠️ Debes ingresar el nombre del material', color: 'warning', duration: 2000 });
      return;
    }

    const nuevo: Material = {
      nombre: this.nuevoMaterialNombre.trim(),
      cantidad: this.nuevoMaterialCantidad || 1,
      unidad: this.nuevoMaterialUnidad || 'unidad',
      observacion: this.nuevoMaterialObservacion?.trim() || ''
    };

    const materialesActuales = this.form.value.materiales || [];

    if (this.editandoMaterialIndex !== null) {
      if (this.necesitaPasswordParaMateriales()) {
        const ok = await this.validarPasswordMaterial();
        if (!ok) return;
      }
      materialesActuales[this.editandoMaterialIndex] = nuevo;
      this.form.patchValue({ materiales: materialesActuales });
      this.utilsSvc.presentToast({ message: '✅ Material actualizado', color: 'success', duration: 1500 });
      this.resetMaterialForm();
    } else {
      this.form.patchValue({ materiales: [...materialesActuales, nuevo] });
      this.nuevosMaterialesAgregados.push(nuevo);
      this.utilsSvc.presentToast({ message: '✅ Material agregado', color: 'success', duration: 1500 });
      this.resetMaterialForm();
    }
  }

  getMaterialesResumen(): string {
    const materiales = this.form.value.materiales || [];
    if (materiales.length === 0) return 'Sin materiales registrados';
    const totalItems = materiales.length;
    const totalCantidad = materiales.reduce((sum, m) => sum + (m.cantidad || 0), 0);
    return `${totalItems} material(es) - Total: ${totalCantidad} ${materiales[0]?.unidad || 'unidades'}`;
  }

  // ========== MÉTODOS PARA TAREAS ==========
  createItem() {
    this.utilsSvc.presentAlert({
      header: 'Nueva tarea',
      inputs: [{ name: 'name', type: 'textarea', placeholder: 'Detalle de la tarea...', attributes: { maxlength: 200 } }],
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

  // ========== CONSUMO DE MATERIALES ==========
  private async consumirMaterialesStock() {
    const sucursal = this.form.value.sucursal;
    if (!sucursal) return;
    const ordenNumero = this.form.value.title;
    let materialesAConsumir: Material[] = [];

    if (!this.isEditMode()) {
      materialesAConsumir = (this.form.value.materiales || []).filter(m => m.insumoId);
    } else {
      materialesAConsumir = this.nuevosMaterialesAgregados.filter(m => m.insumoId);
    }

    for (const mat of materialesAConsumir) {
      try {
        await this.firebaseSvc.usarMaterialEnSucursal(
          this.authSvc.getTasksOwnerUid(),
          sucursal,
          mat.insumoId!,
          mat.cantidad!,
          ordenNumero,
          `Consumo en orden de trabajo ${ordenNumero}`
        );
      } catch (error) {
        console.error(`Error consumiendo material ${mat.nombre}:`, error);
        this.utilsSvc.presentToast({ message: `Error al consumir ${mat.nombre}`, color: 'danger', duration: 2000 });
      }
    }
  }

  // ========== MÉTODOS PARA IMÁGENES ==========
  compressImage(dataUrl: string, maxWidth: number = 800, quality: number = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = (err) => reject(err);
      img.src = dataUrl;
    });
  }

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
    const sheet = await this.actionSheetCtrl.create({ header: 'Orden de trabajo', buttons });
    await sheet.present();
  }

  async takePhoto() {
    if (this.isIOSWeb()) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = async (event: Event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        await this.utilsSvc.presentLoading({ message: 'Procesando imagen...' });
        const reader = new FileReader();
        reader.onload = async (e) => {
          const dataUrl = e.target?.result as string;
          const compressed = await this.compressImage(dataUrl, 800, 0.7);
          const sizeMB = this.getDataUrlSizeInMB(compressed);
          if (sizeMB > 0.95) {
            const moreCompressed = await this.compressImage(dataUrl, 600, 0.5);
            this.saveImage(moreCompressed, 'camera', this.getDataUrlSizeInMB(moreCompressed));
          } else {
            this.saveImage(compressed, 'camera', sizeMB);
          }
          await this.utilsSvc.dismissLoading();
        };
        reader.onerror = async () => {
          await this.utilsSvc.dismissLoading();
          this.utilsSvc.presentToast({ message: 'Error al leer la imagen', color: 'danger' });
        };
        reader.readAsDataURL(file);
      };
      input.click();
    } else {
      await this.utilsSvc.presentLoading({ message: 'Procesando imagen...' });
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
        const compressed = await this.compressImage(img.dataUrl!, 800, 0.7);
        const sizeMB = this.getDataUrlSizeInMB(compressed);
        if (sizeMB > 0.95) {
          const moreCompressed = await this.compressImage(img.dataUrl!, 600, 0.5);
          this.saveImage(moreCompressed, 'camera', this.getDataUrlSizeInMB(moreCompressed));
        } else {
          this.saveImage(compressed, 'camera', sizeMB);
        }
        await this.utilsSvc.dismissLoading();
      } catch (error) {
        await this.utilsSvc.dismissLoading();
        console.error('Error tomando foto:', error);
        this.utilsSvc.presentToast({ message: 'Error al tomar la foto', color: 'danger', duration: 3000 });
      }
    }
  }

  async selectFromGallery() {
    if (this.isIOSWeb()) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (event: Event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        await this.utilsSvc.presentLoading({ message: 'Procesando imagen...' });
        const reader = new FileReader();
        reader.onload = async (e) => {
          const dataUrl = e.target?.result as string;
          const compressed = await this.compressImage(dataUrl, 800, 0.7);
          const sizeMB = this.getDataUrlSizeInMB(compressed);
          if (sizeMB > 0.95) {
            const moreCompressed = await this.compressImage(dataUrl, 600, 0.5);
            this.saveImage(moreCompressed, 'gallery', this.getDataUrlSizeInMB(moreCompressed));
          } else {
            this.saveImage(compressed, 'gallery', sizeMB);
          }
          await this.utilsSvc.dismissLoading();
        };
        reader.onerror = async () => {
          await this.utilsSvc.dismissLoading();
          this.utilsSvc.presentToast({ message: 'Error al leer la imagen', color: 'danger' });
        };
        reader.readAsDataURL(file);
      };
      input.click();
    } else {
      await this.utilsSvc.presentLoading({ message: 'Procesando imagen...' });
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
        const compressed = await this.compressImage(img.dataUrl!, 800, 0.7);
        const sizeMB = this.getDataUrlSizeInMB(compressed);
        if (sizeMB > 0.95) {
          const moreCompressed = await this.compressImage(img.dataUrl!, 600, 0.5);
          this.saveImage(moreCompressed, 'gallery', this.getDataUrlSizeInMB(moreCompressed));
        } else {
          this.saveImage(compressed, 'gallery', sizeMB);
        }
        await this.utilsSvc.dismissLoading();
      } catch (error) {
        await this.utilsSvc.dismissLoading();
        console.error('Error seleccionando imagen:', error);
        this.utilsSvc.presentToast({ message: 'Error al seleccionar imagen', color: 'danger', duration: 3000 });
      }
    }
  }

  getDataUrlSizeInMB(dataUrl: string): number {
    if (!dataUrl.includes(',')) return 0;
    const base64Data = dataUrl.split(',')[1];
    const padding = (dataUrl.charAt(dataUrl.length - 2) === '=') ? 2 : (dataUrl.charAt(dataUrl.length - 1) === '=') ? 1 : 0;
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
    this.utilsSvc.presentToast({ message: `Imagen cargada${sizeMsg}`, color: 'success', duration: 2000 });
  }

  removeImage() {
    this.orderImage = '';
    this.orderImagePath = '';
    this.orderFileName = '';
    this.form.patchValue({ orderImage: '', orderImagePath: '', orderFileName: '', orderImageAt: null });
    this.utilsSvc.presentToast({ message: 'Imagen eliminada', color: 'success', duration: 2000 });
  }

  async viewCurrentImage() {
    const modal = await this.modalCtrl.create({
      component: ImageModalComponent,
      componentProps: { imageUrl: this.orderImage, title: this.orderFileName || 'Orden de trabajo' }
    });
    await modal.present();
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
    this.form.patchValue({ createdAt: localDate.toISOString() });
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
    if (!date) return this.formatDateForDateTimePicker(new Date());
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return this.formatDateForDateTimePicker(new Date());
      return this.formatDateForDateTimePicker(dateObj);
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return this.formatDateForDateTimePicker(new Date());
    }
  }

  // ========== GUARDADO ==========
  async checkPasswordAndSubmit() {
    if (!this.isOnline) {
      this.utilsSvc.presentToast({ message: '❌ Sin conexión. No se puede guardar.', color: 'danger', duration: 3000 });
      return;
    }
    if (this.form.invalid) {
      this.utilsSvc.presentToast({ message: '❌ Complete todos los campos requeridos', color: 'danger', duration: 3000 });
      return;
    }
    const modal = await this.modalCtrl.create({ component: PasswordModalComponent });
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
    if (this.form.invalid || this.isUploadingImage) return;
    this.task ? this.updateTask() : this.createTask();
  }

  async createTask() {
    await this.utilsSvc.presentLoading({ message: 'Creando tarea...' });
    try {
      const ownerUid = this.authSvc.getTasksOwnerUid();
      const orderNumber = await this.firebaseSvc.getNextOrderNumber(ownerUid);
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
        sucursal: this.form.value.sucursal
      };
      await this.firebaseSvc.addTask(ownerUid, formData);
      await this.consumirMaterialesStock();
      await this.utilsSvc.dismissLoading();
      await this.utilsSvc.dismissModal({ success: true });
      this.utilsSvc.presentToast({ message: '✅ Tarea creada y materiales descontados', color: 'success', duration: 2000 });
    } catch (error) {
      console.error('❌ Error en createTask:', error);
      await this.utilsSvc.dismissLoading();
      this.utilsSvc.presentToast({ message: 'Error al crear la tarea', color: 'danger', duration: 3000 });
    }
  }

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
        sucursal: this.form.value.sucursal
      };
      await this.firebaseSvc.updateTask(taskPath, formData);
      await this.consumirMaterialesStock();
      await this.utilsSvc.dismissLoading();
      await this.utilsSvc.dismissModal({ success: true });
      this.utilsSvc.presentToast({ message: '✅ Tarea actualizada y nuevos materiales descontados', color: 'success', duration: 2000 });
    } catch (error) {
      console.error('Error en updateTask:', error);
      await this.utilsSvc.dismissLoading();
      this.utilsSvc.presentToast({ message: 'Error al actualizar la tarea', color: 'danger', duration: 3000 });
    }
  }
}