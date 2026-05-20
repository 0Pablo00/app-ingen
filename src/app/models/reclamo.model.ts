export interface Reclamo {
  id?: string;
  sucursal: string;
  provincia: string;
  texto: string;
  createdAt: string;
  finalizado?: boolean;
  fechaFinalizado?: string;   // ISO string
   createdByName?: string;
}