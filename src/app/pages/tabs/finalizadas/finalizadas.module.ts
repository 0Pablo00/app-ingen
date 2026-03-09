import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { FinalizadasPageRoutingModule } from './finalizadas-routing.module';

import { FinalizadasPage } from './finalizadas.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FinalizadasPageRoutingModule,
    SharedModule
  ],
  declarations: [FinalizadasPage]
})
export class FinalizadasPageModule {}
