import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Lead, ScoringSettings, DEFAULT_SCORING_SETTINGS } from '../types/lead';

interface LeadDB extends DBSchema {
  leads: {
    key: string;
    value: Lead;
    indexes: { 'by-status': string };
  };
  settings: {
    key: string;
    value: any;
  };
}

let dbPromise: Promise<IDBPDatabase<LeadDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<LeadDB>('leadflow-crm-db', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore('leads', { keyPath: 'id' });
          store.createIndex('by-status', 'status');
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings');
          }
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllLeads(): Promise<Lead[]> {
  const db = await getDB();
  return db.getAll('leads');
}

export async function addLead(lead: Lead): Promise<void> {
  const db = await getDB();
  await db.put('leads', lead);
}

export async function updateLead(lead: Lead): Promise<void> {
  const db = await getDB();
  await db.put('leads', lead);
}

export async function deleteLead(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('leads', id);
}

export async function bulkPutLeads(leads: Lead[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('leads', 'readwrite');
  for (const lead of leads) {
    await tx.store.put(lead);
  }
  await tx.done;
}

export async function clearAllLeads(): Promise<void> {
  const db = await getDB();
  await db.clear('leads');
}

export async function getStoredSettings(): Promise<ScoringSettings> {
  try {
    const db = await getDB();
    const stored = await db.get('settings', 'scoringSettings');
    return stored || DEFAULT_SCORING_SETTINGS;
  } catch {
    return DEFAULT_SCORING_SETTINGS;
  }
}

export async function saveStoredSettings(settings: ScoringSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', settings, 'scoringSettings');
}
