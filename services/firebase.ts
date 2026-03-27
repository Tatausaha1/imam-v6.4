
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 * Firebase Initialization Module
 */

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/database';
import 'firebase/compat/storage';
import 'firebase/compat/analytics';

// Konfigurasi Firebase dari Project User
import firebaseConfig from '../firebase-applet-config.json';

export const isMockMode = false;

let app: firebase.app.App;
let auth: firebase.auth.Auth;
let db: firebase.firestore.Firestore;
let rtdb: firebase.database.Database;
let storage: firebase.storage.Storage;
let analytics: firebase.analytics.Analytics | undefined;

try {
  if (!firebase.apps.length) {
      app = firebase.initializeApp(firebaseConfig);
  } else {
      app = firebase.app();
  }

  auth = firebase.auth();
  
  // Gunakan firestoreDatabaseId jika ada (untuk Enterprise/Named Database)
  const dbId = (firebaseConfig as any).firestoreDatabaseId;
  if (dbId && dbId !== '(default)') {
      db = (firebase.app() as any).firestore(dbId);
  } else {
      db = firebase.firestore();
  }
  
  rtdb = (firebase as any).database();
  storage = firebase.storage();
  
  if (typeof window !== 'undefined') {
      db.enablePersistence({ synchronizeTabs: true })
        .catch((err) => {
            if (err.code === 'failed-precondition') console.warn("Persistence limited: Multiple tabs.");
            else if (err.code === 'unimplemented') console.warn("Persistence unsupported.");
        });

      (firebase as any).analytics.isSupported()
        .then((supported: boolean) => {
          if (supported) analytics = firebase.analytics();
        })
        .catch(() => {});
  }
  
  console.log("IMAM Core: CLOUD DATABASE CONNECTED (" + ((firebaseConfig as any).databaseURL || firebaseConfig.projectId) + ")");

} catch (error) {
  console.error("Firebase critical initialization error:", error);
}

export { app, auth, db, rtdb, storage, analytics };
