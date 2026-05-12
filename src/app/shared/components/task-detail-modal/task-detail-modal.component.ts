import { Component, OnInit, Input } from '@angular/core';

import { ModalController } from '@ionic/angular';
import { Task } from 'src/app/models/task.model';
import { ImageModalComponent } from 'src/app/components/image-modal/image-modal.component'; // ajustá la ruta

@Component({
  selector: 'app-task-detail-modal',
  templateUrl: './task-detail-modal.component.html',
  styleUrls: ['./task-detail-modal.component.scss'],
})
export class TaskDetailModalComponent   {

async openImageModal() {
  const modal = await this.modalCtrl.create({
    component: ImageModalComponent,
    componentProps: { imageUrl: this.task.orderImage, title: `Orden ${this.task.orderNumber}` }
  });
  await modal.present();
}

   @Input() task!: Task;

  constructor(private modalCtrl: ModalController) {}

  dismiss() {
    this.modalCtrl.dismiss();
  }

  // Helper para saber si tiene imagen
  hasImage(): boolean {
    return !!this.task.orderImage;
  }

  // Obtener porcentaje de completitud de items
  getPercentage(): number {
    const items = this.task.items || [];
    if (!items.length) return 0;
    const completed = items.filter(i => i.completed).length;
    return Math.round((completed / items.length) * 100);
  }
}
