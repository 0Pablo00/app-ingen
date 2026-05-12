import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ReportesPageRoutingModule } from './reportes-routing.module';

import { ReportesPage } from './reportes.page';
import { SharedModule } from 'src/app/shared/shared.module';
import { TaskDetailModalComponent } from 'src/app/shared/components/task-detail-modal/task-detail-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReportesPageRoutingModule,
    SharedModule,
    ReportesPageRoutingModule
  ],
  declarations: [ReportesPage, TaskDetailModalComponent], 
})
export class ReportesPageModule {}
