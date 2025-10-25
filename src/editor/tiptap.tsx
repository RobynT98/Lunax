import React, { useCallback, useMemo, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";

export type ProseJSON = {
  type: string;
  content?: any[];
  [key: string]: any;
};

type EditorProps = {
  title?: string;
  onTitleChange?: (title: string) => void;
  value?: ProseJSON;
  onChange?: (json: ProseJSON) => void;
  placeholder?: string;
  charLimit?: number;
  showToolbar?: boolean;
};

const TitleInput: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  return (
    <input
      className="w-full mb-3 text-2xl font-semibold bg-transparent outline-none border-b border-[color:var(--brand-muted)]/40 focus:border-[color:var(--brand)] transition p-1"
      placeholder="Titel…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};

const ToolbarButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; label?: string }
> = ({ active, label, children, ...rest }) => (
  <button
    {...rest}
    className={`px-2 py-1 rounded-md text-sm mr-1 mb-1 ${active ? "opacity-100 ring-1 ring-[color:var(--brand-muted)]" : "opacity-90"}`}
    title={label}
    type="button"
  >
    {children}
  </button>
);

export const TipTapEditor: React.FC<EditorProps> = ({
  title = "",
  onTitleChange,
  value,
  onChange,
  placeholder = "Skriv här… / för kommandon",
  charLimit = 0,
  showToolbar = true
}) => {
  const editor = useEditor({
    extensions: [
      // StarterKit inkluderar: document, paragraph, text, bold, italic, strike,
      // heading, blockquote, code, codeBlock, lists, history, hardBreak, horizontalRule m.m.
      StarterKit,
      Image.configure({
        inline: false,
        allowBase64: true
      }),
      Link.configure({
        autolink: true,
        openOnClick: true,
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" }
      }),
      Placeholder.configure({
        placeholder,
        showOnlyWhenEditable: true,
        includeChildren: true
      }),
      CharacterCount.configure({
        limit: charLimit > 0 ? charLimit : undefined
      })
    ],
    content: value ?? {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "" }] }]
    },
    autofocus: "end",
    onUpdate: ({ editor }) => {
      const json = editor.getJSON() as ProseJSON;
      onChange?.(json);
    }
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const onPickImage = useCallback(() => fileInputRef.current?.click(), []);
  const onFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const dataUrl = await fileToDataURL(file);
    editor.chain().focus().setImage({ src: dataUrl, alt: file.name }).run();
    e.target.value = "";
  }, [editor]);

  const cmd = useMemo(() => {
    if (!editor) return null;
    return {
      undo: () => editor.chain().focus().undo().run(),
      redo: () => editor.chain().focus().redo().run(),
      setH: (level: 1 | 2 | 3 | 4) => editor.chain().focus().toggleHeading({ level }).run(),
      setParagraph: () => editor.chain().focus().setParagraph().run(),
      toggleBold: () => editor.chain().focus().toggleBold().run(),
      toggleItalic: () => editor.chain().focus().toggleItalic().run(),
      toggleStrike: () => editor.chain().focus().toggleStrike().run(),
      toggleBullet: () => editor.chain().focus().toggleBulletList().run(),
      toggleOrdered: () => editor.chain().focus().toggleOrderedList().run(),
      toggleTask: () => editor.chain().focus().toggleTaskList().run(),
      toggleCodeBlock: () => editor.chain().focus().toggleCodeBlock().run(),
      hr: () => editor.chain().focus().setHorizontalRule().run(),
      setLink: () => {
        const prev = editor.getAttributes("link").href as string | undefined;
        const url = prompt("Länkadress (https://…)", prev ?? "");
        if (url === null) return;
        if (url === "") {
          editor.chain().focus().unsetLink().run();
          return;
        }
        try {
          const u = new URL(url);
          editor.chain().focus().extendMarkRange("link").setLink({ href: u.toString() }).run();
        } catch {
          alert("Ogiltig URL.");
        }
      },
      unsetLink: () => editor.chain().focus().unsetLink().run()
    };
  }, [editor]);

  const is = (name: string, attrs?: any) => !!editor?.isActive(name as any, attrs);

  if (!editor) return <div className="card">Laddar editor…</div>;

  return (
    <div className="w-full">
      {onTitleChange && <TitleInput value={title} onChange={onTitleChange} />}

      {showToolbar && (
        <div className="flex flex-wrap items-center mb-3">
          <ToolbarButton onClick={cmd?.undo} label="Ångra">↶</ToolbarButton>
          <ToolbarButton onClick={cmd?.redo} label="Gör om">↷</ToolbarButton>

          <span className="mx-2 opacity-60">|</span>

          <ToolbarButton active={is("heading", { level: 1 })} onClick={() => cmd?.setH(1)} label="Rubrik 1">H1</ToolbarButton>
          <ToolbarButton active={is("heading", { level: 2 })} onClick={() => cmd?.setH(2)} label="Rubrik 2">H2</ToolbarButton>
          <ToolbarButton active={is("heading", { level: 3 })} onClick={() => cmd?.setH(3)} label="Rubrik 3">H3</ToolbarButton>
          <ToolbarButton active={is("heading", { level: 4 })} onClick={() => cmd?.setH(4)} label="Rubrik 4">H4</ToolbarButton>
          <ToolbarButton active={is("paragraph")} onClick={cmd?.setParagraph} label="Brödtext">¶</ToolbarButton>

          <span className="mx-2 opacity-60">|</span>

          <ToolbarButton active={is("bold")} onClick={cmd?.toggleBold} label="Fet">B</ToolbarButton>
          <ToolbarButton active={is("italic")} onClick={cmd?.toggleItalic} label="Kursiv"><i>I</i></ToolbarButton>
          <ToolbarButton active={is("strike")} onClick={cmd?.toggleStrike} label="Genomstruken">S</ToolbarButton>

          <span className="mx-2 opacity-60">|</span>

          <ToolbarButton active={is("bulletList")} onClick={cmd?.toggleBullet} label="Punktlista">• List</ToolbarButton>
          <ToolbarButton active={is("orderedList")} onClick={cmd?.toggleOrdered} label="Numrerad lista">1. List</ToolbarButton>
          <ToolbarButton active={is("taskList")} onClick={cmd?.toggleTask} label="Checklistor">☑</ToolbarButton>

          <span className="mx-2 opacity-60">|</span>

          <ToolbarButton onClick={cmd?.toggleCodeBlock} active={is("codeBlock")} label="Kodblock">{`</>`}</ToolbarButton>
          <ToolbarButton onClick={cmd?.hr} label="Horisontell linje">—</ToolbarButton>

          <span className="mx-2 opacity-60">|</span>

          <ToolbarButton onClick={() => fileInputRef.current?.click()} label="Infoga bild">🖼️</ToolbarButton>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

          <ToolbarButton onClick={cmd?.setLink} active={is("link")} label="Länk">🔗</ToolbarButton>
          <ToolbarButton onClick={cmd?.unsetLink} label="Ta bort länk">⨉</ToolbarButton>

          {charLimit > 0 && (
            <span className="ml-auto text-sm opacity-70">
              {editor.storage.characterCount.characters()}/{charLimit}
            </span>
          )}
        </div>
      )}

      <EditorContent editor={editor} className="ProseMirror" />
    </div>
  );
};

async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => resolve(fr.result as string);
    fr.readAsDataURL(file);
  });
}

export default TipTapEditor;