import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { OrdenesPageRoutingModule } from './ordenes-routing.module';
import { SharedModule } from 'src/app/shared/shared.module';
import { OrdenesPage } from './ordenes.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    OrdenesPageRoutingModule,
    SharedModule 
  ],
  declarations: [OrdenesPage]
})
export class OrdenesPageModule {}
