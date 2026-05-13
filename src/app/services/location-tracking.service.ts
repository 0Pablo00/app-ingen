import { Injectable } from '@angular/core';
import { registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin, Location, WatcherOptions, CallbackError } from '@capacitor-community/background-geolocation';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import firebase from 'firebase/compat/app';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

@Injectable({ providedIn: 'root' })
export class LocationTrackingService {

  private watcherId: string | null = null;

  constructor(private afs: AngularFirestore) {}

  async iniciarSeguimiento(idTecnico: string) {
    // 🔥 Si ya hay un watcher activo, lo detenemos antes de crear uno nuevo
    if (this.watcherId) {
      await this.detenerSeguimiento();
    }

    // Configuración del watcher (segundo plano)
    const watcherOptions: WatcherOptions = {
      backgroundMessage: 'App rastreando tu ubicación',
      backgroundTitle: 'Seguimiento activo',
      requestPermissions: true,
      stale: false,
      distanceFilter: 1,          // 🔥 Muy sensible (1 metro) para pruebas
    };

    // Iniciar el watcher normal
    this.watcherId = await BackgroundGeolocation.addWatcher(
      watcherOptions,
      (location: Location | null, error: CallbackError | null) => {
        if (error) {
          console.error('Error al obtener ubicación:', error);
          return;
        }
        if (location) {
          console.log('📍 Watcher - Ubicación:', location);
          this.guardarUbicacion(idTecnico, location);
        }
      }
    );
    console.log('▶️ Watcher iniciado (ID):', this.watcherId, 'para técnico:', idTecnico);
  }

  async detenerSeguimiento() {
    // Detener watcher
    if (this.watcherId) {
      await BackgroundGeolocation.removeWatcher({ id: this.watcherId });
      console.log('⏹️ Watcher detenido:', this.watcherId);
      this.watcherId = null;
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

    // 1. Actualizar documento del usuario (última ubicación)
    this.afs.collection('users').doc(idTecnico).set(datos, { merge: true })
      .then(() => console.log('💾 Última ubicación guardada en users/' + idTecnico))
      .catch(err => console.error('Error al guardar última ubicación:', err));

    // 2. Añadir entrada al historial (subcolección 'locations')
    this.afs.collection(`users/${idTecnico}/locations`).add(datos)
      .then(() => console.log('📋 Historial añadido para', idTecnico))
      .catch(err => console.error('Error al guardar historial:', err));
  }
}