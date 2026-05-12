export interface MaintenanceCheck {
  id?: string;
  sucursal: string;           // Nombre de la sucursal
  fecha: string;              // ISO string
  tecnicoNombre: string;      // Nombre del técnico
  observaciones: string;      // Observaciones generales
  controles: ControlItem[];   // Lista de controles con estado B/R/M
  createdAt: string;          // ISO string
  createdBy: string;          // UID del usuario
  createdByName: string;      // Nombre del usuario
  updatedAt?: string;
}

export interface ControlItem {
  nombre: string;
  estado: 'B' | 'R' | 'M' | '';  // Permitir vacío
}