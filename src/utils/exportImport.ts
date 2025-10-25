/**
 * Export/Import för Lunax (JSON v1)
 *
 * Exporterar allt till EN fil:
 * {
 *   lunaxVersion: 1,
 *   exportedAt: ISO,
 *   settings: {...},
 *   entries: [Entry, ...],
 *   blobs: [{ id, mime, base64 }, ...] // bilagor från "attachments"-store
 * }
 *
 * Notera: Bilder som bäddas in som data-URL i editorn ligger redan i entry.content.
 * Attachments-store används för fristående bilagor; vi exporterar dem också.
 */

import {
  openLunaxDB,
  getSettings,
  putSettings,
  blobToDataURL,
  dataURLToBlob,
  bulkPutEntries,
  bulkPutAttachments,
  type Entry,
  type AttachmentBlob
} from "@/db/schema";

/** Exporterar hela databasen till en Blob (+ filnamn) */
export async function exportToJSONBlob() {
  const db = await openLunaxDB();

  // Hämta allt
  const [settings, entries, attachments] = await Promise.all([
    getSettings(),
    db.getAll("entries"),
    db.getAll("attachments")
  ]);

  // Konvertera attachments-blobs till dataURL (base64)
  const blobs = await Promise.all(
    attachments.map(async (a) => ({
      id: a.id,
      mime: a.mime,
      base64: await blobToDataURL(a.data)
    }))
  );

  const payload = {
    lunaxVersion: 1,
    exportedAt: new Date().toISOString(),
    settings: settings ?? null,
    entries,
    blobs
  };

  const json = JSON.stringify(payload);
  const blob = new Blob([json], { type: "application/json" });

  // Filnamn: lunax-YYYYMMDD-HHMM.json
  const ts = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const filename = `lunax-${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(
    ts.getHours()
  )}${pad(ts.getMinutes())}.json`;

  return { blob, filename, json: payload };
}

/** Startar en nedladdning i webbläsaren av nuvarande export */
export async function triggerDownloadExport() {
  const { blob, filename } = await exportToJSONBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Importera från en File (t.ex. vald i <input type="file">) */
export async function importFromFile(file: File) {
  const text = await file.text();
  return importFromJSONString(text);
}

/** Importera från JSON-sträng. Hanterar id-krockar och mappar om referenser. */
export async function importFromJSONString(text: string) {
  let data: any;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error("Ogiltig JSON.");
  }

  if (!data || typeof data !== "object") throw new Error("Ogiltig fil.");
  if (data.lunaxVersion !== 1) throw new Error("Fel version på exportfilen (stödjer bara v1).");

  const db = await openLunaxDB();

  // ===== Återställ settings (om finns) – blandar inte, bara skriver delvis
  if (data.settings && typeof data.settings === "object") {
    await putSettings(data.settings);
  }

  // ===== Återställ attachments (skapa id-map om krockar)
  const blobsIn: Array<{ id: string; mime: string; base64: string }> = Array.isArray(data.blobs)
    ? data.blobs
    : [];

  const attachmentIdMap = new Map<string, string>();
  const attachmentsOut: AttachmentBlob[] = [];

  for (const b of blobsIn) {
    if (!b?.id || !b?.mime || !b?.base64) continue;

    const exists = await db.get("attachments", b.id);
    let newId = b.id;
    if (exists) {
      newId = genId("imp_a");
      attachmentIdMap.set(b.id, newId);
    } else {
      attachmentIdMap.set(b.id, b.id);
    }

    const blob = await dataURLToBlob(b.base64);
    attachmentsOut.push({ id: newId, mime: b.mime, data: blob });
  }

  if (attachmentsOut.length) {
    await bulkPutAttachments(attachmentsOut);
  }

  // ===== Återställ entries (skapa id-map om krockar, mappa bilagereferenser)
  const entriesIn: Entry[] = Array.isArray(data.entries) ? data.entries : [];
  const entryIdMap = new Map<string, string>();
  const entriesOut: Entry[] = [];

  for (const e of entriesIn) {
    if (!e?.id) continue;

    const exists = await db.get("entries", e.id);
    let newId = e.id;
    if (exists) {
      newId = genId("imp_e");
      entryIdMap.set(e.id, newId);
    } else {
      entryIdMap.set(e.id, e.id);
    }

    // Mappa om attachments-referenser om deras id ändrats
    const mappedAttachments = (e.attachments || []).map((ar) => {
      const mapped = attachmentIdMap.get(ar.id) || ar.id;
      return { ...ar, id: mapped };
    });

    entriesOut.push({
      ...e,
      id: newId,
      attachments: mappedAttachments,
      // Uppdatera tider minimalt om de saknas
      createdAt: e.createdAt ?? Date.now(),
      updatedAt: Date.now()
    });
  }

  if (entriesOut.length) {
    await bulkPutEntries(entriesOut);
  }

  return {
    importedEntries: entriesOut.length,
    importedBlobs: attachmentsOut.length,
    remapped: [...entryIdMap.values()].some((v, i, a) => a.indexOf(v) !== i) || attachmentIdMap.size > 0
  };
}

/** Enkel id-generator (fallback när `crypto.randomUUID` saknas) */
function genId(prefix: string) {
  // @ts-ignore
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}