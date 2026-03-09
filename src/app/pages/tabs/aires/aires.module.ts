import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AiresPageRoutingModule } from './aires-routing.module';
import { SharedModule } from 'src/app/shared/shared.module';
import { AiresPage } from './aires.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AiresPageRoutingModule,
    SharedModule
  ],
  declarations: [AiresPage]
})
export class AiresPageModule {}
