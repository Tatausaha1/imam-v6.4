
import { db, auth } from './firebase';
import { Notification } from '../types';

export const getNotifications = (callback: (notifications: Notification[]) => void) => {
  if (!db || !auth.currentUser) return () => {};

  return db.collection('notifications')
    .where('userId', '==', auth.currentUser.uid)
    .limit(50)
    .onSnapshot(snapshot => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(notifications);
    });
};

export const markAsRead = async (notificationId: string) => {
  if (!db) return;
  try {
    await db.collection('notifications').doc(notificationId).update({
      read: true
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
};

export const createNotification = async (userId: string, notification: Omit<Notification, 'id' | 'createdAt' | 'read' | 'userId'>) => {
  if (!db) return;
  try {
    await db.collection('notifications').add({
      ...notification,
      userId,
      read: false,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

export const createGlobalNotification = async (notification: Omit<Notification, 'id' | 'createdAt' | 'read' | 'userId'>) => {
  if (!db) return;
  try {
    // This is a simplified version. In a real app, you might use a Cloud Function
    // or a different approach for global notifications.
    // For now, we'll just fetch all users and add a notification for each.
    // WARNING: This is not scalable for many users.
    const usersSnapshot = await db.collection('users').get();
    const batch = db.batch();
    
    usersSnapshot.docs.forEach(userDoc => {
      const newNotifRef = db.collection('notifications').doc();
      batch.set(newNotifRef, {
        ...notification,
        userId: userDoc.id,
        read: false,
        createdAt: new Date().toISOString()
      });
    });
    
    await batch.commit();
  } catch (error) {
    console.error("Error creating global notification:", error);
  }
};
