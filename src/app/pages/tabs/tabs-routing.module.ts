import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadChildren: () => import('./home/home.module').then(m => m.HomePageModule)
      },
      {
        path: 'finalizadas',  // 👈 NUEVA PÁGINA
        loadChildren: () => import('./finalizadas/finalizadas.module').then(m => m.FinalizadasPageModule)
      },
      {
        path: 'profile',
        loadChildren: () => import('./profile/profile.module').then(m => m.ProfilePageModule)
      },
      {
        path: 'guardias',
        loadChildren: () => import('./guardias/guardias.module').then(m => m.GuardiasPageModule)
      },
      {
        path: 'menu',
        loadChildren: () => import('./menu/menu.module').then(m => m.MenuPageModule)
      },
      {
        path: 'aires',
        loadChildren: () => import('./aires/aires.module').then(m => m.AiresPageModule)
      },
      {
        path: 'ordenes',
        loadChildren: () => import('./ordenes/ordenes.module').then(m => m.OrdenesPageModule)
      },
      {
        path: 'hys',
        loadChildren: () => import('./hys/hys.module').then(m => m.HysPageModule)
      },
      {
        path: '',
        redirectTo: '/tabs/menu', // O '/tabs/home' según prefieras
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsPageRoutingModule {}