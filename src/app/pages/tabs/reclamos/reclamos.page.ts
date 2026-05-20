import { Component, OnInit } from '@angular/core';
import { ModalController, AlertController } from '@ionic/angular';
import { FirebaseService } from 'src/app/services/firebase.service';
import { Reclamo } from 'src/app/models/reclamo.model';
import { CreateReclamoComponent } from 'src/app/shared/components/create-reclamo/create-reclamo.component';

interface Zona {
  nombre: string;
  sucursales: string[];
}

@Component({
  selector: 'app-reclamos',
  templateUrl: './reclamos.page.html',
  styleUrls: ['./reclamos.page.scss'],
})
export class ReclamosPage implements OnInit {
  viewMode: 'chrono' | 'grouped' | 'zone' = 'chrono';
  reclamos: Reclamo[] = [];
  groupedReclamos: { sucursal: string; reclamos: Reclamo[] }[] = [];
  showingFinalizados = false;

  // Nueva estructura para zona con colores calculados
  groupedByZone: {
    zona: string;
    zoneColor: string;
    sucursales: {
      sucursal: string;
      reclamos: Reclamo[];
      colorClass: string;
    }[];
  }[] = [];

  zonas: Zona[] = [
    {
      nombre: 'Las Heras',
      sucursales: ['OLASCOAGA', 'CENTRAL', 'TROME', 'INDEPENDENCIA', 'EL BOSQUE', 'ROTONDA', 'ALGARROBAL', 'MOYANO', 'MARTIN FIERRO', 'SAN MIGUEL', 'FRIMI 2', 'RAIZ']
    },
    {
      nombre: 'Ciudad',
      sucursales: ['AMIGORENA', 'PERU', 'JUAN B JUSTO', 'DOVIR', 'PADRE LLORENS', 'SOMECA']
    },
    {
      nombre: 'Guaymallén',
      sucursales: ['UNIMED', 'BUENA NUEVA', 'NUEVO DORREGO', 'PEDRO MOLINA', 'CORREA SAA', 'DON BOSCO', 'CANO', 'CAPILLA DEL ROSARIO', 'AVELLANEDA', 'SANTA ANA', 'EL PIDIO', 'EL CISNE', 'CORRALITO', 'PADDLE', 'GUTEMBERG']
    },
    {
      nombre: 'Godoy Cruz',
      sucursales: ['ESTANZUELA', 'SPORTMAN', 'MARINI', 'CASTELLI', 'COVIMET', 'CERVANTES', 'JARDIN SERRANO', 'PERITO MORENO']
    },
    {
      nombre: 'Lavalle',
      sucursales: ['TULUMAYA', 'LAVALLE', 'COSTA DE ARAUJO']
    },
    {
      nombre: 'Zona Este',
      sucursales: ['BARRIALES', 'TERMINAL', 'PALMIRA', 'FAUSTINO', 'RIVADAVIA 2', 'RIVADAVIA 3', 'JUNIN', 'LA COLONIA', 'CATITAS']
    },
    {
      nombre: 'Maipú',
      sucursales: ['RODEO DEL MEDIO', 'TROPERO SOSA', 'BELTRAN', 'LUZURIAGA', 'GIOL']
    },
    {
      nombre: 'Luján',
      sucursales: ['VISTALBA', 'ESTACION', 'CARRODILLA', 'PEDRIEL', 'LUJAN']
    },
    {
      nombre: 'San Juan',
      sucursales: ['CAUCETE', 'CHIMBAS', 'CONCEPCION', 'GRANADEROS', 'LA ROSA', 'MEDIA AGUA', 'POCITO', 'RAWSON', 'SANTA LUCIA', 'ZONDA 4']
    }
  ];

  constructor(
    private firebaseSvc: FirebaseService,
    private modalCtrl: ModalController,
    private alertController: AlertController,
  ) {}

  ngOnInit() {
    this.loadReclamos();
  }

  async loadReclamos() {
    if (this.showingFinalizados) {
      this.reclamos = await this.firebaseSvc.getReclamosFinalizados();
    } else {
      this.reclamos = await this.firebaseSvc.getReclamosActivos();
    }
    this.buildGrouped();
    this.buildGroupedByZone();
  }

  buildGrouped() {
    const map = new Map<string, Reclamo[]>();
    this.reclamos.forEach(r => {
      const key = r.sucursal;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    this.groupedReclamos = Array.from(map.entries())
      .map(([sucursal, reclamos]) => ({ sucursal, reclamos }))
      .sort((a, b) => a.sucursal.localeCompare(b.sucursal));
  }

  buildGroupedByZone() {
    const sucursalZonaMap = new Map<string, string>();
    this.zonas.forEach(zona => {
      zona.sucursales.forEach(suc => {
        sucursalZonaMap.set(suc, zona.nombre);
      });
    });

    const zonaMap = new Map<string, Map<string, Reclamo[]>>();
    this.reclamos.forEach(r => {
      const zona = sucursalZonaMap.get(r.sucursal) || 'Sin zona';
      if (!zonaMap.has(zona)) {
        zonaMap.set(zona, new Map<string, Reclamo[]>());
      }
      const sucursalMap = zonaMap.get(zona)!;
      if (!sucursalMap.has(r.sucursal)) {
        sucursalMap.set(r.sucursal, []);
      }
      sucursalMap.get(r.sucursal)!.push(r);
    });

    this.groupedByZone = Array.from(zonaMap.entries()).map(([zona, sucursalMap]) => {
      const sucursalesArray = Array.from(sucursalMap.entries()).map(([sucursal, reclamos]) => ({
        sucursal,
        reclamos,
        colorClass: this.getColorClassForGroup(reclamos)
      }));

      // Color de la zona según la peor sucursal
      let zoneColor = '';
      for (const suc of sucursalesArray) {
        if (suc.colorClass === 'reclamo-rojo') {
          zoneColor = 'reclamo-rojo';
          break;
        } else if (suc.colorClass === 'reclamo-amarillo') {
          zoneColor = 'reclamo-amarillo';
        }
      }

      return {
        zona,
        sucursales: sucursalesArray,
        zoneColor
      };
    }).sort((a, b) => a.zona.localeCompare(b.zona));
  }

  segmentChanged() {}

  toggleFinalizados() {
    this.showingFinalizados = !this.showingFinalizados;
    this.loadReclamos();
  }

  async openCreateModal(reclamo?: Reclamo) {
    const modal = await this.modalCtrl.create({
      component: CreateReclamoComponent,
      componentProps: { reclamo: reclamo || null }
    });
    modal.onDidDismiss().then((result) => {
      if (result.data?.refresh) {
        this.loadReclamos();
      }
    });
    await modal.present();
  }

  async deleteReclamo(reclamo: Reclamo) {
    const alert = await this.alertController.create({
      header: 'Confirmar',
      message: `¿Eliminar el reclamo de ${reclamo.sucursal}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          handler: async () => {
            await this.firebaseSvc.deleteReclamo(reclamo.id!);
            this.loadReclamos();
          }
        }
      ]
    });
    await alert.present();
  }

  async editarReclamo(reclamo: Reclamo) {
    this.openCreateModal(reclamo);
  }

  getColorClass(reclamo: Reclamo): string {
    if (reclamo.finalizado) return '';
    const creado = new Date(reclamo.createdAt).getTime();
    const ahora = Date.now();
    const diferenciaDias = Math.floor((ahora - creado) / (1000 * 60 * 60 * 24));
    if (diferenciaDias >= 3) return 'reclamo-rojo';
    if (diferenciaDias >= 2) return 'reclamo-amarillo';
    return '';
  }

  // 🔥 NUEVO: color para un grupo de reclamos (sucursal o zona)
  getColorClassForGroup(reclamos: Reclamo[]): string {
    if (this.showingFinalizados) return '';
    let hasRed = false;
    let hasYellow = false;
    for (const r of reclamos) {
      const clase = this.getColorClass(r);
      if (clase === 'reclamo-rojo') hasRed = true;
      else if (clase === 'reclamo-amarillo') hasYellow = true;
    }
    if (hasRed) return 'reclamo-rojo';
    if (hasYellow) return 'reclamo-amarillo';
    return '';
  }
}