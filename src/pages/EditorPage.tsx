import React, { useEffect, useMemo, useRef, useState } from "react";
import TipTapEditor, { type ProseJSON } from "@/editor/tiptap";
import {
  type Entry,
  type AttachmentRef,
  putEntry,
  getEntry
} from "@/db/schema";

// Hjälpare
function todayStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function toISODate(epochMs: number): string {
  const d = new Date(epochMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fromISODate(value: string): number {
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setHours(0, 0, 0, 0);
  return dt.getTime();
}
function genId(prefix: string) {
  if ("randomUUID" in crypto) return `${prefix}_${crypto.randomUUID()}`;
  // Fallback (mycket enkel)
  return `${prefix}_${Math.random().toString(36).slice(2)}${Date.now()}`;
}

type EditorPageProps = {
  /** Om satt: laddar ett existerande inlägg, annars skapas ett nytt. */
  entryId?: string;
};

const EMPTY_DOC: ProseJSON = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "" }] }]
};

const DEFAULT_ENTRY = (): Entry => ({
  id: genId("e"),
  title: "",
  content: EMPTY_DOC,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  dateForEntry: todayStart(),
  tags: [],
  category: "",
  chapterPath: [],
  isFavorite: false,
  isLocked: false,
  attachments: []
});

export default function EditorPage({ entryId }: EditorPageProps) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  // Ladda befintlig eller skapa ny
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (entryId) {
        const existing = await getEntry(entryId);
        if (mounted) setEntry(existing ?? DEFAULT_ENTRY());
      } else {
        setEntry(DEFAULT_ENTRY());
      }
    })();
    return () => { mounted = false; };
  }, [entryId]);

  // Autospara var 2s när dirty
  useEffect(() => {
    if (!entry) return;
    if (saveTimerRef.current) window.clearInterval(saveTimerRef.current);
    saveTimerRef.current = window.setInterval(async () => {
      if (dirty) {
        setSaving(true);
        const updated = { ...entry, updatedAt: Date.now() };
        await putEntry(updated);
        setEntry(updated);
        setDirty(false);
        setSaving(false);
        setLastSavedAt(Date.now());
      }
    }, 2000) as unknown as number;
    return () => {
      if (saveTimerRef.current) window.clearInterval(saveTimerRef.current);
    };
  }, [entry, dirty]);

  const onTitleChange = (title: string) => {
    setEntry((e) => (e ? { ...e, title } : e));
    setDirty(true);
  };
  const onContentChange = (json: ProseJSON) => {
    setEntry((e) => (e ? { ...e, content: json } : e));
    setDirty(true);
  };

  const onTagsInput = (value: string) => {
    const tags = value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setEntry((e) => (e ? { ...e, tags } : e));
    setDirty(true);
  };
  const onCategoryInput = (value: string) => {
    setEntry((e) => (e ? { ...e, category: value } : e));
    setDirty(true);
  };
  const onChapterPathInput = (value: string) => {
    // Stig: delar på "/" eller ">"
    const parts = value
      .split(/\/|>/)
      .map((s) => s.trim())
      .filter(Boolean);
    setEntry((e) => (e ? { ...e, chapterPath: parts } : e));
    setDirty(true);
  };
  const chapterPathText = useMemo(
    () => (entry?.chapterPath ?? []).join(" / "),
    [entry?.chapterPath]
  );

  const onDateChange = (value: string) => {
    setEntry((e) => (e ? { ...e, dateForEntry: fromISODate(value) } : e));
    setDirty(true);
  };
  const onFavoriteToggle = () => {
    setEntry((e) => (e ? { ...e, isFavorite: !e.isFavorite } : e));
    setDirty(true);
  };
  const onLockedToggle = () => {
    setEntry((e) => (e ? { ...e, isLocked: !e.isLocked } : e));
    setDirty(true);
  };

  const doSaveNow = async () => {
    if (!entry) return;
    setSaving(true);
    const updated = { ...entry, updatedAt: Date.now() };
    await putEntry(updated);
    setEntry(updated);
    setDirty(false);
    setSaving(false);
    setLastSavedAt(Date.now());
  };

  if (!entry) {
    return <div className="p-6 card">Laddar…</div>;
  }

  return (
    <div className="max-w-3xl w-full mx-auto p-6 space-y-4">
      {/* Toppbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded bg-[color:var(--surface-alt)] text-xs opacity-80">
            {entry.id}
          </span>
          {entry.isFavorite && (
            <span className="text-sm" title="Favorit">★</span>
          )}
          {entry.isLocked && (
            <span className="text-sm" title="Låst">🔒</span>
          )}
        </div>
        <div className="text-sm opacity-80">
          {saving ? "Sparar…" : dirty ? "Ändringar osparade" : lastSavedAt ? `Sparad ${new Date(lastSavedAt).toLocaleTimeString()}` : "—"}
        </div>
      </div>

      {/* Metafält */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm opacity-80">
            Datum
            <input
              type="date"
              className="mt-1 w-full bg-transparent border border-[color:var(--brand-muted)]/40 rounded-lg p-2"
              value={toISODate(entry.dateForEntry)}
              onChange={(e) => onDateChange(e.target.value)}
            />
          </label>

          <label className="text-sm opacity-80">
            Kategori
            <input
              className="mt-1 w-full bg-transparent border border-[color:var(--brand-muted)]/40 rounded-lg p-2"
              placeholder="t.ex. Personligt"
              value={entry.category ?? ""}
              onChange={(e) => onCategoryInput(e.target.value)}
            />
          </label>

          <label className="text-sm opacity-80 md:col-span-2">
            Kapitelstig (Bok / Del / Kapitel …)
            <input
              className="mt-1 w-full bg-transparent border border-[color:var(--brand-muted)]/40 rounded-lg p-2"
              placeholder="Bok 1 / Kapitel 2 / Scen A"
              value={chapterPathText}
              onChange={(e) => onChapterPathInput(e.target.value)}
            />
          </label>

          <label className="text-sm opacity-80 md:col-span-2">
            Taggar (komma-separerade)
            <input
              className="mt-1 w-full bg-transparent border border-[color:var(--brand-muted)]/40 rounded-lg p-2"
              placeholder="sorg, reflektion, projekt"
              value={entry.tags.join(", ")}
              onChange={(e) => onTagsInput(e.target.value)}
            />
          </label>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm opacity-90">
              <input type="checkbox" checked={entry.isFavorite} onChange={onFavoriteToggle} />
              Favorit
            </label>
            <label className="flex items-center gap-2 text-sm opacity-90">
              <input type="checkbox" checked={entry.isLocked} onChange={onLockedToggle} />
              Låst
            </label>
          </div>

          <div className="md:col-span-2">
            <button onClick={doSaveNow} className="px-4 py-2 rounded-lg">
              Spara nu
            </button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="card">
        <TipTapEditor
          title={entry.title}
          onTitleChange={onTitleChange}
          value={entry.content as ProseJSON}
          onChange={onContentChange}
          placeholder="Skriv din anteckning här…"
          showToolbar
        />
      </div>
    </div>
  );
}