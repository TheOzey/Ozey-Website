import { type Auth, connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, type Firestore, getFirestore } from "firebase/firestore";
import { ensureAppCheck } from "./app-check";
import { type BackendKey, getBackendApp, getBackendConfig } from "./apps";

const auths = new Map<BackendKey, Auth>();
const dbs = new Map<BackendKey, Firestore>();

export function getBackendAuth(key: BackendKey): Auth {
  let auth = auths.get(key);
  if (!auth) {
    ensureAppCheck(key);
    auth = getAuth(getBackendApp(key));
    const config = getBackendConfig(key);
    if (config.useEmulators) {
      connectAuthEmulator(auth, `http://127.0.0.1:${config.emulatorPorts.auth}`, { disableWarnings: true });
    }
    auths.set(key, auth);
  }
  return auth;
}

export function getBackendFirestore(key: BackendKey): Firestore {
  let db = dbs.get(key);
  if (!db) {
    ensureAppCheck(key);
    db = getFirestore(getBackendApp(key));
    const config = getBackendConfig(key);
    if (config.useEmulators) connectFirestoreEmulator(db, "127.0.0.1", config.emulatorPorts.firestore);
    dbs.set(key, db);
  }
  return db;
}
