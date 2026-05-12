import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { InsumosPageRoutingModule } from './insumos-routing.module';

import { InsumosPage } from './insumos.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    InsumosPageRoutingModule,
    SharedModule 
  ],
  declarations: [InsumosPage]
})
export class InsumosPageModule {}
