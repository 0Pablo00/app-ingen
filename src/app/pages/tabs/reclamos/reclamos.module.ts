import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ReclamosPageRoutingModule } from './reclamos-routing.module';

import { ReclamosPage } from './reclamos.page';
import {SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReclamosPageRoutingModule,
    SharedModule
  ],
  declarations: [ReclamosPage]
})
export class ReclamosPageModule {}
