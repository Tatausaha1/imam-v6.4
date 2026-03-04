
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
const firebaseConfig = {
  apiKey: "AIzaSyDhdGopfGfpOjKrqH8thlmx7LQXIyfiayc",
  authDomain: "studio-4774553931-88e8d.firebaseapp.com",
  databaseURL: "https://studio-4774553931-88e8d-default-rtdb.firebaseio.com",
  projectId: "studio-4774553931-88e8d",
  storageBucket: "studio-4774553931-88e8d.firebasestorage.app",
  messagingSenderId: "111216910036",
  appId: "1:111216910036:web:25738f80344f0d5be2a541"
};

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
  db = firebase.firestore();
  rtdb = firebase.database();
  storage = firebase.storage();
  
  if (typeof window !== 'undefined') {
      db.enablePersistence({ synchronizeTabs: true })
        .catch((err) => {
            if (err.code === 'failed-precondition') console.warn("Persistence limited: Multiple tabs.");
            else if (err.code === 'unimplemented') console.warn("Persistence unsupported.");
        });

      firebase.analytics.isSupported()
        .then((supported) => {
          if (supported) analytics = firebase.analytics();
        })
        .catch(() => {});
  }
  
  console.log("IMAM Core: CLOUD DATABASE CONNECTED (" + firebaseConfig.databaseURL + ")");

} catch (error) {
  console.error("Firebase critical initialization error:", error);
}

export { app, auth, db, rtdb, storage, analytics };
