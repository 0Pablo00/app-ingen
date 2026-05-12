import { Injectable } from '@angular/core';
import { AngularFireMessaging } from '@angular/fire/compat/messaging';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { UtilsService } from './utils.service';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(
    private afMessaging: AngularFireMessaging,
    private firestore: AngularFirestore,
    private utilsSvc: UtilsService
  ) {}

  async requestPermissionAndGetToken(userId: string) {
    try {
      // 1. Solicitar permiso al usuario
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.warn('Permiso de notificaciones denegado');
        return null;
      }

      // 2. Obtener token FCM (con VAPID key desde environment)
      // Nota: La VAPID key debe estar configurada en Firebase Console
      const token = await firstValueFrom(this.afMessaging.getToken);
      
      if (token) {
        console.log('Token FCM obtenido:', token);
        
        // 3. Guardar token en Firestore asociado al usuario
        await this.saveTokenToFirestore(userId, token);
        
        return token;
      }
      
      return null;
    } catch (error) {
      console.error('Error al obtener token:', error);
      return null;
    }
  }

  private async saveTokenToFirestore(userId: string, token: string) {
    try {
      // Usar la sintaxis de AngularFire compat
      await this.firestore
        .collection('users')
        .doc(userId)
        .collection('tokens')
        .doc(token)
        .set({
          token: token,
          createdAt: new Date(),
          platform: 'pwa',
          userAgent: navigator.userAgent
        });
      
      console.log('Token guardado en Firestore');
    } catch (error) {
      console.error('Error al guardar token:', error);
    }
  }

 listenToMessages() {
  this.afMessaging.messages.subscribe((payload: any) => {
    console.log('Notificación recibida en primer plano:', payload);
    // Si quieres mostrar un toast, descomenta la línea de abajo
    // this.utilsSvc.presentToast({...});
  });
}
  }
