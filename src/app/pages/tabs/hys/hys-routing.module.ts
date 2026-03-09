import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { HysPage } from './hys.page';

const routes: Routes = [
  {
    path: '',
    component: HysPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HysPageRoutingModule {}
