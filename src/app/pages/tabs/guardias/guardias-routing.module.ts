import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { GuardiasPage } from './guardias.page';

const routes: Routes = [
  {
    path: '',
    component: GuardiasPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GuardiasPageRoutingModule {}
