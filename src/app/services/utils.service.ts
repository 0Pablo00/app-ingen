import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Task } from '../models/task.model';
import { AlertController, AlertOptions, LoadingController, LoadingOptions, ModalController, ModalOptions, ToastController, ToastOptions } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  constructor(
    private loadingController: LoadingController,
    private router: Router,
    private toastController: ToastController,
    private alertController: AlertController,
    private modalController: ModalController
  ) { }

  // =========  Loading ========
  // PRESENT - MODIFICADO PARA DEVOLVER EL OBJETO LOADING
  async presentLoading(opts?: LoadingOptions) {
    const loading = await this.loadingController.create(opts);
    await loading.present();
    return loading; // 👈 IMPORTANTE: DEVOLVER PARA PODER HACER DISMISS
  }

  // DISMISS
  async dismissLoading() {
    try {
      await this.loadingController.dismiss();
    } catch (error) {
      console.error('Error dismissing loading:', error);
    }
  }

  // ========== LocalStorage ==========
  // SET
  setElementToLocalStorage(key: string, element: any) {
    try {
      localStorage.setItem(key, JSON.stringify(element));
    } catch (error) {
      console.error(`Error setting localStorage item with key ${key}:`, error);
    }
  }

  // GET
  getElementFromLocalStorage(key: string) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error getting localStorage item with key ${key}:`, error);
      return null;
    }
  }

  async presentToast(opts: ToastOptions) {
    const toast = await this.toastController.create(opts);
    toast.present();
  }

  // ======== Router ========
  routerLink(url: string) {
    return this.router.navigateByUrl(url);
  }

  // ======== Alert ==========
  async presentAlert(opts: AlertOptions) {
    const alert = await this.alertController.create(opts);
    await alert.present();
  }

  // ======== Modal =========
  // PRESENT
  async presentModal(opts: ModalOptions) {
    const modal = await this.modalController.create(opts);
    await modal.present();
    const { data } = await modal.onWillDismiss();
    return data ? data : null;
  }

  // DISMISS
  dismissModal(data?: any) {
    this.modalController.dismiss(data);
  }

  getPercentage(task: Task) {
    if (!task || !Array.isArray(task.items) || task.items.length === 0) {
      return 0;
    }

    let completedItems = task.items.filter(item => item.completed).length;
    let totalItems = task.items.length;
    let percentage = (100 / totalItems) * completedItems;
    return Math.floor(percentage);
  }

  // Método para formatear fecha localmente
  formatLocalDate(dateInput: string | Date | number): string {
    let date: Date;
    
    if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else if (typeof dateInput === 'number') {
      date = new Date(dateInput);
    } else {
      date = dateInput;
    }
    
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  // Método para obtener fecha actual en formato para datetime picker
  getCurrentLocalDateTime(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}