import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { CustomInputComponent } from './components/custom-input/custom-input.component';
import { LogoComponent } from './components/logo/logo.component';
import { NgCircleProgressModule } from 'ng-circle-progress';
import { AddUpdateTaskComponent } from './components/add-update-task/add-update-task.component';
import { PasswordModalComponent } from './components/password-modal/password-modal.component';
import { TranslateDatePipe } from './pipes/translate-date.pipe'; // Ajusta el path
import { AddGuardiasComponent } from './components/add-guardias/add-guardias.component';
import { AddElectricistasComponent } from './components/add-electricistas/add-electricistas.component';
import { MaterialComponent } from './components/material/material.component';
import { AddOrdenesComponent } from './components/add-ordenes/add-ordenes.component';
import { AddHysComponent } from './components/add-hys/add-hys.component';
import { ImageModalComponent } from 'src/app/components/image-modal/image-modal.component'; // Asegúrate de importar esto
import { EditOrderNumberModalComponent } from './components/edit-order-number-modal/edit-order-number-modal.component';



@NgModule({
  declarations: [
    HeaderComponent,
    CustomInputComponent,
    LogoComponent,
    AddUpdateTaskComponent,
    PasswordModalComponent,
    TranslateDatePipe,// Declara el pipe aquí
    AddGuardiasComponent,
    AddElectricistasComponent,
    MaterialComponent,
    AddOrdenesComponent,
    AddHysComponent,  AddUpdateTaskComponent ,
    ImageModalComponent,
    EditOrderNumberModalComponent
  ],
  exports: [
    HeaderComponent,
    CustomInputComponent,
    LogoComponent,
    IonicModule,
    NgCircleProgressModule,
    AddUpdateTaskComponent,
    PasswordModalComponent,
    TranslateDatePipe,// Exporta el pipe si es necesario
    AddGuardiasComponent,
    AddElectricistasComponent,
    MaterialComponent,
    AddOrdenesComponent,
    AddHysComponent,  AddUpdateTaskComponent,
    ImageModalComponent,
    EditOrderNumberModalComponent
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgCircleProgressModule.forRoot({
      radius: 100,
      outerStrokeWidth: 16,
      innerStrokeWidth: 8,
      outerStrokeColor: "#78C000",
      innerStrokeColor: "#C7E596",
      animationDuration: 300,
    })
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SharedModule { }
