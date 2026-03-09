export interface Task {
  id: string;
  title: string;
  description: string;
  items: Item[];
  date?: Date | string;
  createdAt: string | Date;  // Puede ser string o Date
  
  // AGREGAR ESTOS NUEVOS CAMPOS PARA LAS IMÁGENES
  orderImage?: string;        // Imagen en base64 o URL
  orderImagePath?: string;    // Ruta donde se guardó la imagen
  orderFileName?: string;     // Nombre del archivo
  orderImageAt?: string; // ISO string
  orderNumber?: number;  // NUEVO: número de orden autoincremental
  finalizada?: boolean;  // 👈 NUEVO CAMPO
  // 👇 NUEVOS CAMPOS PARA AUDITORÍA
  createdBy?: string;      // UID del usuario que creó la tarea
  createdByName?: string;  // Nombre del usuario que creó la tarea
  updatedBy?: string;      // UID del último usuario que actualizó
  updatedAt?: string;      // Fecha de última actualización
  
  // 👇 NUEVOS CAMPOS PARA TÉCNICO Y MATERIALES
  tecnicoNombre?: string;           // Nombre del técnico que realiza el trabajo
  materiales?: Material[];          // Array de materiales utilizados
  
  // 👇 CAMPO PARA CONTROL DE UI (NO SE GUARDA EN FIRESTORE)
  showMateriales?: boolean;  // Para controlar el toggle en la vista

  // 👇 NUEVO CAMPO PARA SUCURSAL
  sucursal?: string;                // Sucursal donde se realiza el trabajo
}

export interface Item {
  name: string;
  completed: boolean;
}

// 👇 NUEVA INTERFAZ PARA MATERIALES
export interface Material {
  nombre: string;
  cantidad?: number;      // Opcional: cantidad utilizada
  unidad?: string;        // Opcional: unidad (metros, kg, unidades, etc.)
  observacion?: string;   // Opcional: observaciones del material
}