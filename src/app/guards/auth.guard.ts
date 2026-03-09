import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ActivatedRouteSnapshot, CanActivate, GuardResult, MaybeAsync, RouterStateSnapshot, UrlTree } from '@angular/router';
import { FirebaseService } from '../services/firebase.service';
import { UtilsService } from '../services/utils.service';




@Injectable({
  providedIn: 'root'

})


export class AuthGuard implements CanActivate {

  constructor(
    private firebaseSvc: FirebaseService,
    private utilsSvc: UtilsService
  ) {

  }


  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    return this.firebaseSvc.getAuthState().pipe(map(auth => {
      // ======== Existe usuario autenticado ========
      if (auth) {
        return true;

        // ======== NO Existe usuario autenticado ========
      } else {

        this.utilsSvc.routerLink('/auth')
        return false;
      }

    }))



  }


}