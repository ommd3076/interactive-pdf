import { PlatformDataset } from "../types/platform";

const DB_NAME = "morphos_editorial_db";
const DB_VERSION = 1;
const STORE_STATE = "workspace_state";
const LOCAL_FALLBACK_KEY = "morphos_editorial_workspace_v1";

export interface PersistedWorkspaceState {
  dataset: PlatformDataset;
  masteredFlashcardIds: string[];
  flashcardConfidence: Record<string, number>;
  updatedAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_STATE)) {
        db.createObjectStore(STORE_STATE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveWorkspaceState(state: PersistedWorkspaceState): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_STATE, "readwrite");
      tx.objectStore(STORE_STATE).put(state, "active_workspace");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // fallback handled below
  }

  try {
    localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export async function loadWorkspaceState(): Promise<PersistedWorkspaceState | null> {
  try {
    const db = await openDB();
    const idbData = await new Promise<PersistedWorkspaceState | null>((resolve, reject) => {
      const tx = db.transaction(STORE_STATE, "readonly");
      const req = tx.objectStore(STORE_STATE).get("active_workspace");
      req.onsuccess = () => resolve((req.result as PersistedWorkspaceState) || null);
      req.onerror = () => reject(req.error);
    });
    if (idbData) return idbData;
  } catch {
    // fallback to localStorage
  }

  try {
    const raw = localStorage.getItem(LOCAL_FALLBACK_KEY);
    return raw ? (JSON.parse(raw) as PersistedWorkspaceState) : null;
  } catch {
    return null;
  }
}

export async function clearWorkspaceState(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_STATE, "readwrite");
      tx.objectStore(STORE_STATE).delete("active_workspace");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(LOCAL_FALLBACK_KEY);
  } catch {
    // ignore
  }
}
