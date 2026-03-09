import { Injectable } from '@angular/core';
import { User } from '../models/user.model';
import { UtilsService } from './utils.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  // UID del dueño de las tareas (pafer0008@gmail.com)
  private readonly TASKS_OWNER_UID = '0xa3Lyek75Tc9iYNQPy54hzfgMv2';

  constructor(private utilsSvc: UtilsService) {}

  /**
   * Obtener el usuario del localStorage
   */
  getCurrentUser(): User | null {
    return this.utilsSvc.getElementFromLocalStorage('user');
  }

  /**
   * Verificar si el usuario es admin
   */
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  /**
   * Verificar si es operario
   */
  isOperario(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'operario';
  }

  /**
   * Obtener el UID del dueño de las tareas (todos ven las mismas)
   */
  getTasksOwnerUid(): string {
    return this.TASKS_OWNER_UID;
  }

  /**
   * Verificar si el usuario puede editar/eliminar tareas
   */
  canEditOrDelete(): boolean {
    return this.isAdmin();
  }

  /**
   * Verificar si el usuario puede ver tareas finalizadas
   */
  canViewFinalizadas(): boolean {
    return this.isAdmin();
  }

  /**
   * Obtener el rol del usuario actual
   */
  getUserRole(): string {
    const user = this.getCurrentUser();
    return user?.role || 'operario';
  }
}