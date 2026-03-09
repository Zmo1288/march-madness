import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, remove } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDLPdDbK4nrTMfCNozvEriGznIsVH58EjQ",
  authDomain: "seed-pts-march-madness-app.firebaseapp.com",
  databaseURL: "https://seed-pts-march-madness-app-default-rtdb.firebaseio.com",
  projectId: "seed-pts-march-madness-app",
  storageBucket: "seed-pts-march-madness-app.firebasestorage.app",
  messagingSenderId: "131780916355",
  appId: "1:131780916355:web:c1c57d13e1686ccdd957b6",
  measurementId: "G-PBGS0PTVM8"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export const storage = {
  async get(key) {
    try {
      const snapshot = await get(ref(db, 'contest/' + key.replace(/[.#$/\[\]]/g, '_')));
      if (snapshot.exists()) {
        return { key: key, value: snapshot.val() };
      }
      return null;
    } catch (e) {
      console.error('Firebase get error:', e);
      return null;
    }
  },
  async set(key, value) {
    try {
      var safeKey = key.replace(/[.#$/\[\]]/g, '_');
      await set(ref(db, 'contest/' + safeKey), value);
      return { key: key, value: value };
    } catch (e) {
      console.error('Firebase set error:', e);
      return null;
    }
  },
  async delete(key) {
    try {
      var safeKey = key.replace(/[.#$/\[\]]/g, '_');
      await remove(ref(db, 'contest/' + safeKey));
      return { key: key, deleted: true };
    } catch (e) {
      console.error('Firebase delete error:', e);
      return null;
    }
  },
  subscribe(key, callback) {
    var safeKey = key.replace(/[.#$/\[\]]/g, '_');
    var unsubscribe = onValue(ref(db, 'contest/' + safeKey), function(snapshot) {
      if (snapshot.exists()) {
        callback(snapshot.val());
      }
    });
    return unsubscribe;
  }
};
