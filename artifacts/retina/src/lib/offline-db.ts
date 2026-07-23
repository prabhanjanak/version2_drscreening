export interface OfflineScreeningEntry {
  id?: number;
  date: string;
  screeningPlaceCode: string;
  serialNumber: number;
  uniqueId: string;
  name: string;
  age: number;
  gender: string;
  address?: string;
  phone: string;
  diabetesDuration: string;
  bloodPressure?: string;
  drStatus: string;
  advice: string;
  imagePath: string; // Base64 when offline
  imageQuality: string;
  latitude?: string;
  longitude?: string;
  referralStatus: string;
  referToBaseHospital?: boolean;
  createdAt?: string;
}

const DB_NAME = "drsms_offline_db";
const DB_VERSION = 1;
const STORE_NAME = "offline_entries";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
  });
}

export const offlineDB = {
  async addEntry(entry: OfflineScreeningEntry): Promise<number> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add({ ...entry, createdAt: new Date().toISOString() });
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  },

  async getAllEntries(): Promise<OfflineScreeningEntry[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteEntry(id: number): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getDraft(): Promise<OfflineScreeningEntry | null> {
    const data = localStorage.getItem("drsms_form_draft");
    return data ? JSON.parse(data) : null;
  },

  saveDraft(entry: Partial<OfflineScreeningEntry>) {
    localStorage.setItem("drsms_form_draft", JSON.stringify(entry));
  },

  clearDraft() {
    localStorage.removeItem("drsms_form_draft");
  }
};
