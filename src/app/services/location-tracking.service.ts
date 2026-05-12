import { Injectable } from '@angular/core';
import { registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin, Location, WatcherOptions, CallbackError } from '@capacitor-community/background-geolocation';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import firebase from 'firebase/compat/app';

// Registrar el plugin
const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

@Injectable({ providedIn: 'root' })
export class LocationTrackingService {

  private watcherId: string | null = null;

  constructor(private afs: AngularFirestore) {}

  async iniciarSeguimiento(idTecnico: string) {
    // Opciones del watcher (obligatorias para segundo plano en Android)
    const watcherOptions: WatcherOptions = {
      backgroundMessage: 'App rastreando tu ubicación',   // Texto de la notificación persistente
      backgroundTitle: 'Seguimiento activo',               // Título de la notificación
      requestPermissions: true,                            // Pedir permisos si faltan
      stale: false,                                        // Solo ubicaciones actualizadas
      distanceFilter: 5,                                   // Actualizar cada 5 metros
    };

    // Iniciar el watcher y guardar su ID
    this.watcherId = await BackgroundGeolocation.addWatcher(
      watcherOptions,
      (location: Location | null, error: CallbackError | null) => {
        if (error) {
          console.error('Error al obtener ubicación:', error);
          return;
        }
        if (location) {
          console.log('📍 Nueva ubicación:', location);
          this.guardarUbicacion(idTecnico, location);
        }
      }
    );
    console.log('▶️ Watcher iniciado (ID):', this.watcherId, 'para técnico:', idTecnico);
  }

  async detenerSeguimiento() {
    if (this.watcherId) {
      await BackgroundGeolocation.removeWatcher({ id: this.watcherId });
      console.log('⏹️ Watcher detenido:', this.watcherId);
      this.watcherId = null;
    } else {
      console.log('No hay watcher activo para detener.');
    }
  }

  private guardarUbicacion(idTecnico: string, location: Location) {
    const datos = {
      lat: location.latitude,
      lng: location.longitude,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      velocidad: location.speed,
      precision: location.accuracy,
    };

    this.afs.collection('users').doc(idTecnico).set(datos, { merge: true })
      .then(() => console.log('💾 Ubicación guardada en users/' + idTecnico))
      .catch(err => console.error('Error al guardar:', err));
  }
}