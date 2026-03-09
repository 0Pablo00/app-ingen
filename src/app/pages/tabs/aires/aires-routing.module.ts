import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AiresPage } from './aires.page';

const routes: Routes = [
  {
    path: '',
    component: AiresPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AiresPageRoutingModule {}
