export interface Insumo {
  id?: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  createdAt?: string;   // ✅ opcional (se genera en el servicio)
  observacion?: string;
}

export interface MaterialSucursal {
  insumoId: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  ultimaAsignacion: string; // fecha ISO
}

// Nuevo: movimiento histórico
export interface MovimientoMaterial {
  id?: string;
  insumoId: string;
  nombre: string;
  tipo: 'asignacion' | 'consumo' | 'traslado' | 'ajuste';
  cantidad: number;
  unidad: string;
  fecha: string;
  sucursalOrigen?: string;
  sucursalDestino?: string;
  ordenTrabajo?: string;
  observacion?: string;
  usuario?: string;
}