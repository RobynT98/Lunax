/**
 * Lunax IndexedDB-schema (v1)
 * - Stores:
 *   - entries       : dagboksinlägg (rich text + metadata)
 *   - attachments   : binära blobbar (bilder/ljud/filer)
 *   - thumbs        : små tumnaglar för bilder
 *   - settings      : appinställningar (tema, fonter, lås mm)
 *   - search_index  : serialiserat sökindex (MiniSearch/Lunr)
 */

import { openDB, type IDBPDatabase, type DBSchema } from "idb";

// ====== Typer (synkade med vår plan/spec) ======

export type EntryId = string;

export interface AttachmentRef {
  id: string;
  kind: "image" | "audio" | "file";
  name?: string;
  mime: string;
  size?: number;
  thumbId?: string;
}

export interface ProseMirrorJSON {
  type: string;
  content?: any[];
  [key: string]: any;
}

export interface Entry {
  id: EntryId;
  title: string;
  content: ProseMirrorJSON;
  createdAt: number;
  updatedAt: number;
  dateForEntry: number;
  tags: string[];
  category?: string;
  chapterPath?: string[]; // flexibel stig
  isFavorite: boolean;
  isLocked: boolean;
  attachments: AttachmentRef[];
}

export interface AttachmentBlob {
  id: string;
  mime: string;
  data: Blob;
}

export type ThemeKey =
  | "light"
  | "dark"
  | "parchment"
  | "obsidian"
  | "forest"
  | "midnight";

export interface Settings {
  theme: ThemeKey;
  fontBody: string;
  fontHeading: string;
  lineHeight: number;
  textSize: "sm" | "md" | "lg";
  lockEnabled: boolean;
  lockHint?: string;
  apiKeys?: { openai?: string; other?: string }; // opt-in, tom som default
  highContrast: boolean;
  reduceMotion: boolean;
}

// Sökindex kan vara serialiserad sträng eller Uint8Array
export interface SearchIndexRecord {
  id: "minisearch"; // enda nyckeln i v1
  payload: string | Uint8Array;
}

// ====== DBSchema-definition ======

interface LunaxDBSchema extends DBSchema {
  entries: {
    key: string; // EntryId
    value: Entry;
    indexes: {
      "by_date": number; // dateForEntry
      "by_updated": number; // updatedAt
      "by_category": string;
      "by_tag": string; // multiEntry
      "by_favorite": boolean;
      "by_locked": boolean;
    };
  };
  attachments: {
    key: string; // AttachmentBlob.id
    value: AttachmentBlob;
    indexes: {
      "by_mime": string;
    };
  };
  thumbs: {
    key: string; // thumb id
    value: AttachmentBlob; // liten blob
  };
  settings: {
    key: string; // alltid "settings"
    value: Settings;
  };
  search_index: {
    key: string; // "minisearch"
    value: SearchIndexRecord;
  };
}

const DB_NAME = "lunax";
const DB_VERSION = 1;

let _dbPromise: Promise<IDBPDatabase<LunaxDBSchema>> | null = null;

// ====== Öppna DB (med migrering v1) ======

export function openLunaxDB() {
  if (!_dbPromise) {
    _dbPromise = openDB<LunaxDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, tx) {
        console.log(`[LunaxDB] Upgrade ${oldVersion} -> ${newVersion}`);

        // entries
        if (!db.objectStoreNames.contains("entries")) {
          const store = db.createObjectStore("entries", { keyPath: "id" });
          store.createIndex("by_date", "dateForEntry", { unique: false });
          store.createIndex("by_updated", "updatedAt", { unique: false });
          store.createIndex("by_category", "category", { unique: false });
          store.createIndex("by_tag", "tags", { unique: false, multiEntry: true });
          store.createIndex("by_favorite", "isFavorite", { unique: false });
          store.createIndex("by_locked", "isLocked", { unique: false });
        }

        // attachments
        if (!db.objectStoreNames.contains("attachments")) {
          const store = db.createObjectStore("attachments", { keyPath: "id" });
          store.createIndex("by_mime", "mime", { unique: false });
        }

        // thumbs
        if (!db.objectStoreNames.contains("thumbs")) {
          db.createObjectStore("thumbs", { keyPath: "id" });
        }

        // settings
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings");
          // sätt basinställningar
          tx.objectStore("settings").put(
            {
              theme: "dark",
              fontBody: "Inter",
              fontHeading: "Merriweather",
              lineHeight: 1.7,
              textSize: "md",
              lockEnabled: false,
              highContrast: false,
              reduceMotion: false
            } as Settings,
            "settings"
          );
        }

        // search_index
        if (!db.objectStoreNames.contains("search_index")) {
          db.createObjectStore("search_index");
        }
      }
    });
  }
  return _dbPromise;
}

// ====== Hjälpare: Entries ======

export async function putEntry(entry: Entry) {
  const db = await openLunaxDB();
  entry.updatedAt = Date.now();
  await db.put("entries", entry);
  return entry;
}

export async function getEntry(id: string) {
  const db = await openLunaxDB();
  return db.get("entries", id);
}

export async function deleteEntry(id: string) {
  const db = await openLunaxDB();
  await db.delete("entries", id);
}

export async function listEntries_recent(limit = 50) {
  const db = await openLunaxDB();
  const idx = db.transaction("entries").store.index("by_updated");
  const results: Entry[] = [];
  let cursor = await idx.openCursor(null, "prev"); // nyast först
  while (cursor && results.length < limit) {
    results.push(cursor.value);
    cursor = await cursor.continue();
  }
  return results;
}

export async function listEntries_byDateRange(fromEpochMs: number, toEpochMs: number) {
  const db = await openLunaxDB();
  const idx = db.transaction("entries").store.index("by_date");
  const range = IDBKeyRange.bound(fromEpochMs, toEpochMs);
  const results = await idx.getAll(range);
  // sortera stigande datum
  results.sort((a, b) => a.dateForEntry - b.dateForEntry);
  return results;
}

export async function listEntries_byTag(tag: string) {
  const db = await openLunaxDB();
  const idx = db.transaction("entries").store.index("by_tag");
  return idx.getAll(tag);
}

export async function listEntries_byCategory(category: string) {
  const db = await openLunaxDB();
  const idx = db.transaction("entries").store.index("by_category");
  return idx.getAll(category);
}

// ====== Hjälpare: Attachments & Thumbs ======

export async function putAttachment(blob: AttachmentBlob) {
  const db = await openLunaxDB();
  await db.put("attachments", blob);
}

export async function getAttachment(id: string) {
  const db = await openLunaxDB();
  return db.get("attachments", id);
}

export async function deleteAttachment(id: string) {
  const db = await openLunaxDB();
  await db.delete("attachments", id);
}

export async function putThumb(thumb: AttachmentBlob) {
  const db = await openLunaxDB();
  await db.put("thumbs", thumb);
}

export async function getThumb(id: string) {
  const db = await openLunaxDB();
  return db.get("thumbs", id);
}

// ====== Hjälpare: Settings ======

export async function getSettings() {
  const db = await openLunaxDB();
  const s = await db.get("settings", "settings");
  return s as Settings | null;
}

export async function putSettings(partial: Partial<Settings>) {
  const db = await openLunaxDB();
  const current = (await db.get("settings", "settings")) as Settings | undefined;
  const next: Settings = {
    theme: "dark",
    fontBody: "Inter",
    fontHeading: "Merriweather",
    lineHeight: 1.7,
    textSize: "md",
    lockEnabled: false,
    highContrast: false,
    reduceMotion: false,
    ...(current ?? {}),
    ...(partial ?? {})
  };
  await db.put("settings", next, "settings");
  return next;
}

// ====== Hjälpare: Sökindex ======

export async function saveSearchIndex(payload: string | Uint8Array) {
  const db = await openLunaxDB();
  const rec: SearchIndexRecord = { id: "minisearch", payload };
  await db.put("search_index", rec, "minisearch");
}

export async function loadSearchIndex() {
  const db = await openLunaxDB();
  return (await db.get("search_index", "minisearch")) as SearchIndexRecord | undefined;
}

// ====== Utility: Blob <-> base64 (för export/import v1) ======

export async function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => resolve(fr.result as string);
    fr.readAsDataURL(blob);
  });
}

export async function dataURLToBlob(dataURL: string): Promise<Blob> {
  // Förväntat format: data:<mime>;base64,<data>
  const [header, b64] = dataURL.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] || "application/octet-stream";
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// ====== Utility: Transaktion för synk rader (ex. import) ======

export async function bulkPutEntries(entries: Entry[]) {
  const db = await openLunaxDB();
  const tx = db.transaction("entries", "readwrite");
  for (const e of entries) {
    await tx.store.put({ ...e, updatedAt: e.updatedAt ?? Date.now() });
  }
  await tx.done;
}

export async function bulkPutAttachments(blobs: AttachmentBlob[]) {
  const db = await openLunaxDB();
  const tx = db.transaction("attachments", "readwrite");
  for (const b of blobs) {
    await tx.store.put(b);
  }
  await tx.done;
}