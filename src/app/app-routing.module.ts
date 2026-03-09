import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { NoAuthGuard } from './guards/no-auth.guard';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard'; // 👈 IMPORTAR NUEVO GUARD

const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () => import('./pages/auth/auth.module').then(m => m.AuthPageModule),
    canActivate: [NoAuthGuard]
  },
  {
    path: 'sign-up',
    loadChildren: () => import('./pages/auth/sign-up/sign-up.module').then(m => m.SignUpPageModule),
    canActivate: [NoAuthGuard]
  },
  {
    path: 'tabs',
    loadChildren: () => import('./pages/tabs/tabs.module').then(m => m.TabsPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'guardias',
    loadChildren: () => import('./pages/tabs/guardias/guardias.module').then(m => m.GuardiasPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'menu',
    loadChildren: () => import('./pages/tabs/menu/menu.module').then(m => m.MenuPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'aires',
    loadChildren: () => import('./pages/tabs/aires/aires.module').then(m => m.AiresPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'ordenes',
    loadChildren: () => import('./pages/tabs/ordenes/ordenes.module').then(m => m.OrdenesPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'hys',
    loadChildren: () => import('./pages/tabs/hys/hys.module').then(m => m.HysPageModule),
    canActivate: [AuthGuard]
  },
  // 👇 NUEVA RUTA PARA FINALIZADAS (si existe)
  {
    path: 'finalizadas',
    loadChildren: () => import('./pages/tabs/finalizadas/finalizadas.module').then(m => m.FinalizadasPageModule),
    canActivate: [AuthGuard, RoleGuard], // 👈 PROTEGIDA POR ROL
    data: { role: 'admin' } // 👈 SOLO ADMINS
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }