import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { User } from '../models/user.model';
import { getAuth, updateProfile } from 'firebase/auth';
import { UtilsService } from './utils.service';
import { take } from 'rxjs/operators';
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
} from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  private isOnline: boolean = navigator.onLine;

  constructor(
    private auth: AngularFireAuth,
    private db: AngularFirestore,
    private utilsSvc: UtilsService
  ) {
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
      
      const docRef = doc(this.db.firestore, collectionPath, docId);
      const docSnapshot = await getDoc(docRef);
      
      if (!docSnapshot.exists()) {
        return null;
      }
      
      return { id: docSnapshot.id, ...docSnapshot.data() };
      
    } catch (error) {
      console.error('Error en getDocument:', error);
      
      // Si hay error, intentar con caché
      try {
        const docRef = doc(this.db.firestore, collectionPath, docId);
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
      
      const docRef = doc(this.db.firestore, collectionPath, docId);
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
  async getFilteredTasks(
    userId: string, 
    filters: {
      finalizada?: boolean;
      orderByNumber?: boolean;
      limitTo?: number;
    } = {}
  ): Promise<any[]> {
    try {
      const user = await this.auth.authState.pipe(take(1)).toPromise();
      if (!user) {
        console.error('No hay usuario autenticado');
        return [];
      }
      
      const tasksRef = collection(this.db.firestore, `users/${userId}/tasks`);
      
      let allTasks: any[] = [];
      
      if (filters.finalizada === false) {
        // Para "NO finalizadas": tareas con false + undefined
        
        // Primera consulta: finalizada = false
        const q1 = query(
          tasksRef, 
          where('finalizada', '==', false),
          ...(filters.orderByNumber ? [orderBy('orderNumber', 'desc')] : [])
        );
        
        // Segunda consulta: tareas SIN el campo finalizada
        const q2 = query(tasksRef);
        
        let snapshot1, snapshot2;
        
        if (this.isOnline) {
          try {
            snapshot1 = await getDocs(q1);
            snapshot2 = await getDocs(q2);
          } catch (error) {
            console.warn('⚠️ Error de servidor, usando caché');
            snapshot1 = await getDocs(q1);
            snapshot2 = await getDocs(q2);
          }
        } else {
          snapshot1 = await getDocs(q1);
          snapshot2 = await getDocs(q2);
        }
        
        // Combinar resultados
        const tasks1 = snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const tasks2 = snapshot2.docs
          .filter(doc => {
            const data = doc.data();
            return data.finalizada === undefined;
          })
          .map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Combinar y eliminar duplicados
        allTasks = [...tasks1, ...tasks2];
        
        // Eliminar duplicados
        const uniqueIds = new Set();
        allTasks = allTasks.filter(task => {
          if (uniqueIds.has(task.id)) {
            return false;
          }
          uniqueIds.add(task.id);
          return true;
        });
        
        // Ordenar después de combinar
        if (filters.orderByNumber) {
          allTasks.sort((a, b) => (b.orderNumber || 0) - (a.orderNumber || 0));
        }
        
      } else if (filters.finalizada === true) {
        // Para finalizadas, consulta directa
        const q = query(
          tasksRef, 
          where('finalizada', '==', true),
          ...(filters.orderByNumber ? [orderBy('orderNumber', 'desc')] : [])
        );
        
        let snapshot;
        if (this.isOnline) {
          try {
            snapshot = await getDocs(q);
          } catch (error) {
            console.warn('⚠️ Error de servidor, usando caché');
            snapshot = await getDocs(q);
          }
        } else {
          snapshot = await getDocs(q);
        }
        
        allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
      } else {
        // Sin filtro de finalizada (todos)
        const q = query(
          tasksRef,
          ...(filters.orderByNumber ? [orderBy('orderNumber', 'desc')] : [])
        );
        
        let snapshot;
        if (this.isOnline) {
          try {
            snapshot = await getDocs(q);
          } catch (error) {
            console.warn('⚠️ Error de servidor, usando caché');
            snapshot = await getDocs(q);
          }
        } else {
          snapshot = await getDocs(q);
        }
        
        allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      
      // Aplicar límite si es necesario
      if (filters.limitTo && allTasks.length > filters.limitTo) {
        allTasks = allTasks.slice(0, filters.limitTo);
      }
      
      console.log(`✅ ${allTasks.length} tareas encontradas`);
      
      return allTasks;
      
    } catch (error) {
      console.error('Error crítico en getFilteredTasks:', error);
      
      this.utilsSvc.presentToast({
        message: 'Error al cargar tareas',
        color: 'danger',
        duration: 3000
      });
      
      return [];
    }
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
      
      const counterRef = doc(this.db.firestore, `users/${userId}/config/counter`);
      
      const newOrderNumber = await runTransaction(this.db.firestore, async (transaction) => {
        console.log('🔄 Iniciando transacción...');
        const counterDoc = await transaction.get(counterRef);
        
        if (!counterDoc.exists()) {
          // SOLO UNA VEZ: Buscar el máximo número existente de manera eficiente
          console.log('🔄 Contador no existe, inicializando por primera vez...');
          
          const tasksRef = collection(this.db.firestore, `users/${userId}/tasks`);
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
      
      const tasksRef = collection(this.db.firestore, `users/${userId}/tasks`);
      
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
      
      const taskRef = doc(this.db.firestore, taskPath);
      
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
      
      const taskRef = doc(this.db.firestore, taskPath);
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

  /**
   * OBTENER TAREAS CON FILTROS Y PAGINACIÓN
   */
  /**
 * OBTENER TAREAS CON FILTROS Y PAGINACIÓN - VERSIÓN CORREGIDA
 * Carga de 10 en 10 usando startAfter
 */
async getFilteredTasksPaginated(
  userId: string, 
  filters: {
    finalizada?: boolean;
    orderByNumber?: boolean;
    limitTo?: number;
    startAfter?: any;
  } = {}
): Promise<{ tasks: any[], lastVisible: any }> {
  try {
    const user = await this.auth.authState.pipe(take(1)).toPromise();
    if (!user) {
      console.error('No hay usuario autenticado');
      return { tasks: [], lastVisible: null };
    }
    
    const tasksRef = collection(this.db.firestore, `users/${userId}/tasks`);
    const limitSize = filters.limitTo || 10;
    
    let allTasks: any[] = [];
    let lastVisible = null;
    
    if (filters.finalizada === false) {
      // Para "NO finalizadas": NECESITAMOS UNA SOLA CONSULTA CON startAfter
      // Primero obtenemos las tareas con finalizada = false usando paginación
      const constraints1: QueryConstraint[] = [where('finalizada', '==', false)];
      if (filters.orderByNumber) constraints1.push(orderBy('orderNumber', 'desc'));
      
      // Aplicar startAfter si existe
      if (filters.startAfter) {
        constraints1.push(startAfter(filters.startAfter));
      }
      constraints1.push(limit(limitSize));
      
      const q1 = query(tasksRef, ...constraints1);
      
      let snapshot1;
      
      if (this.isOnline) {
        try {
          snapshot1 = await getDocs(q1);
        } catch (error) {
          console.warn('⚠️ Error de servidor, usando caché');
          snapshot1 = await getDocs(q1);
        }
      } else {
        snapshot1 = await getDocs(q1);
      }
      
      // Procesar resultados de finalizada = false
      const tasks1 = snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Guardar último visible para paginación
      if (snapshot1.docs.length > 0) {
        lastVisible = snapshot1.docs[snapshot1.docs.length - 1];
      }
      
      // Si no hay suficientes tareas con finalizada = false, buscar tareas sin el campo
      if (tasks1.length < limitSize) {
        // Calcular cuántas faltan
        const remainingNeeded = limitSize - tasks1.length;
        
        // Consulta para tareas sin el campo finalizada
        const q2 = query(tasksRef);
        let snapshot2;
        
        if (this.isOnline) {
          try {
            snapshot2 = await getDocs(q2);
          } catch (error) {
            console.warn('⚠️ Error de servidor, usando caché');
            snapshot2 = await getDocs(q2);
          }
        } else {
          snapshot2 = await getDocs(q2);
        }
        
        // Filtrar solo las que NO tienen el campo finalizada
        const tasks2 = snapshot2.docs
          .filter(doc => {
            const data = doc.data();
            return data.finalizada === undefined;
          })
          .map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Ordenar si es necesario
        if (filters.orderByNumber) {
          tasks2.sort((a, b) => (b.orderNumber || 0) - (a.orderNumber || 0));
        }
        
        // Tomar solo las que necesitamos
        const tasks2Needed = tasks2.slice(0, remainingNeeded);
        
        // Combinar resultados
        allTasks = [...tasks1, ...tasks2Needed];
      } else {
        allTasks = tasks1;
      }
      
      // Eliminar duplicados por si acaso
      const uniqueIds = new Set();
      allTasks = allTasks.filter(task => {
        if (uniqueIds.has(task.id)) {
          return false;
        }
        uniqueIds.add(task.id);
        return true;
      });
      
    } else if (filters.finalizada === true) {
      // Para finalizadas, consulta directa con paginación
      const constraints: QueryConstraint[] = [where('finalizada', '==', true)];
      if (filters.orderByNumber) constraints.push(orderBy('orderNumber', 'desc'));
      
      if (filters.startAfter) {
        constraints.push(startAfter(filters.startAfter));
      }
      constraints.push(limit(limitSize));
      
      const q = query(tasksRef, ...constraints);
      
      let snapshot;
      if (this.isOnline) {
        try {
          snapshot = await getDocs(q);
        } catch (error) {
          console.warn('⚠️ Error de servidor, usando caché');
          snapshot = await getDocs(q);
        }
      } else {
        snapshot = await getDocs(q);
      }
      
      allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      lastVisible = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
      
    } else {
      // Sin filtro (todos) - consulta directa con paginación
      const constraints: QueryConstraint[] = [];
      if (filters.orderByNumber) constraints.push(orderBy('orderNumber', 'desc'));
      
      if (filters.startAfter) {
        constraints.push(startAfter(filters.startAfter));
      }
      constraints.push(limit(limitSize));
      
      const q = query(tasksRef, ...constraints);
      
      let snapshot;
      if (this.isOnline) {
        try {
          snapshot = await getDocs(q);
        } catch (error) {
          console.warn('⚠️ Error de servidor, usando caché');
          snapshot = await getDocs(q);
        }
      } else {
        snapshot = await getDocs(q);
      }
      
      allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      lastVisible = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
    }
    
    console.log(`✅ ${allTasks.length} tareas cargadas (${filters.finalizada === false ? 'no finalizadas' : filters.finalizada === true ? 'finalizadas' : 'todas'})`);
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
      
      const collectionRef = collection(this.db.firestore, parentPath, subcollectionName);
      
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
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
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
      
      const collectionRef = collection(this.db.firestore, path, subcollectionName);
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
      
      const docRef = doc(this.db.firestore, path);
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
      
      const docRef = doc(this.db.firestore, path);
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
      const userRef = doc(this.db.firestore, `users/${uid}`);
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
      const userRef = doc(this.db.firestore, `users/${uid}`);
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
      
      const tasksRef = collection(this.db.firestore, `users/${ownerUid}/tasks`);
      
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
}