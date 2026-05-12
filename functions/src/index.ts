import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import cors from 'cors';

// Inicializar Firebase Admin
admin.initializeApp();

// Configurar CORS correctamente
const corsHandler = cors({ origin: true });

// Función que se activa cuando se actualiza una tarea
// ... (imports y configuración inicial)

// Función que se activa cuando se CREA una tarea
export const onTaskImageCreated = functions.firestore
  .document('users/{userId}/tasks/{taskId}')
  .onCreate(async (snap, context) => {
    const taskData = snap.data();
    const hasImage = taskData.orderImageAt !== null && taskData.orderImageAt !== undefined;
    
    if (!hasImage) {
      console.log('Tarea creada sin imagen, omitiendo');
      return null;
    }
    
    // Si tiene imagen, procesamos igual que en onUpdate
    return await sendNotificationForTask(taskData, context.params.taskId);
  });

// Función que se activa cuando se ACTUALIZA una tarea
export const onTaskImageUploaded = functions.firestore
  .document('users/{userId}/tasks/{taskId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    
    const hadImageBefore = beforeData.orderImageAt !== null && beforeData.orderImageAt !== undefined;
    const hasImageNow = afterData.orderImageAt !== null && afterData.orderImageAt !== undefined;
    const isNewImage = !hadImageBefore && hasImageNow;
    
    if (!isNewImage) {
      console.log('No es imagen nueva, omitiendo');
      return null;
    }
    
    return await sendNotificationForTask(afterData, context.params.taskId);
  });

// Función auxiliar para enviar la notificación (evita duplicar código)
async function sendNotificationForTask(taskData: any, taskId: string) {
  const tecnicoNombre = taskData.tecnicoNombre || 'Técnico';
  const sucursal = taskData.sucursal || 'Sucursal no especificada';
  const orderNumber = taskData.orderNumber || 'N/A';
  
  let finalizacionHora = 'Hora no disponible';
  if (taskData.orderImageAt) {
    const fecha = new Date(taskData.orderImageAt);
    finalizacionHora = fecha.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  const notificationTitle = `📋 Tarea Finalizada #${orderNumber}`;
  const notificationBody = `${tecnicoNombre} completó trabajo en ${sucursal} - ${finalizacionHora}`;
  
  console.log(`📝 Notificación: ${notificationTitle} - ${notificationBody}`);
  
  try {
    // Obtener todos los administradores y sus tokens
    const usersSnapshot = await admin.firestore().collection('users').get();
    const adminTokens: string[] = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userRole = userData.role;
      
      if (userRole === 'admin') {
        const tokensSnapshot = await admin.firestore()
          .collection('users')
          .doc(userDoc.id)
          .collection('tokens')
          .get();
        
        tokensSnapshot.forEach(tokenDoc => {
          const tokenData = tokenDoc.data();
          if (tokenData.token) {
            adminTokens.push(tokenData.token);
          }
        });
      }
    }
    
    if (adminTokens.length === 0) {
      console.log('No hay tokens de administradores registrados');
      return null;
    }
    
    console.log(`📱 Enviando a ${adminTokens.length} dispositivos de admins`);
    
    // Construir mensajes con deep link
    const messages = adminTokens.map(token => ({
      data: {
        title: notificationTitle,
        body: notificationBody,
        taskId: taskId,
        orderNumber: orderNumber.toString(),
        // Deep link: la URL completa de la tarea en la PWA
        // Asumiendo que tu home puede manejar un parámetro ?taskId=
        click_action: 'https://tareas-mfi.web.app/tabs/home?taskId=' + taskId,
        screen: '/tabs/home',
      },
      token: token,
    }));
    
    const response = await admin.messaging().sendEach(messages);
    console.log(`✅ Enviadas: ${response.successCount} exitosas, ${response.failureCount} fallidas`);
    
    return { success: true, sent: response.successCount };
    
  } catch (error) {
    console.error('❌ Error enviando notificaciones:', error);
    return null;
  }
}

// ... (resto de funciones subscribeToTopic, sendTestNotification igual)

// Función para suscribir un token (opcional, útil para pruebas)
export const subscribeToTopic = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const { token, topic } = req.body;
    
    if (!token || !topic) {
      res.status(400).send('Faltan parámetros: token y/o topic');
      return;
    }
    
    try {
      await admin.messaging().subscribeToTopic(token, topic);
      res.status(200).send(`Suscrito al tema ${topic}`);
      console.log(`Token ${token} suscrito al tema ${topic}`);
    } catch (error) {
      console.error('Error al suscribirse al tema:', error);
      res.status(500).send('Error al suscribirse al tema');
    }
  });
});

// Función para enviar notificación manual (útil para pruebas)
export const sendTestNotification = functions.https.onCall(async (data, context) => {
  // Verificar autenticación
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debe estar autenticado');
  }
  
  const { title, body, token } = data;
  
  if (!token) {
    throw new functions.https.HttpsError('invalid-argument', 'Se requiere un token');
  }
  
  try {
    const message: admin.messaging.Message = {
      data: {
        title: title || 'Notificación de prueba',
        body: body || 'Esta es una notificación de prueba',
      },
      token: token,
    };
    
    const response = await admin.messaging().send(message);
    console.log('✅ Notificación enviada:', response);
    return { success: true, message: 'Notificación enviada', messageId: response };
  } catch (error) {
    console.error('Error enviando notificación:', error);
    throw new functions.https.HttpsError('internal', 'Error al enviar notificación');
  }
});