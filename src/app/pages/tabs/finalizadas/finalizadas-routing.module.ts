import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FinalizadasPage } from './finalizadas.page';

const routes: Routes = [
  {
    path: '',
    component: FinalizadasPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FinalizadasPageRoutingModule {}
