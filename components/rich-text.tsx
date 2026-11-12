"use client";

import { useEffect, useRef, useState } from "react";
import { FiBold, FiItalic, FiLink, FiList, FiUnderline } from "react-icons/fi";
import { containsHtml, sanitizeHtml } from "../lib/html";

type EditorProps = {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
};

export function RichTextEditor({ name, label, defaultValue = "", placeholder }: EditorProps) {
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [html, setHtml] = useState(defaultValue);
  const htmlRef = useRef(html);
  htmlRef.current = html;
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (mode === "visual" && editorRef.current) {
      editorRef.current.innerHTML = htmlRef.current;
    }
  }, [mode]);

  function sync() {
    setHtml(editorRef.current?.innerHTML ?? "");
  }

  function exec(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    sync();
  }

  function addLink() {
    const url = window.prompt("Enter URL", "https://");
    if (url) exec("createLink", url);
  }

  const btn =
    "grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:border-primary/40 hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-slate-300";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">{label}</span>
        <div className="flex overflow-hidden rounded-lg border border-slate-200 text-[11px] font-bold dark:border-white/10">
          <button
            type="button"
            onClick={() => setMode("visual")}
            className={`px-3 py-1 transition-colors ${mode === "visual" ? "bg-primary text-white" : "bg-white text-slate-500 hover:text-primary dark:bg-white/5 dark:text-slate-300"}`}
          >
            Visual
          </button>
          <button
            type="button"
            onClick={() => setMode("html")}
            className={`px-3 py-1 transition-colors ${mode === "html" ? "bg-primary text-white" : "bg-white text-slate-500 hover:text-primary dark:bg-white/5 dark:text-slate-300"}`}
          >
            HTML
          </button>
        </div>
      </div>

      <input type="hidden" name={name} value={html} />

      {mode === "visual" ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-white/10 dark:bg-white/5">
            <button type="button" className={btn} title="Bold" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")}>
              <FiBold size={14} />
            </button>
            <button type="button" className={btn} title="Italic" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")}>
              <FiItalic size={14} />
            </button>
            <button type="button" className={btn} title="Underline" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("underline")}>
              <FiUnderline size={14} />
            </button>
            <button type="button" className={`${btn} text-[11px] font-bold`} title="Heading" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("formatBlock", "<h3>")}>
              H3
            </button>
            <button type="button" className={btn} title="Bulleted list" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")}>
              <FiList size={14} />
            </button>
            <button type="button" className={`${btn} text-[11px] font-bold`} title="Numbered list" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertOrderedList")}>
              1.
            </button>
            <button type="button" className={btn} title="Link" onMouseDown={(e) => e.preventDefault()} onClick={addLink}>
              <FiLink size={14} />
            </button>
            <button type="button" className={`${btn} w-auto px-2 text-[11px] font-bold`} title="Clear formatting" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("removeFormat")}>
              Clear
            </button>
          </div>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            data-placeholder={placeholder}
            onInput={sync}
            onBlur={sync}
            className="rt-editor min-h-[120px] max-h-[420px] overflow-y-auto bg-white px-3 py-2 text-sm leading-relaxed text-slate-700 outline-none dark:bg-transparent dark:text-slate-200"
          />
        </div>
      ) : (
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-slate-700 outline-none focus:border-primary dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
        />
      )}
      <p className="mt-1.5 text-[11px] text-gray-400 dark:text-slate-500">
        Use the Visual tab for rich formatting, or the HTML tab to paste raw HTML. Plain text works too.
      </p>
    </div>
  );
}

export function RichContent({ value, className }: { value: string | null | undefined; className?: string }) {
  if (!value) return null;
  if (containsHtml(value)) {
    return <div className={`rt-content ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }} />;
  }
  return <div className={`${className ?? ""} whitespace-pre-line`}>{value}</div>;
}
