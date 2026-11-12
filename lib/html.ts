const TAG_RE = /<\/?[a-z][\s\S]*>/i;

export function containsHtml(value: string | null | undefined): boolean {
  return typeof value === "string" && TAG_RE.test(value);
}

export function stripHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ALLOWED_TAGS = new Set([
  "P", "BR", "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "DEL", "INS",
  "UL", "OL", "LI", "A", "H1", "H2", "H3", "H4", "H5", "H6",
  "BLOCKQUOTE", "SPAN", "DIV", "HR", "CODE", "PRE", "SUB", "SUP", "TABLE",
  "THEAD", "TBODY", "TR", "TH", "TD", "FIGURE", "FIGCAPTION", "IMG",
]);
const ALLOWED_ATTRS = new Set(["href", "target", "rel", "title", "src", "alt", "width", "height", "colspan", "rowspan"]);

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  const clean = (node: Element) => {
    for (const el of Array.from(node.children)) {
      if (!ALLOWED_TAGS.has(el.tagName)) {
        el.replaceWith(doc.createTextNode(el.textContent ?? ""));
        continue;
      }
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        const unsafeUrl = (name === "href" || name === "src") && /^\s*(javascript|data):/i.test(attr.value);
        if (!ALLOWED_ATTRS.has(name) || name.startsWith("on") || unsafeUrl) {
          el.removeAttribute(attr.name);
        }
      }
      if (el.tagName === "A") {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer nofollow");
      }
      clean(el);
    }
  };
  clean(doc.body);
  return doc.body.innerHTML;
}
