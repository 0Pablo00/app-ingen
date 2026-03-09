import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { HysPageRoutingModule } from './hys-routing.module';
import { SharedModule } from 'src/app/shared/shared.module';
import { HysPage } from './hys.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HysPageRoutingModule,
    SharedModule 
  ],
  declarations: [HysPage]
})
export class HysPageModule {}
