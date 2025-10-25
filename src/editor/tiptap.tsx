import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Strike from "@tiptap/extension-strike";
import Heading from "@tiptap/extension-heading";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Code from "@tiptap/extension-code";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { lowlight } from "lowlight/lib/common.js";

export type ProseJSON = {
  type: string;
  content?: any[];
  [key: string]: any;
};

type EditorProps = {
  /** Titel för inlägget (visas i fält ovanför editorn om du skickar in onTitleChange). */
  title?: string;
  onTitleChange?: (title: string) => void;

  /** ProseMirror JSON-innehåll. Om tomt skapas ett nytt dokument. */
  value?: ProseJSON;
  onChange?: (json: ProseJSON) => void;

  /** Placeholdertext i editorn. */
  placeholder?: string;

  /** Max tecken (för räknare). 0 = obegränsat. */
  charLimit?: number;

  /** Visa/ göm verktygsrad */
  showToolbar?: boolean;
};

const TitleInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
}> = ({ value, onChange }) => {
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
    className={`px-2 py-1 rounded-md text-sm mr-1 mb-1 ${
      active ? "opacity-100 ring-1 ring-[color:var(--brand-muted)]" : "opacity-90"
    }`}
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
      Document,
      Paragraph,
      Text,
      Bold,
      Italic,
      Strike,
      Heading.configure({ levels: [1, 2, 3, 4] }),
      BulletList,
      OrderedList,
      ListItem,
      TaskList,
      TaskItem.configure({
        nested: true
      }),
      Code,
      CodeBlockLowlight.configure({
        lowlight
      }),
      HorizontalRule,
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
      }),
      StarterKit.configure({
        // Deaktivera duplicerade extensions från StarterKit när vi lägger dem manuellt
        document: false,
        paragraph: false,
        text: false,
        heading: false,
        code: false,
        codeBlock: false,
        horizontalRule: false
      })
    ],
    content: value ?? {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "" }]
        }
      ]
    },
    autofocus: "end",
    onUpdate: ({ editor }) => {
      const json = editor.getJSON() as ProseJSON;
      onChange?.(json);
    }
  });

  // ——— Bilduppladdning till data-URL (MVP):
  // För v1 använder vi data-URL i src. Exporten blir då enkel (allt i en fil).
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const onPickImage = useCallback(() => fileInputRef.current?.click(), []);
  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;
      const dataUrl = await fileToDataURL(file);
      editor
        .chain()
        .focus()
        .setImage({
          src: dataUrl,
          alt: file.name
        })
        .run();
      e.target.value = ""; // nollställ för att kunna välja samma fil igen
    },
    [editor]
  );

  // ——— Verktygsradskommandon:
  const cmd = useMemo(() => {
    if (!editor) return null;
    return {
      toggleBold: () => editor.chain().focus().toggleBold().run(),
      toggleItalic: () => editor.chain().focus().toggleItalic().run(),
      toggleStrike: () => editor.chain().focus().toggleStrike().run(),
      toggleBullet: () => editor.chain().focus().toggleBulletList().run(),
      toggleOrdered: () => editor.chain().focus().toggleOrderedList().run(),
      toggleTask: () => editor.chain().focus().toggleTaskList().run(),
      setH: (level: 1 | 2 | 3 | 4) => editor.chain().focus().toggleHeading({ level }).run(),
      setParagraph: () => editor.chain().focus().setParagraph().run(),
      setCodeBlock: () => editor.chain().focus().toggleCodeBlock().run(),
      setLink: () => {
        const prev = editor.getAttributes("link").href as string | undefined;
        const url = prompt("Länkadress (https://…)", prev ?? "");
        if (url === null) return;
        if (url === "") {
          editor.chain().focus().unsetLink().run();
          return;
        }
        try {
          // enkel validering
          const u = new URL(url);
          editor.chain().focus().extendMarkRange("link").setLink({ href: u.toString() }).run();
        } catch {
          alert("Ogiltig URL.");
        }
      },
      unsetLink: () => editor.chain().focus().unsetLink().run(),
      hr: () => editor.chain().focus().setHorizontalRule().run(),
      undo: () => editor.chain().focus().undo().run(),
      redo: () => editor.chain().focus().redo().run()
    };
  }, [editor]);

  const is = (name: string, attrs?: any) => !!editor?.isActive(name as any, attrs);

  if (!editor) {
    return <div className="card">Laddar editor…</div>;
  }

  return (
    <div className="w-full">
      {onTitleChange && (
        <TitleInput value={title} onChange={onTitleChange} />
      )}

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

          <ToolbarButton onClick={cmd?.setCodeBlock} active={is("codeBlock")} label="Kodblock">{`</>`}</ToolbarButton>
          <ToolbarButton onClick={cmd?.hr} label="Horisontell linje">—</ToolbarButton>

          <span className="mx-2 opacity-60">|</span>

          <ToolbarButton onClick={onPickImage} label="Infoga bild">🖼️</ToolbarButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileChange}
          />

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

// ===== Hjälpare =====

async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => resolve(fr.result as string);
    fr.readAsDataURL(file);
  });
}

export default TipTapEditor;