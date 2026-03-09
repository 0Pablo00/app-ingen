import { Component, Input } from '@angular/core';
import { ModalController, Platform } from '@ionic/angular';

@Component({
  selector: 'app-image-modal',
  templateUrl: './image-modal.component.html',
  styleUrls: ['./image-modal.component.scss'],
})
export class ImageModalComponent {
  @Input() imageUrl: string;
  @Input() title: string;

  constructor(
    private modalCtrl: ModalController,
    public platform: Platform
  ) {}

  dismiss() {
    this.modalCtrl.dismiss();
  }

  // Compartir usando Web Share API si está disponible
  async shareImage() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: this.title || 'Orden de trabajo',
          text: 'Imagen de orden de trabajo',
          url: this.imageUrl,
        });
      } catch (error) {
        console.log('Compartir cancelado o no soportado:', error);
      }
    } else {
      // Fallback para navegadores que no soportan share
      alert('Tu dispositivo no soporta compartir nativamente');
    }
  }

  // Método simple para sugerir guardar
  suggestSave() {
    alert('Para guardar la imagen: mantén presionada la imagen y selecciona "Guardar imagen"');
  }
}