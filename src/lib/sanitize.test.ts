/// <reference types="node" />
/**
 * Il sanificatore protegge l'HTML delle domande, che finisce sullo schermo di
 * tutti: la console dell'host, gli overlay in diretta su OBS, i telefoni. Una
 * domanda può arrivare anche da un file JSON scritto da altri. Un solo
 * attributo `on…` che passa è codice eseguito su ogni dispositivo collegato.
 *
 * Più che le uscite esatte, qui si controlla una proprietà: nel risultato
 * ogni `<` apre un tag della lista bianca, con soli attributi ammessi e
 * valori innocui. Poi la si mette alla prova con vettori noti e con migliaia
 * di stringhe generate.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { sanitizeHtml, stripHtml } from "./sanitize.ts";

const ALLOWED_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "span",
  "font",
  "br",
  "div",
  "p",
]);
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  span: new Set(["style"]),
  div: new Set(["style"]),
  p: new Set(["style"]),
  font: new Set(["color", "size", "face"]),
};
const OUTPUT_TAG = /<(\/?)([^\s/>]+)([^>]*)>/g;
const DANGEROUS = /javascript|vbscript|expression|url\s*\(|@import|behavior|[<>"'`\\]|&#|&\w+;/i;

/** Sanifica e controlla che il risultato non possa eseguire niente. */
function inert(html: string): string {
  const out = sanitizeHtml(html);
  for (const [, closing, name, attrs] of out.matchAll(OUTPUT_TAG)) {
    assert.ok(ALLOWED_TAGS.has(name!), `tag non ammesso <${name}> da ${JSON.stringify(html)}`);
    if (closing) {
      assert.equal(attrs, "", `chiusura con attributi da ${JSON.stringify(html)}`);
      continue;
    }
    const rest = attrs!.replace(/\s+([a-z-]+)="([^"]*)"/g, (_, attr: string, value: string) => {
      assert.ok(
        ALLOWED_ATTRS[name!]?.has(attr),
        `attributo ${attr} su <${name}> da ${JSON.stringify(html)}`,
      );
      assert.doesNotMatch(
        value,
        DANGEROUS,
        `valore ${JSON.stringify(value)} da ${JSON.stringify(html)}`,
      );
      return "";
    });
    assert.match(
      rest,
      /^\s*\/?$/,
      `resto non riconosciuto ${JSON.stringify(rest)} da ${JSON.stringify(html)}`,
    );
  }
  const text = out.replace(OUTPUT_TAG, "");
  assert.ok(!text.includes("<"), `un < sopravvissuto nel testo: ${JSON.stringify(out)}`);
  // Stabile: sanificare di nuovo non cambia niente, quindi un salvataggio
  // ripetuto dall'editor non può far "maturare" un vettore in due passate.
  assert.equal(sanitizeHtml(out), out, `non idempotente su ${JSON.stringify(html)}`);
  return out;
}

describe("vettori XSS noti", () => {
  const vectors: [string, string][] = [
    ["script", "<script>alert(1)</script>"],
    ["script maiuscolo con src", "<SCRIPT SRC=//x.js></SCRIPT>"],
    ["img onerror", "<img src=x onerror=alert(1)>"],
    ["onerror dopo una barra", "<img src=x/onerror=alert(1)>"],
    ["svg onload", "<svg/onload=alert(1)>"],
    ["gestore su un tag ammesso", '<b onclick="alert(1)">x</b>'],
    ["gestore dopo lo stile", '<span style="color:red" onmouseover="alert(1)">x</span>'],
    ["gestore prima dello stile", '<span onmouseover="alert(1)" style="color:red">x</span>'],
    ["gestore attaccato alle virgolette", '<span style="color:red"onclick="alert(1)">x</span>'],
    ["gestore su una nuova riga", "<b\nonclick=alert(1)>x</b>"],
    ["gestore con la barra", "<b/onclick=alert(1)>x</b>"],
    ["link javascript", '<a href="javascript:alert(1)">x</a>'],
    ["iframe javascript", '<iframe src="javascript:alert(1)"></iframe>'],
    ["math e xlink", '<math><mi xlink:href="javascript:alert(1)">x</mi></math>'],
    ["colore javascript su font", '<font color="javascript:alert(1)">x</font>'],
    ["url() nello stile", '<span style="background:url(javascript:alert(1))">x</span>'],
    ["expression() nello stile", '<span style="color: expression(alert(1))">x</span>'],
    ["background-image", '<span style="color:red;background-image:url(x)">x</span>'],
    ["commento dentro un valore", '<span style="color:r/**/ed">x</span>'],
    ["entità nello stile", '<span style="color:&#106;avascript">x</span>'],
    ["virgolette codificate", '<span style="color:red&quot; onclick=&quot;alert(1)">x</span>'],
    ["stile doppio", '<span style="color:red" style="color:javascript:alert(1)">x</span>'],
    ["position fixed", '<span style="position:fixed;top:0;left:0">x</span>'],
    ["tag style", "<style>body{display:none}</style>x"],
    ["tag link", '<link rel="stylesheet" href="//evil/x.css">'],
    ["meta refresh", '<meta http-equiv="refresh" content="0;url=//evil">'],
    ["base href", '<base href="//evil/">'],
    ["form e input", '<form action="//evil"><input name="p"></form>'],
    ["object e embed", '<object data="x.swf"></object><embed src="x.swf">'],
    ["template", "<template><img src=x onerror=alert(1)></template>"],
    ["attributi di dati e classi", '<span data-x="1" class="evil" id="x">x</span>'],
    ["tag annidati nel nome", "<scr<script>ipt>alert(1)</script>"],
    ["tag spezzato in due", "<<script>script>alert(1)<</script>/script>"],
    ["commento con script", "<!-- <script>alert(1)</script> -->ok"],
    ["commento vuoto del browser", "<!--><script>alert(1)</script>-->"],
    ["commento non chiuso", "<!-- <img src=x onerror=alert(1)>"],
    ["chiusura con attributi", '</b onclick="alert(1)">'],
    ["tag non chiuso", '<img src="x" onerror="alert(1)"'],
    ["virgoletta non chiusa", '<b title="x><img src=x onerror=alert(1)>'],
    ["> dentro un valore", '<b title="a>b" onclick=x>t</b>'],
    ["cdata", "<![CDATA[<script>alert(1)</script>]]>"],
    ["doctype", "<!DOCTYPE html><script>alert(1)</script>"],
    ["istruzione di elaborazione", '<?xml version="1.0"?><script>alert(1)</script>'],
    ["byte nullo nel nome", "<scr\0ipt>alert(1)</scr\0ipt>"],
    ["tab nel protocollo", '<a href="java\tscript:alert(1)">x</a>'],
    ["font con size fuori scala", '<font size="9" face="x;background:url(y)">x</font>'],
  ];
  for (const [name, html] of vectors) {
    test(name, () => {
      inert(html);
    });
  }

  test("nessun gestore sopravvive dentro un tag", () => {
    // Si guardano solo i tag emessi: un `onerror=` rimasto nel testo, dopo un
    // `&lt;`, è una scritta a schermo e non un attributo.
    for (const [, html] of vectors) {
      for (const [tag] of sanitizeHtml(html).matchAll(OUTPUT_TAG)) {
        assert.doesNotMatch(tag, /\bon\w+\s*=/i, html);
      }
    }
  });

  test("un tag lasciato aperto diventa testo visibile, non markup", () => {
    // Senza `>` il browser non lo chiuderebbe mai: il sanificatore non prova a
    // indovinare dove finisce, lo mostra com'è con il `<` neutralizzato.
    assert.equal(inert('<img src="x" onerror="alert(1)"'), '&lt;img src="x" onerror="alert(1)"');
  });
});

describe("la formattazione dell'host resta", () => {
  test("grassetto, corsivo, sottolineato e barrato", () => {
    const html = "<b>b</b> <strong>st</strong> <i>i</i> <em>em</em> <u>u</u> <s>s</s>";
    assert.equal(inert(html), html);
  });

  test("gli a capo diventano tutti uguali", () => {
    assert.equal(inert("a<br>b<br/>c<BR />d"), "a<br />b<br />c<br />d");
  });

  test("colori, dimensioni e allineamento ammessi passano", () => {
    assert.equal(
      inert('<span style="color:#ff0000;font-size:20px;font-weight:bold">x</span>'),
      '<span style="color: #ff0000; font-size: 20px; font-weight: bold">x</span>',
    );
    assert.equal(
      inert('<div style="text-align:center"><p style="line-height:1.5">c</p></div>'),
      '<div style="text-align: center"><p style="line-height: 1.5">c</p></div>',
    );
    assert.equal(
      inert('<span style="color: rgb(0, 128, 0); background-color: #fff">x</span>'),
      '<span style="color: rgb(0, 128, 0); background-color: #fff">x</span>',
    );
  });

  test("il tag font dell'editor passa con i suoi attributi", () => {
    const html = '<font color="red" size="3" face="Arial, sans-serif">x</font>';
    assert.equal(inert(html), html);
  });

  test("di uno stile misto resta solo la parte buona", () => {
    assert.equal(
      inert('<span style="color:red;position:absolute;background:url(x)">x</span>'),
      '<span style="color: red">x</span>',
    );
  });

  test("i commenti CSS non spezzano un valore buono", () => {
    assert.equal(
      inert('<span style="color:/**/red">x</span>'),
      '<span style="color: red">x</span>',
    );
  });

  test("un tag non ammesso sparisce ma il suo testo resta", () => {
    assert.equal(inert("<h1>Titolo</h1> e <mark>evidenza</mark>"), "Titolo e evidenza");
  });

  test("i minori nel testo restano leggibili", () => {
    // La versione precedente accettava uno spazio dopo `<` come inizio di
    // tag, e faceva sparire testo come questo.
    assert.equal(inert("x < y allora z > 0"), "x &lt; y allora z > 0");
    assert.equal(inert("3<4"), "3&lt;4");
  });

  test("le entità già scritte restano come sono", () => {
    assert.equal(inert("&lt;b&gt; &amp; &nbsp;"), "&lt;b&gt; &amp; &nbsp;");
  });

  test("una stringa vuota resta vuota", () => {
    assert.equal(sanitizeHtml(""), "");
  });
});

describe("stringhe generate", () => {
  // Generatore deterministico: un fallimento si riproduce sempre uguale.
  function rng(seed: number) {
    let s = seed >>> 0;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 2 ** 32;
    };
  }
  const pieces = [
    "<",
    ">",
    "</",
    "/>",
    "/",
    " ",
    "\n",
    "\t",
    '"',
    "'",
    "=",
    ":",
    ";",
    "(",
    ")",
    "b",
    "span",
    "font",
    "div",
    "br",
    "script",
    "img",
    "svg",
    "a",
    "style",
    "on",
    "onerror",
    "onclick",
    "src",
    "href",
    "color",
    "size",
    "face",
    "javascript",
    "alert(1)",
    "url",
    "expression",
    "red",
    "#fff",
    "12px",
    "<!--",
    "-->",
    "&",
    "&lt;",
    "&#",
    "/*",
    "*/",
    "\\",
    "`",
    "x",
  ];

  test("nessuna combinazione produce markup eseguibile", () => {
    const next = rng(36);
    for (let i = 0; i < 5000; i++) {
      const length = 1 + Math.floor(next() * 24);
      let html = "";
      for (let j = 0; j < length; j++) html += pieces[Math.floor(next() * pieces.length)];
      inert(html);
    }
  });
});

describe("stripHtml", () => {
  test("toglie i tag e lascia il testo, per le anteprime", () => {
    assert.equal(stripHtml("<b>Ciao</b> <i>mondo</i>"), "Ciao mondo");
  });

  test("un > dentro un valore non lascia pezzi di markup a schermo", () => {
    assert.equal(stripHtml('<span style="a>b">Ciao</span>'), "Ciao");
  });

  test("le entità tornano caratteri e gli spazi si compattano", () => {
    assert.equal(stripHtml("  a&nbsp;&amp;\n\n b &lt;3 &gt; "), "a & b <3 >");
  });

  test("&amp;lt; si decodifica una volta sola", () => {
    assert.equal(stripHtml("&amp;lt;"), "&lt;");
  });

  test(
    "un tag con più attributi fra virgolette doppie sparisce anche lui",
    {
      todo: "la regex di stripHtml ammette testo libero solo dopo un valore fra apici singoli: dopo il primo valore fra doppie il tag non si chiude e resta a schermo",
    },
    () => {
      // È la forma che il sanificatore stesso produce per il tag font.
      assert.equal(stripHtml('<font color="red" size="3">Ciao</font>'), "Ciao");
      assert.equal(stripHtml('<span style="a>b" class="c">Ciao</span>'), "Ciao");
    },
  );
});
