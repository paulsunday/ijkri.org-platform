"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Image from "@tiptap/extension-image";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import Link from "@tiptap/extension-link";
import { useEffect, useState } from "react";

type RichTextEditorProps = {
  name: string;
  initialContent: string;
  minHeightClassName?: string;
  placeholder?: string;
};

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`rounded px-2 py-1 text-sm font-semibold ${
        active
          ? "bg-blue-700 text-white"
          : "bg-white text-gray-700 hover:bg-gray-100"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const addImage = () => {
    const url = window.prompt("Image URL");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const addLink = () => {
    const previousUrl = editor.getAttributes("link").href as
      | string
      | undefined;
    const url = window.prompt("Link URL", previousUrl ?? "");

    if (url === null) {
      return;
    }

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const insertTable = () => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  return (
    <div className="flex flex-wrap gap-1 border-b bg-slate-50 p-2">
      <ToolbarButton
        label="Heading 1"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
      >
        H1
      </ToolbarButton>

      <ToolbarButton
        label="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
      >
        H2
      </ToolbarButton>

      <ToolbarButton
        label="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
      >
        H3
      </ToolbarButton>

      <span className="mx-1 w-px bg-gray-300" />

      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <strong>B</strong>
      </ToolbarButton>

      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <em>I</em>
      </ToolbarButton>

      <ToolbarButton
        label="Superscript"
        active={editor.isActive("superscript")}
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
      >
        X&#178;
      </ToolbarButton>

      <ToolbarButton
        label="Subscript"
        active={editor.isActive("subscript")}
        onClick={() => editor.chain().focus().toggleSubscript().run()}
      >
        X&#8322;
      </ToolbarButton>

      <span className="mx-1 w-px bg-gray-300" />

      <ToolbarButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        • List
      </ToolbarButton>

      <ToolbarButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1. List
      </ToolbarButton>

      <ToolbarButton
        label="Block quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        Quote
      </ToolbarButton>

      <span className="mx-1 w-px bg-gray-300" />

      <ToolbarButton label="Insert table" onClick={insertTable}>
        Table
      </ToolbarButton>

      <ToolbarButton label="Insert image" onClick={addImage}>
        Image
      </ToolbarButton>

      <ToolbarButton
        label="Link"
        active={editor.isActive("link")}
        onClick={addLink}
      >
        Link
      </ToolbarButton>

      <span className="mx-1 w-px bg-gray-300" />

      <ToolbarButton
        label="Undo"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        Undo
      </ToolbarButton>

      <ToolbarButton
        label="Redo"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        Redo
      </ToolbarButton>
    </div>
  );
}

/**
 * Rich text editor for production/typesetting content. Renders its
 * current HTML into a hidden input under `name` on every change so it
 * can be submitted as part of a normal server-action form post — no
 * client-side fetch wiring needed.
 */
export function RichTextEditor({
  name,
  initialContent,
  minHeightClassName = "min-h-[200px]",
  placeholder,
}: RichTextEditorProps) {
  const [html, setHtml] = useState(initialContent || "");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Image,
      Superscript,
      Subscript,
      Link.configure({ openOnClick: false }),
    ],
    content: initialContent || "",
    editorProps: {
      attributes: {
        class: `rich-text-editor-content max-w-none p-4 focus:outline-none ${minHeightClassName}`,
        "data-placeholder": placeholder ?? "",
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      setHtml(updatedEditor.getHTML());
    },
  });

  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  if (!editor) {
    return (
      <div
        className={`rounded-lg border bg-white p-4 text-sm text-gray-500 ${minHeightClassName}`}
      >
        Loading editor…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <Toolbar editor={editor} />

      <EditorContent editor={editor} />

      <input type="hidden" name={name} value={html} readOnly />
    </div>
  );
}
