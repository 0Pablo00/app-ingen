import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, Subscription, of } from 'rxjs';
import { map } from 'rxjs/operators';

interface TecnicoUbicacion {
  id: string;
  lat: number;
  lng: number;
  name?: string;
  timestamp?: any;
}

interface HistorialUbicacion {
  id: string;
  lat: number;
  lng: number;
  timestamp: any;
}

@Component({
  selector: 'app-seguimiento',
  templateUrl: './seguimiento.page.html',
  styleUrls: ['./seguimiento.page.scss'],
})
export class SeguimientoPage implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  map: any;
  markers: any[] = [];

  tecnicos$: Observable<TecnicoUbicacion[]>;
  segmento: 'lista' | 'mapa' = 'lista';
  tecnicoSeleccionadoId: string | null = null;
  historial$: Observable<HistorialUbicacion[]> = of([]);

  private subscription: Subscription | undefined;

  constructor(private afs: AngularFirestore) {
    this.tecnicos$ = this.afs.collection('users').snapshotChanges().pipe(
      map(actions => actions
        .map(a => {
          const data = a.payload.doc.data() as any;
          return {
            id: a.payload.doc.id,
            lat: data.lat,
            lng: data.lng,
            name: data.name || data.email,
            timestamp: data.timestamp
          };
        })
        .filter(t => t.lat && t.lng)
      )
    );
  }

  ngAfterViewInit() {
    // No inicializamos el mapa aquí, sino cuando se necesite
    // Pero sí nos suscribimos a los técnicos para tener los datos listos
    this.subscription = this.tecnicos$.subscribe(tecnicos => {
      this.actualizarMarcadores(tecnicos);
    });
  }

  ngOnDestroy() {
    if (this.subscription) this.subscription.unsubscribe();
  }

  // Se llama al cambiar el segmento manualmente
  onSegmentChanged(event: any) {
    if (event.detail.value === 'mapa') {
      this.asegurarMapa();
    }
  }

  // Asegura que el mapa esté creado (si no, lo crea)
  asegurarMapa() {
    if (this.map) {
      // Si ya existe, forzamos resize para que ocupe el espacio visible
      google.maps.event.trigger(this.map, 'resize');
      return;
    }
    if (!this.mapContainer || !this.mapContainer.nativeElement) return;

    const centro = { lat: -34.6037, lng: -58.3816 };
    const opciones = {
      center: centro,
      zoom: 13,
    };
    this.map = new google.maps.Map(this.mapContainer.nativeElement, opciones);

    // Una vez creado, actualizamos los marcadores (ya tenemos la suscripción)
    // Pero forzamos una actualización inmediata con los últimos datos
    this.tecnicos$.pipe(map(tecnicos => tecnicos)).subscribe(tecnicos => {
      this.actualizarMarcadores(tecnicos);
    }).unsubscribe(); // solo una vez
  }

  actualizarMarcadores(tecnicos: TecnicoUbicacion[]) {
    if (!this.map) return;
    this.markers.forEach(m => m.setMap(null));
    this.markers = [];
    tecnicos.forEach(t => {
      if (t.lat && t.lng) {
        const titulo = t.name ? `${t.name}` : `ID: ${t.id}`;
        const marker = new google.maps.Marker({
          position: { lat: t.lat, lng: t.lng },
          map: this.map,
          title: titulo,
        });
        marker.addListener('click', () => {
          const infoWindow = new google.maps.InfoWindow({
            content: `<strong>${titulo}</strong><br>ID: ${t.id}`,
          });
          infoWindow.open(this.map, marker);
        });
        this.markers.push(marker);
      }
    });
    if (this.markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      this.markers.forEach(m => bounds.extend(m.getPosition()));
      this.map.fitBounds(bounds);
    }
  }

  cargarHistorial(tecnicoId: string) {
    this.tecnicoSeleccionadoId = tecnicoId;
    this.historial$ = this.afs.collection(`users/${tecnicoId}/locations`, ref =>
      ref.orderBy('timestamp', 'desc').limit(5)
    ).snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as any;
        return {
          id: a.payload.doc.id,
          lat: data.lat,
          lng: data.lng,
          timestamp: data.timestamp
        };
      }))
    );
  }

  cerrarHistorial() {
    this.tecnicoSeleccionadoId = null;
    this.historial$ = of([]);
  }

  centrarEnUbicacion(lat: number, lng: number) {
    this.segmento = 'mapa';
    this.asegurarMapa(); // se asegura de que el mapa esté listo
    if (this.map) {
      this.map.setCenter({ lat, lng });
      this.map.setZoom(16);
    }
  }

  formatearFecha(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  }
}