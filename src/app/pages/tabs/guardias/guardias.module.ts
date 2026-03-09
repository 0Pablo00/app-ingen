import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { GuardiasPageRoutingModule } from './guardias-routing.module';

import { GuardiasPage } from './guardias.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    GuardiasPageRoutingModule,
    SharedModule,
    ReactiveFormsModule,
   
  ],
  declarations: [GuardiasPage]
})
export class GuardiasPageModule {}
