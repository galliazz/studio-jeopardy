/*
 * Sanificatore per l'HTML delle domande, scritto dall'host nell'editor
 * contentEditable e importabile da file JSON di terzi.
 *
 * La versione precedente era una LISTA NERA di espressioni regolari, aggirabile
 * in modo banale: cercava uno spazio prima degli attributi `on…`, mentre il
 * browser accetta anche la barra, quindi `<img src=x/onerror=alert(1)>` e
 * `<svg/onload=…>` passavano indenni.
 *
 * Questa versione ragiona per LISTA BIANCA e FALLISCE CHIUSO: ogni `<` che non
 * apra un tag riconosciuto ed esplicitamente permesso diventa `&lt;`. Ne segue
 * anche che il risultato è stabile — sanificare due volte dà lo stesso testo —
 * perché dopo la prima passata non restano `<` ambigui.
 *
 * Nota: non c'è una libreria di sanificazione fra le dipendenze e questo file
 * gira anche lato server (importGame, updateTile), dove non esiste il DOM.
 * Quando sarà possibile installare pacchetti, la scelta corretta è un parser
 * vero (DOMPurify lato client, isomorphic-dompurify lato server).
 */

/** Tag conservati. Qualunque altro tag viene rimosso, mantenendone il testo. */
const ALLOWED_TAGS = new Set(["b", "strong", "i", "em", "u", "s", "span", "font", "br", "div", "p"]);

/** Tag che non hanno una chiusura. */
const VOID_TAGS = new Set(["br"]);

/** Attributi ammessi, per tag. Tutti gli altri — inclusi tutti gli `on…` — cadono. */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  span: new Set(["style"]),
  div: new Set(["style"]),
  p: new Set(["style"]),
  font: new Set(["color", "size", "face"]),
};

/*
 * Valori CSS ammessi, per proprietà. È una lista BIANCA di forme valide: una
 * lista nera di pattern pericolosi si aggira con commenti, entità HTML o
 * escape CSS, che qui semplicemente non superano la validazione.
 */
const COLOR = String.raw`#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\)|[a-zA-Z]{3,20}`;
const LENGTH = String.raw`-?\d{1,4}(\.\d{1,3})?(px|pt|em|rem|%|ex|ch|vw|vh)?`;

const SAFE_STYLE_VALUES: Record<string, RegExp> = {
  color: new RegExp(`^(${COLOR})$`),
  "background-color": new RegExp(`^(${COLOR})$`),
  "font-size": new RegExp(`^(${LENGTH}|smaller|larger|x-small|small|medium|large|x-large|xx-large)$`),
  "font-weight": /^(\d{3}|normal|bold|bolder|lighter)$/,
  "font-style": /^(normal|italic|oblique)$/,
  "font-family": /^[a-zA-Z0-9\s,\-]{1,120}$/,
  "text-decoration": /^(none|underline|overline|line-through)( (solid|dotted|dashed|wavy))?$/,
  "text-align": /^(left|right|center|justify)$/,
  "letter-spacing": new RegExp(`^(${LENGTH}|normal)$`),
  "line-height": new RegExp(`^(${LENGTH}|normal)$`),
};

/** Valori ammessi per gli attributi non-style. */
const SAFE_ATTR_VALUES: Record<string, RegExp> = {
  color: new RegExp(`^(${COLOR})$`),
  size: /^[1-7]$/,
  face: /^[a-zA-Z0-9\s,\-]{1,120}$/,
};

function sanitizeStyle(value: string): string {
  // I commenti CSS servono solo a spezzare i controlli: si eliminano prima.
  const cleaned = value.replace(/\/\*[\s\S]*?\*\//g, " ");
  return cleaned
    .split(";")
    .map((decl) => decl.trim())
    .filter(Boolean)
    .map((decl) => {
      const sep = decl.indexOf(":");
      if (sep < 0) return null;
      const prop = decl.slice(0, sep).trim().toLowerCase();
      const val = decl.slice(sep + 1).trim();
      const pattern = SAFE_STYLE_VALUES[prop];
      if (!pattern || !pattern.test(val)) return null;
      return `${prop}: ${val}`;
    })
    .filter((d): d is string => d !== null)
    .join("; ");
}

function sanitizeAttrs(tag: string, raw: string): string {
  const allowed = ALLOWED_ATTRS[tag];
  if (!allowed) return "";
  let out = "";
  const attrRe = /([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match: RegExpExecArray | null;
  while ((match = attrRe.exec(raw)) !== null) {
    const name = match[1]!.toLowerCase();
    if (!allowed.has(name)) continue;
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    const clean = name === "style" ? sanitizeStyle(value) : SAFE_ATTR_VALUES[name]?.test(value) ? value : "";
    if (clean) out += ` ${name}="${clean}"`;
  }
  return out;
}

/** Ogni `<` che non apra un tag emesso diventa testo: è la regola fail-closed. */
function escapeLoose(text: string): string {
  return text.replace(/</g, "&lt;");
}

/** Minimal sanitizer for host-authored tile HTML (b/i/u/span formatting). */
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  // Un commento HTML può nascondere del markup: si rimuove per primo.
  const source = html.replace(/<!--[\s\S]*?-->/g, "");

  let out = "";
  let cursor = 0;
  /*
   * Nessuno spazio fra `<` e il nome del tag: l'HTML non lo permette, e
   * accettarlo faceva sparire testo legittimo come "x < y allora z > 0".
   * Il gruppo degli attributi salta i valori quotati, così un `>` al loro
   * interno non chiude il tag prima del dovuto.
   */
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(source)) !== null) {
    out += escapeLoose(source.slice(cursor, match.index));
    cursor = tagRe.lastIndex;

    const isClosing = match[1] === "/";
    const name = match[2]!.toLowerCase();
    const attrsRaw = match[3] ?? "";

    // Tag non permesso: si scarta insieme ai suoi attributi. Il `<` non
    // sopravvive in nessuna forma, quindi non può ricomporre altro markup.
    if (!ALLOWED_TAGS.has(name)) continue;

    // Un tag di chiusura non ha attributi: `</b foo>` non è markup valido.
    if (isClosing) {
      if (!VOID_TAGS.has(name) && attrsRaw.trim() === "") out += `</${name}>`;
      continue;
    }
    if (VOID_TAGS.has(name)) {
      out += `<${name} />`;
      continue;
    }
    out += `<${name}${sanitizeAttrs(name, attrsRaw)}>`;
  }

  return out + escapeLoose(source.slice(cursor));
}

/**
 * Testo semplice per le anteprime. La regex tiene conto dei valori quotati,
 * altrimenti un `>` dentro un attributo lasciava frammenti di markup a schermo.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[a-zA-Z/][^>"']*(?:"[^"]*"|'[^']*'[^>"']*)*>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
