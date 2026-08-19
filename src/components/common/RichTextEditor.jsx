// Rich text editor for the Product Description field — replaces the old
// fixed-height <textarea>. Built on Tiptap (the only rich-text editor
// dependency in this app; none existed before, so it was added rather than
// reused). Deliberately un-heighted: no CSS max-height/overflow anywhere in
// this component, so a long description simply grows the editor (and the
// Product drawer scrolls around it), matching the drawer's own existing
// scroll behavior instead of clipping content behind a second scrollbar.
import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import TiptapImage from "@tiptap/extension-image";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Image as ImageIcon,
  Baseline,
} from "lucide-react";

const ToolbarButton = ({ active, onClick, label, children, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
      active
        ? "bg-[var(--mk-primary-50)] text-[var(--mk-primary)]"
        : "text-[var(--mk-ink-500)] hover:bg-[var(--mk-bg)] hover:text-[var(--mk-ink-900)]"
    }`}
  >
    {children}
  </button>
);

const Divider = () => <span className="w-px h-5 bg-[var(--mk-line)] mx-1 shrink-0" />;

// Existing product descriptions are plain text (with blank-line paragraph
// breaks) — feeding that straight into Tiptap as HTML would collapse every
// newline, since HTML doesn't render "\n" as a line break. Detected once,
// on the first real value this editor ever receives; anything that already
// looks like HTML (from a product saved by this editor before) passes
// through unchanged.
const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const plainTextToHtml = (text) => {
  if (!text) return "";
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
};

const RichTextEditor = ({ value, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      TiptapImage,
    ],
    content: plainTextToHtml(value),
    onUpdate: ({ editor: e }) => onChange?.(e.getHTML()),
    editorProps: {
      attributes: {
        class: "rte-content min-h-[120px] text-[14px] text-[var(--mk-ink-900)] leading-[1.6]",
      },
    },
  });

  // Keeps the editor synced when `value` changes from OUTSIDE it — e.g.
  // react-hook-form's reset() populating a just-loaded product's real
  // description — but never fights the admin's own typing: it only pushes
  // an update when the incoming value actually differs from what the
  // editor already holds.
  useEffect(() => {
    if (!editor) return;
    const incoming = plainTextToHtml(value);
    if (incoming !== editor.getHTML()) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value]);

  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Link URL", previousUrl || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = window.prompt("Image URL");
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div className="rounded-lg border border-[var(--mk-line)] bg-white focus-within:ring-2 focus-within:ring-[var(--mk-primary-ring)] focus-within:border-[var(--mk-primary)] transition-colors overflow-hidden">
      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-[var(--mk-line)] bg-[#FAFBFD]">
        <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={15} />
        </ToolbarButton>

        <Divider />

        <label
          className="relative inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--mk-ink-500)] hover:bg-[var(--mk-bg)] hover:text-[var(--mk-ink-900)] cursor-pointer transition-colors"
          title="Text color"
        >
          <Baseline size={15} />
          <input
            type="color"
            aria-label="Text color"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </label>

        <Divider />

        <ToolbarButton
          label="Align left"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Align center"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Align right"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight size={15} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={15} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton label="Link" active={editor.isActive("link")} onClick={setLink}>
          <LinkIcon size={15} />
        </ToolbarButton>
        <ToolbarButton label="Image" onClick={addImage}>
          <ImageIcon size={15} />
        </ToolbarButton>
      </div>

      {/* CONTENT — deliberately no max-height/overflow; grows with real
          content, the Product drawer scrolls around it. */}
      <EditorContent editor={editor} className="px-[12px] py-2.5" />
    </div>
  );
};

export default RichTextEditor;
