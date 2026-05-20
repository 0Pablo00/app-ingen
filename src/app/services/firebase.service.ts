import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { User } from '../models/user.model';
import { getAuth, updateProfile } from 'firebase/auth';
import { UtilsService } from './utils.service';
import { take } from 'rxjs/operators';
import { Insumo, MaterialSucursal, MovimientoMaterial } from 'src/app/models/insumo.model';

import { Reclamo } from '../models/reclamo.model';

import { MaintenanceCheck } from '../models/maintenance-check.model';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  getDoc,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  orderBy,
  limit,
  QueryConstraint,
  startAfter,
  getDocsFromServer,   // 👈 NUEVO
  getDocsFromCache,  
} from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  private isOnline: boolean = navigator.onLine;
  private firestoreModular: any; // Instancia de Firestore con tipos flexibles

private readonly MAINTENANCE_OWNER_UID = '0xa3Lyek75Tc9iYNQPy54hzfgMv2';
  constructor(
    private auth: AngularFireAuth,
    private db: AngularFirestore,
    private utilsSvc: UtilsService
  ) {
    // Inicializar la instancia modular de Firestore
    this.firestoreModular = this.db.firestore;
    
    // Monitorear conexión
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('📱 Conexión restablecida');
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📱 Sin conexión');
      this.utilsSvc.presentToast({
        message: '📴 Modo offline - Puedes ver tareas guardadas',
        color: 'warning',
        duration: 3000
      });
    });
  }

  // ===== Autenticacion ========

  login(user: User) {
    return this.auth.signInWithEmailAndPassword(user.email, user.password);
  }

  signUp(user: User) {
    return this.auth.createUserWithEmailAndPassword(user.email, user.password);
  }

  updateUser(user: any) {
    const auth = getAuth();
    return updateProfile(auth.currentUser, user);
  }

  getAuthState() {
    return this.auth.authState;
  }

  async signOut() {
    await this.auth.signOut();
    this.utilsSvc.routerLink('/auth');
    localStorage.removeItem('user');
  }

  // ============ FIRESTORE OPTIMIZADO ================

  /**
   * OBTENER DOCUMENTO
   * Estrategia: Intenta servidor, fallback a caché
   */
  async getDocument(collectionPath: string, docId: string): Promise<any> {
    try {
      const user = await this.auth.authState.pipe(take(1)).toPromise();
      if (!user) {
        console.error('No hay usuario autenticado');
        return null;
      }
      
      const docRef = doc(this.firestoreModular, collectionPath, docId);
      const docSnapshot = await getDoc(docRef);
      
      if (!docSnapshot.exists()) {
        return null;
      }
      
      return { id: docSnapshot.id, ...docSnapshot.data() };
      
    } catch (error) {
      console.error('Error en getDocument:', error);
      
      // Si hay error, intentar con caché
      try {
        const docRef = doc(this.firestoreModular, collectionPath, docId);
        const docSnapshot = await getDoc(docRef);
        if (docSnapshot.exists()) {
          return { id: docSnapshot.id, ...docSnapshot.data() };
        }
      } catch (cacheError) {
        console.error('Error en caché:', cacheError);
      }
      
      this.utilsSvc.presentToast({
        message: 'Error al cargar documento',
        color: 'danger',
        duration: 3000
      });
      
      return null;
    }
  }

  /**
   * GUARDAR DOCUMENTO
   * Requiere conexión obligatoriamente
   */
  async setDocument(collectionPath: string, docId: string, data: any): Promise<void> {
    try {
      const user = await this.auth.authState.pipe(take(1)).toPromise();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }
      
      if (!this.isOnline) {
        this.utilsSvc.presentToast({
          message: '❌ No hay conexión. No se puede guardar. Conéctate e intenta de nuevo.',
          color: 'danger',
          duration: 4000
        });
        throw new Error('No hay conexión a internet');
      }
      
      const docRef = doc(this.firestoreModular, collectionPath, docId);
      await setDoc(docRef, data);
      
      console.log(`✅ Documento guardado: ${collectionPath}/${docId}`);
      
    } catch (error) {
      console.error('Error en setDocument:', error);
      
      this.utilsSvc.presentToast({
        message: 'Error al guardar documento',
        color: 'danger',
        duration: 3000
      });
      
      throw error;
    }
  }

  /**
   * OBTENER TAREAS CON FILTROS OPTIMIZADOS
   */
 
  /**
 /**
 * OBTENER TAREAS CON FILTROS OPTIMIZADOS (FORZANDO SERVIDOR O CACHÉ)
 */
async getFilteredTasks(
  userId: string,
  filters: {
    finalizada?: boolean;
    orderByNumber?: boolean;
    limitTo?: number;
  } = {}
): Promise<any[]> {
  console.log(`🔍 getFilteredTasks iniciado para userId=${userId}, filters=`, filters);
  console.time('getFilteredTasks_total');

  try {
    const user = await this.auth.authState.pipe(take(1)).toPromise();
    if (!user) {
      console.error('No hay usuario autenticado');
      return [];
    }

    const tasksRef = collection(this.firestoreModular, `users/${userId}/tasks`);
    let allTasks: any[] = [];

    if (filters.finalizada === true) {
      console.log('📡 Consultando tareas finalizadas (finalizada==true)');
      console.time('consulta_finalizadas');
      const q = query(
        tasksRef,
        where('finalizada', '==', true),
        ...(filters.orderByNumber ? [orderBy('orderNumber', 'desc')] : [])
      );
      const snapshot = await getDocsFromServer(q);
      console.timeEnd('consulta_finalizadas');
      allTasks = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      console.log(`✅ ${allTasks.length} tareas finalizadas obtenidas del servidor`);

    } else if (filters.finalizada === false) {
      console.log('📡 Consultando tareas NO finalizadas (finalizada==false o undefined)');
      console.time('consulta_no_finalizadas');

      const qFalse = query(tasksRef, where('finalizada', '==', false));
      const snapshotFalse = await getDocsFromServer(qFalse);
      const tasksFalse = snapshotFalse.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

      const qUndef = query(tasksRef);
      const snapshotUndef = await getDocsFromServer(qUndef);
      const tasksUndef = snapshotUndef.docs
        .filter((doc: any) => doc.data().finalizada === undefined)
        .map((doc: any) => ({ id: doc.id, ...doc.data() }));

      allTasks = [...tasksFalse, ...tasksUndef];
      const uniqueIds = new Set();
      allTasks = allTasks.filter(task => {
        if (uniqueIds.has(task.id)) return false;
        uniqueIds.add(task.id);
        return true;
      });
      if (filters.orderByNumber) {
        allTasks.sort((a, b) => (b.orderNumber || 0) - (a.orderNumber || 0));
      }
      console.timeEnd('consulta_no_finalizadas');
      console.log(`✅ ${allTasks.length} tareas NO finalizadas obtenidas`);

    } else {
      console.log('📡 Consultando TODAS las tareas (sin filtro finalizada)');
      console.time('consulta_todas');
      const q = query(tasksRef);
      const snapshot = await getDocsFromServer(q);
      console.timeEnd('consulta_todas');
      allTasks = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      console.log(`✅ ${allTasks.length} tareas totales obtenidas del servidor`);
    }

    if (filters.limitTo && allTasks.length > filters.limitTo) {
      allTasks = allTasks.slice(0, filters.limitTo);
      console.log(`✂️ Limitado a ${filters.limitTo} tareas`);
    }

    console.timeEnd('getFilteredTasks_total');
    return allTasks;

  } catch (error) {
    console.error('❌ Error en getFilteredTasks (servidor):', error);
    console.timeEnd('getFilteredTasks_total');

    // Fallback a caché
    try {
      console.log('💾 Intentando lectura desde caché local...');
      console.time('consulta_cache');
      const tasksRef = collection(this.firestoreModular, `users/${userId}/tasks`);
      const q = query(tasksRef);
      const snapshot = await getDocsFromCache(q);
      const allTasks = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      console.timeEnd('consulta_cache');
      console.log(`💾 ${allTasks.length} tareas desde caché local`);
      return allTasks;
    } catch (cacheError) {
      console.error('❌ Error también en caché:', cacheError);
      this.utilsSvc.presentToast({
        message: 'Error al cargar tareas. Verifica tu conexión.',
        color: 'danger',
        duration: 4000
      });
      return [];
    }
  }
}



/**
 * Obtiene tareas finalizadas de un mes específico usando rangos de fecha
 * REQUIERE un índice compuesto en Firestore: finalizada ASC, createdAt ASC
 */
async getFinalizedTasksByMonth(userId: string, year: number, month: number): Promise<any[]> {
  console.log(`📅 [Firebase] getFinalizedTasksByMonth: ${year}-${month}`);
  console.time('[Firebase] consulta_por_mes');
  
  // Calcular fechas de inicio y fin en formato ISO string (compatible con createdAt)
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();
  
  const tasksRef = collection(this.firestoreModular, `users/${userId}/tasks`);
  const q = query(
    tasksRef,
    where('finalizada', '==', true),
    where('createdAt', '>=', startIso),
    where('createdAt', '<', endIso),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocsFromServer(q);
  const tasks = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  console.timeEnd('[Firebase] consulta_por_mes');
  console.log(`[Firebase] Encontradas ${tasks.length} tareas para ${year}-${month}`);
  return tasks;
}


  /**
   * OBTENER NÚMERO DE ORDEN ATÓMICO (VERSIÓN OPTIMIZADA)
   * SIN duplicados, SIN escaneo masivo
   */
  async getNextOrderNumber(userId: string): Promise<number> {
    try {
      console.log('🔢 Iniciando getNextOrderNumber...');
      const startTime = performance.now();
      
      const user = await this.auth.authState.pipe(take(1)).toPromise();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }
      
      if (!this.isOnline) {
        this.utilsSvc.presentToast({
          message: '❌ No hay conexión. No se puede crear tarea.',
          color: 'danger',
          duration: 4000
        });
        throw new Error('No hay conexión a internet');
      }
      
      const counterRef = doc(this.firestoreModular, `users/${userId}/config/counter`);
      
      const newOrderNumber = await runTransaction(this.firestoreModular, async (transaction: any) => {
        console.log('🔄 Iniciando transacción...');
        const counterDoc = await transaction.get(counterRef);
        
        if (!counterDoc.exists()) {
          // SOLO UNA VEZ: Buscar el máximo número existente de manera eficiente
          console.log('🔄 Contador no existe, inicializando por primera vez...');
          
          const tasksRef = collection(this.firestoreModular, `users/${userId}/tasks`);
          const maxOrderQuery = query(tasksRef, orderBy('orderNumber', 'desc'), limit(1));
          const maxOrderSnapshot = await getDocs(maxOrderQuery);
          
          let maxNumber = 0;
          if (!maxOrderSnapshot.empty) {
            maxNumber = maxOrderSnapshot.docs[0].data()['orderNumber'] || 0;
          }
          
          const startNumber = maxNumber + 1;
          console.log(`📊 Máximo encontrado: ${maxNumber}, contador inicializado en: ${startNumber}`);
          
          transaction.set(counterRef, { lastOrderNumber: startNumber });
          return startNumber;
          
        } else {
          // INCREMENTO ATÓMICO - SIN DUPLICADOS
          const data = counterDoc.data();
          const currentNumber = data && data['lastOrderNumber'] ? data['lastOrderNumber'] : 0;
          const newNumber = currentNumber + 1;
          
          console.log(`✅ Incrementando contador: ${currentNumber} → ${newNumber}`);
          transaction.update(counterRef, { lastOrderNumber: newNumber });
          return newNumber;
        }
      });
      
      const endTime = performance.now();
      console.log(`🎯 Número asignado: ${newOrderNumber} (${(endTime - startTime).toFixed(0)}ms)`);
      
      return newOrderNumber;
      
    } catch (error) {
      console.error('❌ Error en getNextOrderNumber:', error);
      
      // Fallback solo para casos extremos
      const timestamp = parseInt(new Date().getTime().toString().slice(-6));
      console.warn(`⚠️ Usando timestamp como fallback: ${timestamp}`);
      
      this.utilsSvc.presentToast({
        message: 'Error al generar número de orden, usando timestamp',
        color: 'warning',
        duration: 3000
      });
      
      return timestamp;
    }
  }

  /**
   * AGREGAR TAREA (OPTIMIZADO)
   */
  async addTask(userId: string, taskData: any): Promise<void> {
    try {
      console.log('📤 Iniciando addTask...');
      const startTime = performance.now();
      
      const user = await this.auth.authState.pipe(take(1)).toPromise();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }
      
      if (!this.isOnline) {
        this.utilsSvc.presentToast({
          message: '❌ No hay conexión. No se puede crear tarea.',
          color: 'danger',
          duration: 4000
        });
        throw new Error('No hay conexión a internet');
      }
      
      const tasksRef = collection(this.firestoreModular, `users/${userId}/tasks`);
      
      // Limpiar datos undefined y null
      const cleanData = JSON.parse(JSON.stringify(taskData));
      
      const dataToAdd = {
        ...cleanData,
        createdAt_server: new Date().toISOString()
      };
      
      await addDoc(tasksRef, dataToAdd);
      
      const endTime = performance.now();
      console.log(`✅ Tarea agregada en ${(endTime - startTime).toFixed(0)}ms`);
      
    } catch (error) {
      console.error('❌ Error en addTask:', error);
      
      this.utilsSvc.presentToast({
        message: 'Error al guardar tarea',
        color: 'danger',
        duration: 3000
      });
      
      throw error;
    }
  }

  /**
   * ACTUALIZAR TAREA
   */
  async updateTask(taskPath: string, taskData: any): Promise<void> {
    try {
      const user = await this.auth.authState.pipe(take(1)).toPromise();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }
      
      if (!this.isOnline) {
        this.utilsSvc.presentToast({
          message: '❌ No hay conexión. No se puede actualizar.',
          color: 'danger',
          duration: 4000
        });
        throw new Error('No hay conexión a internet');
      }
      
      const taskRef = doc(this.firestoreModular, taskPath);
      
      // Limpiar datos undefined y null
      const cleanData = JSON.parse(JSON.stringify(taskData));
      
      const dataToUpdate = {
        ...cleanData,
        updatedAt_server: new Date().toISOString()
      };
      
      await updateDoc(taskRef, dataToUpdate);
      
      console.log(`✅ Tarea actualizada: ${taskPath}`);
      
    } catch (error) {
      console.error('Error en updateTask:', error);
      
      this.utilsSvc.presentToast({
        message: 'Error al actualizar tarea',
        color: 'danger',
        duration: 3000
      });
      
      throw error;
    }
  }

  /**
   * ELIMINAR TAREA
   */
  async deleteTask(taskPath: string): Promise<void> {
    try {
      const user = await this.auth.authState.pipe(take(1)).toPromise();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }
      
      if (!this.isOnline) {
        this.utilsSvc.presentToast({
          message: '❌ No hay conexión. No se puede eliminar.',
          color: 'danger',
          duration: 4000
        });
        throw new Error('No hay conexión a internet');
      }
      
      const taskRef = doc(this.firestoreModular, taskPath);
      await deleteDoc(taskRef);
      
      console.log(`✅ Tarea eliminada: ${taskPath}`);
      
    } catch (error) {
      console.error('Error en deleteTask:', error);
      
      this.utilsSvc.presentToast({
        message: 'Error al eliminar tarea',
        color: 'danger',
        duration: 3000
      });
      
      throw error;
    }
  }

async getFilteredTasksPaginated(
  userId: string, 
  filters: {
    finalizada?: boolean;
    orderByNumber?: boolean;
    limitTo?: number;
    startAfter?: any;
    createdBy?: string;  // ← NUEVO
  } = {}
): Promise<{ tasks: any[], lastVisible: any }> {
  try {
    const user = await this.auth.authState.pipe(take(1)).toPromise();
    if (!user) {
      console.error('No hay usuario autenticado');
      return { tasks: [], lastVisible: null };
    }
    
    const tasksRef = collection(this.firestoreModular, `users/${userId}/tasks`);
    const limitSize = filters.limitTo || 10;
    
    let allTasks: any[] = [];
    let lastVisible = null;
    
    // Construir array de condiciones (constraints)
    let constraints: QueryConstraint[] = [];
    
    // Filtro por estado (finalizada)
    if (filters.finalizada !== undefined) {
      if (filters.finalizada === false) {
        // Para "NO finalizadas": tareas con false + undefined (lo mismo que antes)
        // Pero como es complejo, mantendremos la lógica original separada.
        // En lugar de reescribir todo, dejamos la estructura actual pero añadimos el filtro createdBy.
        // Voy a reestructurar para que sea más limpio.
      } else if (filters.finalizada === true) {
        constraints.push(where('finalizada', '==', true));
      }
    } else {
      // Sin filtro de finalizada: traer todas (incluye las que no tienen campo finalizada)
      // No se añade where para finalizada
    }
    
    // 🔥 NUEVO: Filtro por creador (solo si se proporciona)
    if (filters.createdBy) {
      constraints.push(where('createdBy', '==', filters.createdBy));
    }
    
    if (filters.orderByNumber) {
      constraints.push(orderBy('orderNumber', 'desc'));
    }
    
    if (filters.startAfter) {
      constraints.push(startAfter(filters.startAfter));
    }
    constraints.push(limit(limitSize));
    
    // Para el caso especial de finalizada === false, necesitamos manejar los undefined.
    // Mantendré la lógica original para ese caso, pero añadiendo el filtro createdBy.
    // Para simplificar, te propongo usar una única consulta que incluya también las tareas sin campo finalizada
    // usando un OR, pero Firestore no soporta OR directo. Así que mantendré la lógica actual.
    
    // Dado que tu lógica original para finalizada === false es compleja (une dos consultas),
    // vamos a modificar esa parte para que también aplique el filtro createdBy.
    
    if (filters.finalizada === false) {
      // Consulta para finalizada == false
      const constraintsFalse: QueryConstraint[] = [where('finalizada', '==', false)];
      if (filters.createdBy) constraintsFalse.push(where('createdBy', '==', filters.createdBy));
      if (filters.orderByNumber) constraintsFalse.push(orderBy('orderNumber', 'desc'));
      if (filters.startAfter) constraintsFalse.push(startAfter(filters.startAfter));
      constraintsFalse.push(limit(limitSize));
      const qFalse = query(tasksRef, ...constraintsFalse);
      const snapshotFalse = await getDocs(qFalse);
      const tasksFalse = snapshotFalse.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      
      // Consulta para tareas sin campo finalizada (undefined)
      const constraintsUndef: QueryConstraint[] = [];
      if (filters.createdBy) constraintsUndef.push(where('createdBy', '==', filters.createdBy));
      if (filters.orderByNumber) constraintsUndef.push(orderBy('orderNumber', 'desc'));
      if (filters.startAfter) constraintsUndef.push(startAfter(filters.startAfter));
      constraintsUndef.push(limit(limitSize));
      const qUndef = query(tasksRef, ...constraintsUndef);
      const snapshotUndef = await getDocs(qUndef);
      const tasksUndef = snapshotUndef.docs
        .filter((doc: any) => doc.data().finalizada === undefined)
        .map((doc: any) => ({ id: doc.id, ...doc.data() }));
      
      // Combinar, eliminar duplicados y ordenar
      allTasks = [...tasksFalse, ...tasksUndef];
      const uniqueIds = new Set();
      allTasks = allTasks.filter(task => {
        if (uniqueIds.has(task.id)) return false;
        uniqueIds.add(task.id);
        return true;
      });
      if (filters.orderByNumber) {
        allTasks.sort((a, b) => (b.orderNumber || 0) - (a.orderNumber || 0));
      }
      lastVisible = snapshotFalse.docs.length > 0 ? snapshotFalse.docs[snapshotFalse.docs.length - 1] : null;
      
    } else {
      // Para finalizada === true o sin filtro, usamos una sola consulta
      const q = query(tasksRef, ...constraints);
      const snapshot = await getDocs(q);
      allTasks = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      lastVisible = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
    }
    
    return { tasks: allTasks, lastVisible };
    
  } catch (error) {
    console.error('Error en getFilteredTasksPaginated:', error);
    return { tasks: [], lastVisible: null };
  }
}





  async getTasksForAllUsers(ownerUid: string, filters: any = {}): Promise<any[]> {
    try {
      const user = await this.auth.authState.pipe(take(1)).toPromise();
      if (!user) {
        console.error('No hay usuario autenticado');
        return [];
      }
      
      console.log(`📋 Cargando tareas para usuario ${user.email} desde el owner ${ownerUid}`);
      
      return await this.getFilteredTasks(ownerUid, filters);
      
    } catch (error) {
      console.error('Error en getTasksForAllUsers:', error);
      return [];
    }
  }

  // ===== MÉTODOS DE GUARDIAS =====

  async getAdditionalOperarios(docId: string): Promise<any> {
    try {
      const doc = await this.db.collection('guardias').doc(docId).ref.get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.error('Error getting additional operarios:', error);
      throw error;
    }
  }

  async setAdditionalOperarios(docId: string, data: any): Promise<void> {
    try {
      await this.db.collection('guardias').doc(docId).set(data);
    } catch (error) {
      console.error('Error setting additional operarios:', error);
      throw error;
    }
  }

  async getElectricistaGuardias(): Promise<any> {
    try {
      const doc = await this.db.collection('guardias').doc('electricistaGuardias').ref.get();
      return doc.exists ? doc.data() : { electricistaActual: null, electricistaProximo: null };
    } catch (error) {
      console.error('Error getting electricista guardias:', error);
      throw error;
    }
  }

  async setElectricistaGuardias(data: any): Promise<void> {
    try {
      await this.db.collection('guardias').doc('electricistaGuardias').set(data);
    } catch (error) {
      console.error('Error setting electricista guardias:', error);
      throw error;
    }
  }

  async deleteElectricistaGuardias(): Promise<void> {
    try {
      await this.db.collection('guardias').doc('electricistaGuardias').delete();
    } catch (error) {
      console.error('Error deleting electricista guardias:', error);
      throw error;
    }
  }

  // ===== MÉTODOS DE RESPALDO =====

  async getSubcollection(parentPath: string, subcollectionName: string): Promise<any[]> {
    try {
      const user = await this.auth.authState.pipe(take(1)).toPromise();
      if (!user) {
        console.error('No hay usuario autenticado');
        return [];
      }
      
      const collectionRef = collection(this.firestoreModular, parentPath, subcollectionName);
      
      let snapshot;
      
      if (this.isOnline) {
        try {
          snapshot = await getDocs(collectionRef);
          console.log(`📡 ${snapshot.size} documentos desde servidor`);
        } catch (serverError) {
          console.warn('⚠️ Error de servidor, usando caché');
          snapshot = await getDocs(collectionRef);
          console.log(`💾 ${snapshot.size} documentos desde caché`);
        }
      } else {
        snapshot = await getDocs(collectionRef);
        console.log(`💾 ${snapshot.size} documentos desde caché (offline)`);
      }
      
      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      
    } catch (error) {
      console.error('Error en getSubcollection:', error);
      return [];
    }
  }

  async addSubcollection(path: string, subcollectionName: string, object: any): Promise<void> {
    try {
      const user = await this.auth.authState.pipe(take(1)).toPromise();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }
      
      if (!this.isOnline) {
        this.utilsSvc.presentToast({
          message: '❌ No hay conexión. No se puede guardar.',
          color: 'danger',
          duration: 3000
        });
        throw new Error('No hay conexión a internet');
      }
      
      const collectionRef = collection(this.firestoreModular, path, subcollectionName);
      const dataToAdd = {
        ...object,
        createdAt_server: new Date().toISOString()
      };
      
      await addDoc(collectionRef, dataToAdd);
      console.log(`✅ Documento agregado a ${path}/${subcollectionName}`);
      
    } catch (error) {
      console.error('Error en addSubcollection:', error);
      this.utilsSvc.presentToast({
        message: 'Error al guardar',
        color: 'danger',
        duration: 3000
      });
      throw error;
    }
  }

  async updateDocument(path: string, object: any): Promise<void> {
    try {
      const user = await this.auth.authState.pipe(take(1)).toPromise();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }
      
      if (!this.isOnline) {
        this.utilsSvc.presentToast({
          message: '❌ No hay conexión. No se puede actualizar.',
          color: 'danger',
          duration: 3000
        });
        throw new Error('No hay conexión a internet');
      }
      
      const docRef = doc(this.firestoreModular, path);
      const dataToUpdate = {
        ...object,
        updatedAt_server: new Date().toISOString()
      };
      
      await updateDoc(docRef, dataToUpdate);
      console.log(`✅ Documento actualizado: ${path}`);
      
    } catch (error) {
      console.error('Error en updateDocument:', error);
      this.utilsSvc.presentToast({
        message: 'Error al actualizar',
        color: 'danger',
        duration: 3000
      });
      throw error;
    }
  }

  async deleteDocument(path: string): Promise<void> {
    try {
      const user = await this.auth.authState.pipe(take(1)).toPromise();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }
      
      if (!this.isOnline) {
        this.utilsSvc.presentToast({
          message: '❌ No hay conexión. No se puede eliminar.',
          color: 'danger',
          duration: 3000
        });
        throw new Error('No hay conexión a internet');
      }
      
      const docRef = doc(this.firestoreModular, path);
      await deleteDoc(docRef);
      console.log(`✅ Documento eliminado: ${path}`);
      
    } catch (error) {
      console.error('Error en deleteDocument:', error);
      this.utilsSvc.presentToast({
        message: 'Error al eliminar',
        color: 'danger',
        duration: 3000
      });
      throw error;
    }
  }

  // ===== MÉTODOS PARA ROLES DE USUARIO =====

  async setUserRole(uid: string, userData: { name: string; email: string; role?: 'admin' | 'operario' }): Promise<void> {
    try {
      const userRef = doc(this.firestoreModular, `users/${uid}`);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: uid,
          name: userData.name,
          email: userData.email,
          role: 'operario',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log(`✅ Documento de usuario creado para ${uid} con rol operario`);
      } else {
        console.log(`ℹ️ Usuario ${uid} ya tiene documento`);
      }
    } catch (error) {
      console.error('Error en setUserRole:', error);
      throw error;
    }
  }

  async getUserData(uid: string): Promise<User | null> {
    try {
      const userRef = doc(this.firestoreModular, `users/${uid}`);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          uid: data['uid'],
          name: data['name'],
          email: data['email'],
          role: data['role'] || 'operario'
        };
      } else {
        console.warn(`⚠️ No existe documento para usuario ${uid}`);
        return null;
      }
    } catch (error) {
      console.error('Error en getUserData:', error);
      return null;
    }
  }

  async addTaskToMainOwner(ownerUid: string, taskData: any, createdByUid: string): Promise<void> {
    try {
      const user = await this.auth.authState.pipe(take(1)).toPromise();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }
      
      if (!this.isOnline) {
        this.utilsSvc.presentToast({
          message: '❌ No hay conexión. No se puede crear tarea.',
          color: 'danger',
          duration: 4000
        });
        throw new Error('No hay conexión a internet');
      }
      
      const tasksRef = collection(this.firestoreModular, `users/${ownerUid}/tasks`);
      
      const dataToAdd = {
        ...taskData,
        createdBy: createdByUid,
        createdAt_server: new Date().toISOString()
      };
      
      await addDoc(tasksRef, dataToAdd);
      
      console.log(`✅ Tarea agregada por ${createdByUid} en colección de ${ownerUid}`);
      
    } catch (error) {
      console.error('Error en addTaskToMainOwner:', error);
      this.utilsSvc.presentToast({
        message: 'Error al guardar tarea',
        color: 'danger',
        duration: 3000
      });
      throw error;
    }
  }


// ===== MANTENIMIENTO CHECKLISTS =====

/**
 * Guarda un nuevo checklist de mantenimiento
 */
// Guardar checklist en colección GLOBAL (no por usuario)
// Guardar checklist
async saveMaintenanceCheck(checkData: MaintenanceCheck): Promise<string> {
  const user = await this.auth.authState.pipe(take(1)).toPromise();
  if (!user) throw new Error('No autenticado');
  if (!this.isOnline) throw new Error('Sin conexión');

  const path = `users/${this.MAINTENANCE_OWNER_UID}/maintenanceChecks`;
  console.log('💾 Guardando en ruta:', path);
  console.log('📦 Datos a guardar:', JSON.stringify(checkData));
  
  const checksRef = collection(this.firestoreModular, path);
  const docRef = await addDoc(checksRef, {
    ...checkData,
    createdAt: new Date().toISOString(),
    createdBy: user.uid,
    createdByName: (await this.getUserData(user.uid))?.name || 'Desconocido'
  });
  console.log('✅ Documento guardado con ID:', docRef.id);
  return docRef.id;
}

/**
 * Obtiene todos los checklists de una sucursal (ordenados por fecha descendente)
 */
async getMaintenanceChecksBySucursal(sucursal: string): Promise<MaintenanceCheck[]> {
  try {
    const checksRef = collection(this.firestoreModular, `users/${this.MAINTENANCE_OWNER_UID}/maintenanceChecks`);
    const q = query(checksRef, where('sucursal', '==', sucursal), orderBy('fecha', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceCheck));
  } catch (error) {
    console.error('Error obteniendo checklists:', error);
    return [];
  }
}

/**
 * Actualiza un checklist existente
 */
async updateMaintenanceCheck(checkId: string, updatedData: Partial<MaintenanceCheck>): Promise<void> {
  try {
    const checkRef = doc(this.firestoreModular, `users/${this.MAINTENANCE_OWNER_UID}/maintenanceChecks/${checkId}`);
    await updateDoc(checkRef, {
      ...updatedData,
      updatedAt: new Date().toISOString()
    });
    console.log(`✅ Checklist ${checkId} actualizado`);
  } catch (error) {
    console.error('Error actualizando checklist:', error);
    throw error;
  }
}


// Obtener todos los checks de un mes específico (para carga inicial)
// Obtener todos los checks de un mes específico (global)
async getMaintenanceChecksByMonth(year: number, month: number): Promise<MaintenanceCheck[]> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const path = `users/${this.MAINTENANCE_OWNER_UID}/maintenanceChecks`;
  console.log(`🔍 Leyendo desde ruta: ${path}`);
  console.log(`📅 Filtro: fecha entre ${startDate.toISOString()} y ${endDate.toISOString()}`);
  
  const checksRef = collection(this.firestoreModular, path);
  const q = query(
    checksRef,
    where('fecha', '>=', startDate.toISOString()),
    where('fecha', '<=', endDate.toISOString())
  );
  const snapshot = await getDocs(q);
  console.log(`📄 Documentos encontrados: ${snapshot.docs.length}`);
  snapshot.docs.forEach(doc => {
    const data = doc.data() as any;
    console.log(` - ${doc.id}: ${data.sucursal} - ${data.fecha}`);
  });
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceCheck));
}



// Obtener un check específico por sucursal y mes (global)
async getMaintenanceCheckBySucursalAndMonth(sucursal: string, year: number, month: number): Promise<MaintenanceCheck | null> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const path = `users/${this.MAINTENANCE_OWNER_UID}/maintenanceChecks`;
  console.log(`🔍 Buscando check para sucursal ${sucursal} en ${year}/${month}`);
  console.log(`Ruta: ${path}`);
  
  const checksRef = collection(this.firestoreModular, path);
  const q = query(
    checksRef,
    where('sucursal', '==', sucursal),
    where('fecha', '>=', startDate.toISOString()),
    where('fecha', '<=', endDate.toISOString()),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    console.log(`✅ Encontrado: ${doc.id}`, doc.data());
    return { id: doc.id, ...doc.data() } as MaintenanceCheck;
  }
  console.log(`❌ No encontrado`);
  return null;
}

/**
 * Obtiene tareas finalizadas dentro de un rango de fechas (optimizado para reportes)
 */
async getTareasFinalizadasPorRango(userId: string, fechaInicio: Date, fechaFin: Date): Promise<Task[]> {
  console.log(`🔍 [Firebase] getTareasFinalizadasPorRango | ${fechaInicio.toISOString()} - ${fechaFin.toISOString()}`);
  console.time('[Firebase] consulta_rango');
  
  try {
    const tasksRef = collection(this.firestoreModular, `users/${userId}/tasks`);
    // Consulta compuesta: finalizada == true y createdAt dentro del rango
    const q = query(
      tasksRef,
      where('finalizada', '==', true),
      where('createdAt', '>=', fechaInicio.toISOString()),
      where('createdAt', '<=', fechaFin.toISOString()),
      orderBy('createdAt', 'desc') // orden opcional
    );
    const snapshot = await getDocsFromServer(q);
    const tasks = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    console.timeEnd('[Firebase] consulta_rango');
    console.log(`✅ ${tasks.length} tareas en el rango`);
    return tasks;
  } catch (error) {
    console.error('Error en getTareasFinalizadasPorRango:', error);
    // Fallback a la consulta anterior si falla el índice
    console.log('⚠️ Fallback: obteniendo todas y filtrando en cliente...');
    const todas = await this.getFilteredTasks(userId, { finalizada: true });
    return todas.filter(task => {
      if (!task.createdAt) return false;
      const fecha = new Date(task.createdAt);
      return fecha >= fechaInicio && fecha <= fechaFin;
    });
  }
}


// ========== INSUMOS (STOCK GLOBAL) ==========
async getInsumos(ownerUid: string): Promise<Insumo[]> {
  console.log('🔍 getInsumos llamado con ownerUid:', ownerUid);
  const path = `users/${ownerUid}/insumos`;
  console.log('📁 Path de Firestore:', path);
  const collRef = collection(this.firestoreModular, path);
  try {
    const snapshot = await getDocs(collRef);
    console.log(`📊 Documentos encontrados: ${snapshot.size}`);
    const insumos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Insumo));
    console.log('✅ Insumos obtenidos:', insumos);
    return insumos;
  } catch (error) {
    console.error('❌ Error en getInsumos:', error);
    throw error;
  }
}

async addInsumo(ownerUid: string, insumo: Omit<Insumo, 'id'>): Promise<void> {
  console.log('➕ addInsumo llamado con ownerUid:', ownerUid, 'insumo:', insumo);
  const path = `users/${ownerUid}/insumos`;
  const collRef = collection(this.firestoreModular, path);
  const dataToAdd = {
    ...insumo,
    createdAt: new Date().toISOString()
  };
  console.log('📝 Datos a guardar:', dataToAdd);
  try {
    const docRef = await addDoc(collRef, dataToAdd);
    console.log('✅ Documento creado con ID:', docRef.id);
  } catch (error) {
    console.error('❌ Error en addInsumo:', error);
    throw error;
  }
}

async updateInsumo(ownerUid: string, insumoId: string, data: Partial<Insumo>): Promise<void> {
  const docRef = doc(this.firestoreModular, `users/${ownerUid}/insumos/${insumoId}`);
  await updateDoc(docRef, data);
}

// ========== STOCK POR SUCURSAL ==========
async getSucursalStock(ownerUid: string, sucursal: string): Promise<MaterialSucursal[]> {
  const docRef = doc(this.firestoreModular, `users/${ownerUid}/sucursalesStock/${sucursal}`);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return [];
  const data = snap.data();
  return data['materiales'] || [];
}

async asignarMaterialASucursal(
  ownerUid: string,
  insumoId: string,
  insumoNombre: string,
  unidad: string,
  sucursal: string,
  cantidadAsignar: number
): Promise<void> {
  const insumoRef = doc(this.firestoreModular, `users/${ownerUid}/insumos/${insumoId}`);
  const sucursalRef = doc(this.firestoreModular, `users/${ownerUid}/sucursalesStock/${sucursal}`);

  await runTransaction(this.firestoreModular, async (transaction) => {
    // ✅ PRIMERO: TODAS LAS LECTURAS JUNTAS
    const [insumoSnap, sucursalSnap] = await Promise.all([
      transaction.get(insumoRef),
      transaction.get(sucursalRef)
    ]);

    // Validaciones
    if (!insumoSnap.exists()) throw new Error('Insumo no existe');
    const stockActual = insumoSnap.data()['cantidad'] || 0;
    if (stockActual < cantidadAsignar) {
      throw new Error(`Stock insuficiente: ${stockActual} ${unidad} disponibles`);
    }

    const now = new Date().toISOString();

    // ✅ SEGUNDO: TODAS LAS ESCRITURAS
    transaction.update(insumoRef, { cantidad: stockActual - cantidadAsignar });

    if (!sucursalSnap.exists()) {
      transaction.set(sucursalRef, {
        materiales: [{
          insumoId,
          nombre: insumoNombre,
          cantidad: cantidadAsignar,
          unidad,
          ultimaAsignacion: now
        }]
      });
    } else {
      const data = sucursalSnap.data();
      let materiales = data['materiales'] || [];
      const idx = materiales.findIndex((m: any) => m.insumoId === insumoId);
      if (idx >= 0) {
        materiales[idx].cantidad += cantidadAsignar;
        materiales[idx].ultimaAsignacion = now;
      } else {
        materiales.push({
          insumoId,
          nombre: insumoNombre,
          cantidad: cantidadAsignar,
          unidad,
          ultimaAsignacion: now
        });
      }
      transaction.update(sucursalRef, { materiales });
    }
  });
}




// Eliminar insumo
async deleteInsumo(ownerUid: string, insumoId: string): Promise<void> {
  const docRef = doc(this.firestoreModular, `users/${ownerUid}/insumos/${insumoId}`);
  await deleteDoc(docRef);
}

// ========== MOVIMIENTOS Y CONSUMO EN SUCURSAL ==========

/**
 * Registrar consumo de material en una sucursal con número de orden
 */
async usarMaterialEnSucursal(
  ownerUid: string,
  sucursal: string,
  insumoId: string,
  cantidad: number,
  ordenTrabajo?: string,
  observacion?: string
): Promise<void> {
  const sucursalRef = doc(this.firestoreModular, `users/${ownerUid}/sucursalesStock/${sucursal}`);
  const movimientosRef = collection(sucursalRef, 'movimientos');

  await runTransaction(this.firestoreModular, async (transaction) => {
    const snap = await transaction.get(sucursalRef);
    if (!snap.exists()) throw new Error('Sucursal no encontrada');
    
    const materiales = snap.data()['materiales'] || [];
    const index = materiales.findIndex((m: any) => m.insumoId === insumoId);
    if (index === -1) throw new Error('Material no encontrado en esta sucursal');
    
    const material = materiales[index];
    if (material.cantidad < cantidad) throw new Error(`Stock insuficiente: solo ${material.cantidad} ${material.unidad}`);

    // Actualizar stock en sucursal
    material.cantidad -= cantidad;
    materiales[index] = material;
    transaction.update(sucursalRef, { materiales });

    // Obtener usuario actual
    const user = await this.auth.authState.pipe(take(1)).toPromise();
    const usuarioEmail = user?.email || 'desconocido';

    // Registrar movimiento
    const movimiento: Omit<MovimientoMaterial, 'id'> = {
      insumoId,
      nombre: material.nombre,
      tipo: 'consumo',
      cantidad,
      unidad: material.unidad,
      fecha: new Date().toISOString(),
      ordenTrabajo,
      observacion: observacion || `Consumo en ${sucursal}`,
      usuario: usuarioEmail
    };
    transaction.set(doc(movimientosRef), movimiento);
  });
}

/**
 * Obtener historial de movimientos de un material en una sucursal
 */
async getMovimientosMaterial(
  ownerUid: string,
  sucursal: string,
  insumoId: string
): Promise<MovimientoMaterial[]> {
  const movimientosRef = collection(
    this.firestoreModular,
    `users/${ownerUid}/sucursalesStock/${sucursal}/movimientos`
  );
  const q = query(movimientosRef, where('insumoId', '==', insumoId), orderBy('fecha', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MovimientoMaterial));
}


/**
 * Eliminar completamente un material de una sucursal y devolver el stock al inventario central.
 */
async eliminarMaterialDeSucursal(
  ownerUid: string,
  sucursal: string,
  insumoId: string,
  cantidadADevolver: number,
  unidad: string
): Promise<void> {
  const insumoRef = doc(this.firestoreModular, `users/${ownerUid}/insumos/${insumoId}`);
  const sucursalRef = doc(this.firestoreModular, `users/${ownerUid}/sucursalesStock/${sucursal}`);

  await runTransaction(this.firestoreModular, async (transaction) => {
    // 🔥 LEER TODO PRIMERO
    const [insumoSnap, sucursalSnap] = await Promise.all([
      transaction.get(insumoRef),
      transaction.get(sucursalRef)
    ]);

    if (!insumoSnap.exists()) throw new Error('Insumo no existe en stock central');
    const stockActual = insumoSnap.data()['cantidad'] || 0;
    const nuevoStock = stockActual + cantidadADevolver;

    if (!sucursalSnap.exists()) throw new Error('Sucursal no encontrada');
    let materiales = sucursalSnap.data()['materiales'] || [];
    const nuevoArray = materiales.filter((m: any) => m.insumoId !== insumoId);

    // 🔥 AHORA SÍ, LAS ESCRITURAS
    transaction.update(insumoRef, { cantidad: nuevoStock });
    transaction.update(sucursalRef, { materiales: nuevoArray });
  });
}

/**
 * Eliminar un movimiento específico del historial
 */
async eliminarMovimiento(ownerUid: string, sucursal: string, movimientoId: string): Promise<void> {
  const movimientoRef = doc(this.firestoreModular, `users/${ownerUid}/sucursalesStock/${sucursal}/movimientos/${movimientoId}`);
  await deleteDoc(movimientoRef);
}


/**
 * Transferir material entre sucursales
 */
async transferirMaterialEntreSucursales(
  ownerUid: string,
  sucursalOrigen: string,
  sucursalDestino: string,
  insumoId: string,
  cantidad: number,
  unidad: string,
  nombreMaterial: string
): Promise<void> {
  const origenRef = doc(this.firestoreModular, `users/${ownerUid}/sucursalesStock/${sucursalOrigen}`);
  const destinoRef = doc(this.firestoreModular, `users/${ownerUid}/sucursalesStock/${sucursalDestino}`);
  const now = new Date().toISOString();
  
  // Obtener usuario actual
  const user = await this.auth.authState.pipe(take(1)).toPromise();
  const usuarioEmail = user?.email || 'desconocido';

  await runTransaction(this.firestoreModular, async (transaction) => {
    // Leer ambas sucursales
    const [origenSnap, destinoSnap] = await Promise.all([
      transaction.get(origenRef),
      transaction.get(destinoRef)
    ]);

    if (!origenSnap.exists()) throw new Error('Sucursal origen no encontrada');
    
    // Procesar origen
    let materialesOrigen = origenSnap.data()['materiales'] || [];
    const idxOrigen = materialesOrigen.findIndex((m: any) => m.insumoId === insumoId);
    if (idxOrigen === -1) throw new Error('Material no encontrado en sucursal origen');
    const materialOrigen = materialesOrigen[idxOrigen];
    if (materialOrigen.cantidad < cantidad) throw new Error('Stock insuficiente en origen');

    // Restar en origen
    materialOrigen.cantidad -= cantidad;
    if (materialOrigen.cantidad === 0) {
      materialesOrigen.splice(idxOrigen, 1);
    } else {
      materialesOrigen[idxOrigen] = materialOrigen;
    }
    transaction.update(origenRef, { materiales: materialesOrigen });

    // Procesar destino
    let materialesDestino = destinoSnap.exists() ? (destinoSnap.data()['materiales'] || []) : [];
    const idxDestino = materialesDestino.findIndex((m: any) => m.insumoId === insumoId);
    if (idxDestino >= 0) {
      materialesDestino[idxDestino].cantidad += cantidad;
      materialesDestino[idxDestino].ultimaAsignacion = now;
    } else {
      materialesDestino.push({
        insumoId,
        nombre: nombreMaterial,
        cantidad: cantidad,
        unidad: unidad,
        ultimaAsignacion: now
      });
    }
    // Si el documento destino no existe, lo creamos con set; si existe, actualizamos
    if (!destinoSnap.exists()) {
      transaction.set(destinoRef, { materiales: materialesDestino });
    } else {
      transaction.update(destinoRef, { materiales: materialesDestino });
    }

    // Registrar movimiento en origen (tipo traslado salida)
    const movimientosOrigenRef = collection(origenRef, 'movimientos');
    const movimientoOrigen: Omit<MovimientoMaterial, 'id'> = {
      insumoId,
      nombre: nombreMaterial,
      tipo: 'traslado',
      cantidad,
      unidad,
      fecha: now,
      sucursalDestino,
      observacion: `Transferido a ${sucursalDestino}`,
      usuario: usuarioEmail
    };
    transaction.set(doc(movimientosOrigenRef), movimientoOrigen);

    // Registrar movimiento en destino (tipo traslado entrada)
    const movimientosDestinoRef = collection(destinoRef, 'movimientos');
    const movimientoDestino: Omit<MovimientoMaterial, 'id'> = {
      insumoId,
      nombre: nombreMaterial,
      tipo: 'traslado',
      cantidad,
      unidad,
      fecha: now,
      sucursalOrigen,
      observacion: `Recibido de ${sucursalOrigen}`,
      usuario: usuarioEmail
    };
    transaction.set(doc(movimientosDestinoRef), movimientoDestino);
  });
}

// ===== RECLAMOS =====

/**
 * Agrega un nuevo reclamo a la colección global 'reclamos'
 */
async addReclamo(reclamo: Omit<Reclamo, 'id'>): Promise<void> {
  try {
    if (!this.isOnline) throw new Error('Sin conexión');
    const reclamosRef = collection(this.firestoreModular, 'reclamos');
    await addDoc(reclamosRef, {
      ...reclamo,
      finalizado: false,
      createdAt: reclamo.createdAt || new Date().toISOString()
    });
    console.log('✅ Reclamo agregado');
  } catch (error) {
    console.error('Error al agregar reclamo:', error);
    this.utilsSvc.presentToast({ message: 'Error al guardar reclamo', color: 'danger' });
    throw error;
  }
}

/**
 * Obtiene todos los reclamos ordenados por fecha descendente (más recientes primero)
 */
async getReclamos(): Promise<Reclamo[]> {
  try {
    const reclamosRef = collection(this.firestoreModular, 'reclamos');
    const q = query(reclamosRef, orderBy('createdAt', 'desc'));
    
    // Forzar servidor si hay conexión, con fallback a caché
    let snapshot;
    if (this.isOnline) {
      snapshot = await getDocsFromServer(q);
    } else {
      snapshot = await getDocsFromCache(q);
    }
    
    const reclamos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Reclamo));
    
    console.log(`📋 ${reclamos.length} reclamos obtenidos`);
    return reclamos;
  } catch (error) {
    console.error('Error al obtener reclamos:', error);
    // Fallback a caché si falla el servidor
    try {
      const snapshot = await getDocsFromCache(query(collection(this.firestoreModular, 'reclamos'), orderBy('createdAt', 'desc')));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reclamo));
    } catch (cacheError) {
      this.utilsSvc.presentToast({
        message: 'Error al cargar reclamos',
        color: 'danger',
        duration: 3000
      });
      return [];
    }
  }
}


async getReclamosActivos(): Promise<Reclamo[]> {
  try {
    const reclamosRef = collection(this.firestoreModular, 'reclamos');
    const q = query(
      reclamosRef,
      where('finalizado', '==', false),
      orderBy('createdAt', 'desc')
    );
    const snapshot = this.isOnline ? await getDocsFromServer(q) : await getDocsFromCache(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reclamo));
  } catch (error) {
    console.error('Error al obtener reclamos activos:', error);
    return [];
  }
}

async getReclamosFinalizados(): Promise<Reclamo[]> {
  try {
    const reclamosRef = collection(this.firestoreModular, 'reclamos');
    const q = query(
      reclamosRef,
      where('finalizado', '==', true),
      orderBy('fechaFinalizado', 'desc')
    );
    const snapshot = this.isOnline ? await getDocsFromServer(q) : await getDocsFromCache(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reclamo));
  } catch (error) {
    console.error('Error al obtener reclamos finalizados:', error);
    return [];
  }
}

async updateReclamo(reclamoId: string, data: Partial<Reclamo>): Promise<void> {
  try {
    if (!this.isOnline) throw new Error('Sin conexión');
    const docRef = doc(this.firestoreModular, `reclamos/${reclamoId}`);
    await updateDoc(docRef, data);
    console.log('✅ Reclamo actualizado');
  } catch (error) {
    console.error('Error al actualizar reclamo:', error);
    this.utilsSvc.presentToast({ message: 'Error al actualizar', color: 'danger' });
    throw error;
  }
}

async deleteReclamo(reclamoId: string): Promise<void> {
  try {
    if (!this.isOnline) throw new Error('Sin conexión');
    const docRef = doc(this.firestoreModular, `reclamos/${reclamoId}`);
    await deleteDoc(docRef);
    console.log('✅ Reclamo eliminado');
  } catch (error) {
    console.error('Error al eliminar reclamo:', error);
    this.utilsSvc.presentToast({ message: 'Error al eliminar', color: 'danger' });
    throw error;
  }
}

}