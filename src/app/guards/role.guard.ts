import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UtilsService } from '../services/utils.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  
  constructor(
    private authSvc: AuthService,
    private utilsSvc: UtilsService,
    private router: Router
  ) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    const user = this.authSvc.getCurrentUser();
    
    // Si la ruta requiere un rol específico
    const requiredRole = route.data?.['role'];
    
    if (requiredRole === 'admin' && !this.authSvc.isAdmin()) {
      this.utilsSvc.presentToast({
        message: 'No tienes permisos para acceder a esta sección',
        color: 'warning',
        duration: 3000,
        icon: 'alert-circle-outline'
      });
      this.router.navigate(['/tabs/menu']);
      return false;
    }
    
    return true;
  }
}