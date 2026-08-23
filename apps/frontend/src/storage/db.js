// Thin promise wrapper around raw IndexedDB — no `idb` dependency. The
// entire surface this app needs is get/getAll/put/delete/clear/count on a
// couple of stores, which is maybe 40 lines of native IndexedDB; adding a
// package for that would be one more thing to learn instead of one less,
// and the raw API is worth seeing directly in a project like this.
//
// Nothing outside storage/sessionStore.js should import this file — see
// the header comment there for why.

const DB_NAME = 'aicoach';
const DB_VERSION = 1;

export const STORES = {
  SESSIONS: 'sessions',
  SETTINGS: 'settings',
};

let dbPromise = null;

// Runs once per version bump, with oldVersion set to whatever the browser
// already has on disk (0 for a brand-new database). Each version's changes
// are guarded by `if (oldVersion < N)` rather than `=== N - 1`, so a user
// who hasn't opened the app in a while and jumps straight from v1 to v3
// still picks up every intermediate change — not just the last one.
function upgrade(db, oldVersion) {
  if (oldVersion < 1) {
    const sessions = db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' });
    sessions.createIndex('startedAt', 'startedAt');
    sessions.createIndex('exercise', 'exercise');

    db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
  }
  // Next schema change: `if (oldVersion < 2) { ... }`, and bump DB_VERSION.
}

function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB is not available in this browser'));
      return;
    }

    let request;
    try {
      request = window.indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      // Some browsers (older Safari in private mode) throw synchronously
      // here instead of failing the request asynchronously.
      reject(err);
      return;
    }

    request.onupgradeneeded = (event) => upgrade(request.result, event.oldVersion);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Database upgrade blocked by another open tab'));
  });

  return dbPromise;
}

function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function store(storeName, mode) {
  const db = await openDB();
  return db.transaction(storeName, mode).objectStore(storeName);
}

export async function dbGet(storeName, key) {
  return promisifyRequest((await store(storeName, 'readonly')).get(key));
}

export async function dbGetAll(storeName) {
  return promisifyRequest((await store(storeName, 'readonly')).getAll());
}

export async function dbGetAllByIndexRange(storeName, indexName, range) {
  const index = (await store(storeName, 'readonly')).index(indexName);
  return promisifyRequest(index.getAll(range));
}

export async function dbPut(storeName, value) {
  return promisifyRequest((await store(storeName, 'readwrite')).put(value));
}

export async function dbDelete(storeName, key) {
  return promisifyRequest((await store(storeName, 'readwrite')).delete(key));
}

export async function dbClear(storeName) {
  return promisifyRequest((await store(storeName, 'readwrite')).clear());
}

export async function estimateStorageUsage() {
  if (!navigator.storage?.estimate) return null;
  const { usage, quota } = await navigator.storage.estimate();
  return { usage, quota };
}
