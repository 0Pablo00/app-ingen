import { CanActivateFn } from '@angular/router';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ActivatedRouteSnapshot, CanActivate, GuardResult, MaybeAsync, RouterStateSnapshot, UrlTree } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';
import { UtilsService } from '../services/utils.service';


@Injectable({
  providedIn: 'root'

})

export class NoAuthGuard implements CanActivate {
  
  constructor(
    private firebaseSvc: FirebaseService,
    private utilsSvc: UtilsService
  ) {

  }


  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    return this.firebaseSvc.getAuthState().pipe(map(auth => {
    
        // ======== NO Existe usuario autenticado ========
      if (!auth) {
        return true;

          // ======== Existe usuario autenticado ========
      } else {

        this.utilsSvc.routerLink('/tabs/menu')
        return false;
      }

    }))



  }


}