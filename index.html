import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, remove } from 'firebase/database';

// ══════════════════════════════════════════════════════════════
// 🔧 PASTE YOUR FIREBASE CONFIG BELOW
// ══════════════════════════════════════════════════════════════
// 1. Go to https://console.firebase.google.com
// 2. Create a new project (free tier is fine)
// 3. Add a "Web app" to get your config
// 4. Enable "Realtime Database" (start in test mode)
// 5. Paste the config object below
// ══════════════════════════════════════════════════════════════

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "000000000000",
  appId: "YOUR_APP_ID"
};

// ══════════════════════════════════════════════════════════════

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Storage API matching the artifact's interface
export const storage = {
  async get(key) {
    try {
      const snapshot = await get(ref(db, `contest/${key.replace(/[.#$/[\]]/g, '_')}`));
      if (snapshot.exists()) {
        return { key, value: snapshot.val() };
      }
      return null;
    } catch (e) {
      console.error('Firebase get error:', e);
      return null;
    }
  },

  async set(key, value) {
    try {
      const safeKey = key.replace(/[.#$/[\]]/g, '_');
      await set(ref(db, `contest/${safeKey}`), value);
      return { key, value };
    } catch (e) {
      console.error('Firebase set error:', e);
      return null;
    }
  },

  async delete(key) {
    try {
      const safeKey = key.replace(/[.#$/[\]]/g, '_');
      await remove(ref(db, `contest/${safeKey}`));
      return { key, deleted: true };
    } catch (e) {
      console.error('Firebase delete error:', e);
      return null;
    }
  },

  // Subscribe to real-time updates for a key
  subscribe(key, callback) {
    const safeKey = key.replace(/[.#$/[\]]/g, '_');
    const unsubscribe = onValue(ref(db, `contest/${safeKey}`), (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      }
    });
    return unsubscribe;
  }
};
