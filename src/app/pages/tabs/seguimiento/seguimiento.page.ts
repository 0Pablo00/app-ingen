import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

interface TecnicoUbicacion {
  id: string;
  lat: number;
  lng: number;
  name?: string;
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
  private subscription: Subscription | undefined;

  constructor(private afs: AngularFirestore) {
    // Leer de la colección 'users'
    this.tecnicos$ = this.afs.collection('users').snapshotChanges().pipe(
      map(actions => actions
        .map(a => {
          const data = a.payload.doc.data() as any;
          return {
            id: a.payload.doc.id,
            lat: data.lat,
            lng: data.lng,
            name: data.name
          };
        })
        .filter(t => t.lat && t.lng) // solo los que tienen ubicación
      )
    );
  }

  ngAfterViewInit() {
    this.cargarMapa();
    this.subscription = this.tecnicos$.subscribe(tecnicos => {
      this.actualizarMarcadores(tecnicos);
    });
  }

  ngOnDestroy() {
    if (this.subscription) this.subscription.unsubscribe();
  }

  cargarMapa() {
    const centro = { lat: -34.6037, lng: -58.3816 }; // Buenos Aires (punto inicial)
    const opciones = {
      center: centro,
      zoom: 13,
    };
    this.map = new google.maps.Map(this.mapContainer.nativeElement, opciones);
  }

  actualizarMarcadores(tecnicos: TecnicoUbicacion[]) {
    // Limpiar marcadores anteriores
    this.markers.forEach(m => m.setMap(null));
    this.markers = [];

    tecnicos.forEach(t => {
      if (t.lat && t.lng) {
        const titulo = t.name ? `${t.name} (${t.id})` : `Técnico: ${t.id}`;
        const marker = new google.maps.Marker({
          position: { lat: t.lat, lng: t.lng },
          map: this.map,
          title: titulo,
        });
        this.markers.push(marker);
      }
    });

    // Ajustar el mapa para que se vean todos los marcadores
    if (this.markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      this.markers.forEach(m => bounds.extend(m.getPosition()));
      this.map.fitBounds(bounds);
    }
  }
}