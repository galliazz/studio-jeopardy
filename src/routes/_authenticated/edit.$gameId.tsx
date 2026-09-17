import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Play,
  Bold,
  Italic,
  Underline,
  Palette,
  ImagePlus,
  Music,
  X,
  Copy,
  ExternalLink,
  ChevronDown,
  Type,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  getGameBoard,
  updateGame,
  updateCategoryTitle,
  updateTile,
  setRowPoints,
} from "@/lib/games.functions";
import { startSession } from "@/lib/sessions.functions";
import {
  themeOf,
  textScopeCss,
  BOARD_FONTS,
  type BoardData,
  type Category,
  type Tile,
  type ThemeSettings,
  type TextScope,
  type TextStyle,
} from "@/lib/types";
import { stripHtml } from "@/lib/sanitize";
import { uploadMedia, useSignedUrl, IMAGE_CAP_BYTES, AUDIO_CAP_BYTES } from "@/lib/media";
import { ThemeToggle, useThemeMode } from "@/components/ThemeToggle";
import { SettingsButton } from "@/components/SettingsDialog";
import { darkBoardColors } from "@/lib/theme-mode";
import { useOrigin } from "@/hooks/use-origin";
import { sfx } from "@/lib/sfx";
import { SPRING_SNAP, SPRING_UI } from "@/lib/motion";

export const Route = createFileRoute("/_authenticated/edit/$gameId")({
  head: () => ({
    meta: [
      { title: "Board Editor — JEOPARDESTINY" },
      { name: "description", content: "Design your trivia board: questions, answers, media, and theme." },
      { property: "og:title", content: "Board Editor — JEOPARDESTINY" },
      { property: "og:description", content: "Design your trivia board: questions, answers, media, and theme." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: EditorPage,
});

/**
 * Il registro delle etichette di campo: maiuscoletto piccolo molto spaziato, in
 * colore attenuato. È lo stesso della console — le due pagine ora dicono
 * "questa è un'etichetta" nello stesso modo, invece di ognuna a modo suo.
 */
const FIELD_LABEL = "mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground";

const THEME_PRESETS: { name: string; theme: Pick<ThemeSettings, "bg" | "card" | "accent"> }[] = [
  { name: "Lilac Bloom", theme: { bg: "#F4EAF8", card: "#E3D3F5", accent: "#5B3E77" } },
  { name: "Peach Fizz", theme: { bg: "#FEF1E6", card: "#FBD9C2", accent: "#7A4326" } },
  { name: "Mint Sorbet", theme: { bg: "#E9F8EF", card: "#C8ECD7", accent: "#226047" } },
  { name: "Blush Butter", theme: { bg: "#FDEDF1", card: "#FBE0B8", accent: "#7A3350" } },
];

function EditorPage() {
  const { gameId } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchBoard = useServerFn(getGameBoard);
  const { data } = useQuery({
    queryKey: ["board", gameId],
    queryFn: () => fetchBoard({ data: { gameId } }),
  });

  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [playOpen, setPlayOpen] = useState(false);
  /** Mentre è attivo, toccare una casella la promuove invece di aprirla. */
  const [ddMode, setDdMode] = useState(false);

  const board = data as unknown as BoardData | undefined;
  const isDark = useThemeMode() === "dark";
  const rawTheme = board ? themeOf(board.game) : null;
  const theme = rawTheme ? (darkBoardColors(rawTheme, isDark) as typeof rawTheme) : null;
  const selectedTile = board?.tiles.find((t) => t.id === selectedTileId) ?? null;

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["board", gameId] }),
    [queryClient, gameId],
  );

  /*
   * Le Daily Double si scelgono qui e vivono sul gioco, non sulla partita: la
   * sessione nasce solo quando si preme Play, e ogni nuova partita le eredita.
   * Se non ne scegli nessuna, il server ne sorteggia due.
   */
  const dailyDoubles = board ? (themeOf(board.game).dailyDoubleTileIds ?? []) : [];
  const toggleDailyDouble = useCallback(
    async (tileId: string) => {
      if (!board) return;
      const base = themeOf(board.game);
      const current = base.dailyDoubleTileIds ?? [];
      if (!current.includes(tileId) && current.length >= 2) {
        toast.error("Two Daily Doubles at most — remove one first");
        return;
      }
      const next = current.includes(tileId) ? current.filter((id) => id !== tileId) : [...current, tileId];
      // `themeOf(board.game)` e non il tema già adattato al tema scuro:
      // salvare quello inciderebbe i colori notturni nel gioco.
      await updateGame({ data: { gameId, theme: { ...base, dailyDoubleTileIds: next } } });
      await refresh();
    },
    [board, gameId, refresh],
  );

  if (!board || !theme) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-pulse rounded-[28px] bg-lilac" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-56">
      {/* Top bar */}
      <div className="sticky top-0 z-30 px-4 pt-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 rounded-[32px] bg-card/90 px-3 py-3 elev-2 backdrop-blur-md sm:gap-3 sm:rounded-full sm:px-4">
          {/* Neutral lavender chips: navigation + presentation mode, grouped together */}
          <div className="flex items-center gap-1.5">
            <Link
              to="/studio"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-lilac text-foreground transition-transform hover:scale-105"
              aria-label="Back to studio"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <ThemeToggle />
          </div>
          <InlineTitle
            value={board.game.title}
            onSave={async (title) => {
              await updateGame({ data: { gameId, title } });
              void refresh();
            }}
          />
          <div className="ml-auto flex items-center gap-2">
            <JoinCodeBadge joinCode={board.game.join_code} />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setPlayOpen(true)}
              className="flex min-h-12 items-center gap-2 rounded-full bg-coral px-5 font-display text-sm font-black text-foreground elev-2 sm:px-6"
            >
              <Play className="h-4 w-4" /> Play Game
            </motion.button>
            {/* Le impostazioni stanno qui e in nessun altro posto della pagina. */}
            <SettingsButton className="h-12 w-12" />
          </div>
        </div>
      </div>

      {/*
       * Board canvas — themed preview.
       *
       * Quando la scheda di modifica è aperta la board si ritira per farle
       * posto. Prima la scheda ci finiva sopra e copriva l'ultima colonna:
       * stavi scrivendo una domanda senza poter vedere la casella a cui
       * apparteneva. Una scheda che nasconde proprio la cosa che stai
       * modificando non è un pannello affiancato, è un ostacolo.
       */}
      <div
        className={`mx-auto max-w-7xl px-4 pt-6 transition-[padding] duration-300 ease-out ${
          selectedTile ? "min-[1024px]:pr-[27.5rem]" : ""
        }`}
      >
        <div
          className="mx-auto w-full p-2.5 elev-3 transition-[border-radius] duration-300 sm:p-7"
          style={{ backgroundColor: theme.bg, borderRadius: theme.radius + 8 }}
        >
          <div className="grid grid-cols-5 gap-1 sm:gap-3">
            {board.categories.map((cat) => (
              <CategoryHeader key={cat.id} category={cat} theme={theme} onSaved={refresh} />
            ))}
            {[0, 1, 2, 3, 4].map((row) =>
              board.categories.map((cat) => {
                const tile = board.tiles.find((t) => t.category_id === cat.id && t.row_index === row);
                if (!tile) return <div key={`${cat.id}-${row}`} />;
                return (
                  <TileCell
                    key={tile.id}
                    tile={tile}
                    theme={theme}
                    selected={selectedTileId === tile.id}
                    dailyDouble={dailyDoubles.includes(tile.id)}
                    picking={ddMode}
                    onClick={() => (ddMode ? void toggleDailyDouble(tile.id) : setSelectedTileId(tile.id))}
                  />
                );
              }),
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => {
              setDdMode((v) => !v);
              setSelectedTileId(null);
            }}
            aria-pressed={ddMode}
            className={`flex min-h-12 items-center gap-2 rounded-full px-5 text-sm font-bold transition-colors ${
              ddMode ? "bg-butter text-ink-gold elev-1" : "border border-foreground/20 text-foreground hover:bg-foreground/5"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            {ddMode ? "Done picking" : "Pick Daily Doubles"}
            <span className="rounded-full bg-foreground/10 px-2 text-xs tabular-nums">{dailyDoubles.length}/2</span>
          </button>
        </div>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          {ddMode
            ? "Tap tiles to mark them as Daily Doubles. Leave none and the game picks two at random."
            : "Tap any tile to edit its question, answer, media, and formatting."}
        </p>
      </div>

      {/* Tile editor panel */}
      <AnimatePresence>
        {selectedTile && (
          <TileEditor
            key={selectedTile.id}
            tile={selectedTile}
            hostId={board.game.host_id}
            gameId={gameId}
            theme={theme}
            onClose={() => setSelectedTileId(null)}
            onSaved={refresh}
          />
        )}
      </AnimatePresence>

      {/* Theme bar */}
      <ThemeBar
        gameId={gameId}
        theme={theme}
        onSaved={refresh}
      />

      {/* Play dialog */}
      <AnimatePresence>
        {playOpen && <PlayDialog gameId={gameId} joinCode={board.game.join_code} onClose={() => setPlayOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------ Inline title ------------------------------ */

function InlineTitle({ value, onSave }: { value: string; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="max-w-[45vw] truncate rounded-full bg-mint px-4 py-1.5 text-left font-display text-base font-black text-foreground transition-transform hover:scale-[1.02] sm:text-xl"
      >
        {value}
      </button>
    );
  }
  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false);
        if (draft.trim() && draft !== value) void onSave(draft.trim());
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      maxLength={80}
      className="w-[45vw] max-w-xs rounded-full bg-muted px-4 py-1.5 font-display text-base font-black outline-none ring-2 ring-ink-accent sm:text-xl"
    />
  );
}

/* ---------------------------- Join code badge ----------------------------- */

/** Invite-code chip that pops open a small QR/copy panel — not the full "Play Game" flow. */
function JoinCodeBadge({ joinCode }: { joinCode: string }) {
  const origin = useOrigin();
  const joinUrl = origin ? `${origin}/play/${joinCode}` : "";
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={() => {
          sfx.pop();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        /* Lo stesso carattere del codice dentro il pannello che questa pastiglia
           apre: prima erano due — mono qui, display di là — per la stessa cosa. */
        className="hidden h-12 items-center gap-1.5 rounded-full bg-mint px-4 font-display text-sm font-black tracking-[0.15em] text-foreground transition-transform hover:scale-105 sm:flex"
      >
        {joinCode}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </motion.button>
      <AnimatePresence>
        {open && (
          <>
            <button aria-label="Close" onClick={() => setOpen(false)} className="fixed inset-0 z-10 cursor-default" />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -6 }}
              transition={SPRING_SNAP}
              className="absolute right-0 top-12 z-20 w-56 rounded-[26px] bg-popover p-4 text-center elev-3"
            >
              <div className="mx-auto mb-3 w-fit rounded-[20px] bg-card p-2">
                {joinUrl ? <QRCodeSVG value={joinUrl} size={112} /> : <div className="h-28 w-28" />}
              </div>
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(joinCode);
                  toast.success("Join code copied");
                }}
                className="mx-auto flex items-center gap-1.5 font-display text-lg font-black tracking-[0.15em] text-ink-accent"
              >
                {joinCode} <Copy className="h-3.5 w-3.5 opacity-60" />
              </button>
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(joinUrl);
                  toast.success("Join link copied");
                }}
                className="mx-auto mt-3 flex items-center gap-2 rounded-full bg-card px-4 py-2 text-xs font-bold text-foreground elev-1 transition-transform hover:scale-105"
              >
                <Copy className="h-3.5 w-3.5" /> Copy link
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------------------- Category header ---------------------------- */

function CategoryHeader({
  category,
  theme,
  onSaved,
}: {
  category: Category;
  theme: ThemeSettings;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(category.title);
  useEffect(() => setDraft(category.title), [category.title]);

  const commit = async () => {
    setEditing(false);
    if (draft.trim() && draft !== category.title) {
      await updateCategoryTitle({ data: { categoryId: category.id, title: draft.trim() } });
      onSaved();
      toast.success("Saved", { duration: 1200 });
    }
  };

  return (
    <div
      className="flex min-h-12 items-center justify-center overflow-hidden p-1 text-center transition-[border-radius] duration-300 sm:min-h-16 sm:p-2"
      style={{ backgroundColor: theme.card, borderRadius: theme.radius * 0.75 }}
    >
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          maxLength={60}
          className="w-full bg-transparent text-center text-[9px] font-bold uppercase tracking-wide outline-none sm:text-sm"
          style={{ color: theme.accent }}
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="h-full w-full text-[8px] font-bold uppercase leading-tight tracking-wide transition-opacity hover:opacity-70 sm:text-sm"
          style={{ color: theme.accent, ...textScopeCss(theme, "categories", 0.875) }}
          title={category.title}
        >
          <span className="line-clamp-2 w-full break-words">{category.title}</span>
        </button>
      )}
    </div>
  );
}

/* -------------------------------- Tile cell ------------------------------- */

function TileCell({
  tile,
  theme,
  selected,
  dailyDouble,
  picking,
  onClick,
}: {
  tile: Tile;
  theme: ThemeSettings;
  selected: boolean;
  dailyDouble: boolean;
  picking: boolean;
  onClick: () => void;
}) {
  const preview = stripHtml(tile.question);
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      aria-pressed={picking ? dailyDouble : undefined}
      className={`relative flex aspect-square flex-col items-center justify-center gap-0.5 overflow-hidden p-1 text-center transition-all sm:aspect-[4/3] sm:gap-1 sm:p-2 ${
        selected ? "ring-4 ring-ink-accent" : "hover:-translate-y-0.5 hover:brightness-[1.03]"
      } ${dailyDouble ? "ring-4 ring-ink-gold" : ""}`}
      style={{
        backgroundColor: theme.card,
        borderRadius: theme.radius,
        boxShadow: `0 2px 6px -2px color-mix(in srgb, ${theme.accent} 22%, transparent), 0 10px 22px -14px color-mix(in srgb, ${theme.accent} 28%, transparent)`,
      }}
    >
      {dailyDouble && (
        <span
          aria-label="Daily Double"
          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-butter sm:h-6 sm:w-6"
        >
          <Sparkles className="h-3 w-3 text-ink-gold sm:h-3.5 sm:w-3.5" />
        </span>
      )}
      <span
        /* `tracking-tight` come sulla board della console: più il testo cresce,
           più le lettere vanno strette, o si leggono staccate. */
        className="font-display text-sm font-black tracking-tight sm:text-3xl"
        style={{ color: theme.accent, ...textScopeCss(theme, "numbers", 1.875) }}
      >
        {tile.points}
      </span>
      {preview ? (
        <span
          /* Testo piccolo: un filo di spaziatura in più, al contrario dei numeri.
             E opacità 75 invece di 60 — a 60 il contrasto non reggeva sulle
             tinte chiare del tema. */
          className="line-clamp-2 w-full break-words text-[8px] leading-snug tracking-[0.01em] opacity-75 sm:text-xs"
          style={{ color: theme.accent, ...textScopeCss(theme, "questions", 0.75) }}
        >
          {preview}
        </span>
      ) : (
        <span
          className="hidden text-[9px] font-bold uppercase tracking-wider opacity-45 sm:block"
          style={{ color: theme.accent }}
        >
          Empty
        </span>
      )}
      {/* Icone al posto delle emoji: le emoji cambiano faccia da un sistema
          all'altro e non prendono il colore del tema. */}
      {(tile.image_url || tile.audio_url) && (
        <span className="flex items-center gap-1 opacity-70" style={{ color: theme.accent }}>
          {tile.image_url && <ImagePlus className="h-3 w-3" aria-label="Has image" />}
          {tile.audio_url && <Music className="h-3 w-3" aria-label="Has audio" />}
        </span>
      )}
    </motion.button>
  );
}

/* ------------------------------- Tile editor ------------------------------ */

function TileEditor({
  tile,
  hostId,
  gameId,
  theme,
  onClose,
  onSaved,
}: {
  tile: Tile;
  hostId: string;
  gameId: string;
  theme: ThemeSettings;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const [points, setPoints] = useState(tile.points);
  const [answer, setAnswer] = useState(tile.answer);
  const [hint, setHint] = useState(tile.hint ?? "");
  const [focused, setFocused] = useState(false);
  const imageUrl = useSignedUrl("game-media", tile.image_url);
  const audioUrl = useSignedUrl("game-media", tile.audio_url);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== tile.question) {
      editorRef.current.innerHTML = tile.question;
    }
  }, [tile.id, tile.question]);

  interface TilePatch {
    question?: string;
    answer?: string;
    hint?: string | null;
    points?: number;
    image_url?: string | null;
    audio_url?: string | null;
  }
  const save = useCallback(
    async (patch: TilePatch) => {
      await updateTile({ data: { tileId: tile.id, ...patch } });
      onSaved();
    },
    [tile.id, onSaved],
  );

  const saveQuestion = () => {
    const html = editorRef.current?.innerHTML ?? "";
    if (html !== tile.question) {
      void save({ question: html });
      toast.success("Saved", { duration: 1000 });
    }
  };

  const exec = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  };

  const handleUpload = async (file: File, kind: "image" | "audio") => {
    const cap = kind === "image" ? IMAGE_CAP_BYTES : AUDIO_CAP_BYTES;
    if (file.size > cap) {
      toast.error(`${kind === "image" ? "Images" : "Audio"} capped at ${cap / 1024 / 1024}MB`);
      return;
    }
    try {
      const path = await uploadMedia("game-media", hostId, gameId, file);
      await save(kind === "image" ? { image_url: path } : { audio_url: path });
      toast.success(`${kind === "image" ? "Image" : "Audio"} attached`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 80 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 80 }}
      transition={SPRING_UI}
      /*
       * Sotto i 1024px resta un foglio dal basso. Da lì in su diventa un
       * pannello a fianco, perché solo lì c'è posto per la board E per lui:
       * a 700px un pannello da 420 lascerebbe alla board due colonne.
       */
      className="fixed inset-x-2 bottom-[13rem] top-auto z-40 flex max-h-[58svh] w-auto flex-col overflow-hidden rounded-[36px] bg-card elev-3 min-[1024px]:inset-x-auto min-[1024px]:bottom-40 min-[1024px]:right-4 min-[1024px]:top-24 min-[1024px]:max-h-none min-[1024px]:w-[min(420px,calc(100vw-2rem))]"
    >
      <div className="flex items-center justify-between gap-2 bg-lilac px-5 py-3 sm:px-6 sm:py-4">
        <span className="truncate font-display text-sm font-black uppercase tracking-wide">Edit tile</span>
        <button onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground hover:text-foreground" aria-label="Close editor">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <label className="block">
          <span className={FIELD_LABEL}>Points</span>
          <input
            type="number"
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            onBlur={() => points !== tile.points && void save({ points })}
            className="h-12 w-28 rounded-full bg-muted px-4 font-display text-sm font-black tabular-nums outline-none ring-2 ring-transparent focus:ring-ink-accent"
          />
        </label>

        <div>
          <span className={FIELD_LABEL}>Question</span>
          <AnimatePresence>
            {focused && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="mb-2 flex flex-wrap items-center gap-1 rounded-full bg-lilac p-2 elev-1"
              >
                <FmtBtn onClick={() => exec("bold")} label="Bold"><Bold className="h-4 w-4" /></FmtBtn>
                <FmtBtn onClick={() => exec("italic")} label="Italic"><Italic className="h-4 w-4" /></FmtBtn>
                <FmtBtn onClick={() => exec("underline")} label="Underline"><Underline className="h-4 w-4" /></FmtBtn>
                <select
                  onChange={(e) => exec("fontSize", e.target.value)}
                  defaultValue="3"
                  className="h-11 rounded-full bg-card px-3 text-xs font-semibold text-foreground outline-none"
                  aria-label="Font size"
                >
                  <option value="2">Small</option>
                  <option value="3">Normal</option>
                  <option value="5">Large</option>
                  <option value="7">Huge</option>
                </select>
                <label className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-foreground hover:bg-card" aria-label="Text color">
                  <Palette className="h-4 w-4" />
                  <input type="color" className="sr-only" onChange={(e) => exec("foreColor", e.target.value)} />
                </label>
                <FmtBtn onClick={() => exec("removeFormat")} label="Clear formatting">
                  <X className="h-4 w-4" />
                </FmtBtn>
              </motion.div>
            )}
          </AnimatePresence>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              saveQuestion();
            }}
            className="min-h-24 rounded-[26px] bg-muted p-4 text-sm outline-none ring-2 ring-transparent focus:ring-ink-accent"
          />
        </div>

        <label className="block">
          <span className={FIELD_LABEL}>Answer</span>
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onBlur={() => answer !== tile.answer && void save({ answer })}
            placeholder="What is…?"
            className="h-12 w-full rounded-full bg-muted px-4 text-sm outline-none ring-2 ring-transparent focus:ring-ink-accent"
          />
        </label>

        <label className="block">
          <span className={FIELD_LABEL}>Hint · host only</span>
          <input
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            onBlur={() => hint !== (tile.hint ?? "") && void save({ hint: hint || null })}
            className="h-12 w-full rounded-full bg-muted px-4 text-sm outline-none ring-2 ring-transparent focus:ring-ink-accent"
          />
        </label>

        <div>
          <span className={FIELD_LABEL}>Media</span>
          <div className="flex gap-2">
            <button
              onClick={() => imageRef.current?.click()}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-sky text-xs font-bold text-foreground elev-1"
            >
              <ImagePlus className="h-4 w-4" /> Image
            </button>
            <button
              onClick={() => audioRef.current?.click()}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-peach text-xs font-bold text-foreground elev-1"
            >
              <Music className="h-4 w-4" /> Audio
            </button>
            <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f, "image"); e.target.value = ""; }} />
            <input ref={audioRef} type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f, "audio"); e.target.value = ""; }} />
          </div>
          {imageUrl && (
            <div className="relative mt-2">
              <img src={imageUrl} alt="Tile media" className="max-h-32 w-full rounded-[26px] object-cover" />
              <button
                onClick={() => void save({ image_url: null })}
                className="absolute right-2 top-2 rounded-full bg-card p-1.5 text-foreground elev-1"
                aria-label="Remove image"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          {audioUrl && (
            <div className="mt-2 flex items-center gap-2">
              <audio controls src={audioUrl} className="h-8 w-full" />
              <button onClick={() => void save({ audio_url: null })} className="rounded-full bg-muted p-1.5" aria-label="Remove audio">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground">Images ≤ 5MB · Audio ≤ 10MB · stored privately</p>
        </div>
      </div>
    </motion.div>
  );
}

function FmtBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-card"
      aria-label={label}
    >
      {children}
    </button>
  );
}

/* -------------------------------- Theme bar ------------------------------- */

function ThemeBar({ gameId, theme, onSaved }: { gameId: string; theme: ThemeSettings; onSaved: () => void }) {
  const queryClient = useQueryClient();
  const [rowPoints, setRowPointsState] = useState(theme.rowPoints);
  const [radiusEditing, setRadiusEditing] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => setRowPointsState(theme.rowPoints), [theme.rowPoints]);

  /** Optimistically patch the cached theme so the board reacts instantly. */
  const patchThemeCache = useCallback(
    (patch: Partial<ThemeSettings>) => {
      queryClient.setQueryData(["board", gameId], (old: unknown) => {
        const b = old as BoardData | undefined;
        if (!b) return old;
        return { ...b, game: { ...b.game, theme: { ...themeOf(b.game), ...patch } } };
      });
    },
    [queryClient, gameId],
  );

  const saveTheme = useCallback(
    async (patch: Partial<ThemeSettings>) => {
      await updateGame({ data: { gameId, theme: { ...theme, ...patch } } });
      onSaved();
    },
    [gameId, theme, onSaved],
  );

  const applyPreset = async (preset: (typeof THEME_PRESETS)[number]) => {
    patchThemeCache(preset.theme);
    await saveTheme(preset.theme);
    toast.success(`Theme: ${preset.name}`, { duration: 1200 });
  };

  /** Instant local feedback + debounced save while dragging. */
  const applyRadius = (radius: number) => {
    patchThemeCache({ radius });
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void saveTheme({ radius }), 400);
  };

  const [scope, setScope] = useState<TextScope | "all">("numbers");
  const current: TextStyle = (scope === "all" ? theme.textStyles?.numbers : theme.textStyles?.[scope]) ?? {};

  /** Write a typography patch into the theme JSON for the selected scope(s). */
  const applyTextStyle = async (patch: TextStyle) => {
    const scopes: TextScope[] = scope === "all" ? ["numbers", "questions", "categories"] : [scope];
    const next = { ...(theme.textStyles ?? {}) };
    for (const sc of scopes) next[sc] = { ...(next[sc] ?? {}), ...patch };
    patchThemeCache({ textStyles: next });
    await saveTheme({ textStyles: next });
  };

  const applyTeamName = async (key: "teamAlpha" | "teamBravo", value: string) => {
    const patch = { [key]: value.trim() };
    patchThemeCache(patch);
    await saveTheme(patch);
    toast.success("Team name saved", { duration: 1000 });
  };

  const applyRowPoints = async () => {
    await setRowPoints({ data: { gameId, rowPoints } });
    onSaved();
    toast.success("Point ladder saved", { duration: 1200 });
  };

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ ...SPRING_UI, delay: 0.2 }}
      className="fixed bottom-3 left-1/2 z-30 max-h-[44svh] w-[min(1100px,calc(100vw-1rem))] -translate-x-1/2 overflow-y-auto overscroll-contain rounded-[36px] bg-card/95 px-5 py-4 text-foreground elev-3 backdrop-blur-md sm:bottom-5 sm:px-7 sm:py-5"
    >
      {/*
       * Tre gruppi dichiarati, non una fila indistinta di comandi.
       *
       * Prima erano otto controlli di quattro argomenti diversi separati da
       * filetti sottili: colori, forma, testo, squadre e punteggi tutti sulla
       * stessa riga. Un filetto dice "qui cambia qualcosa" ma non dice cosa.
       * Con una didascalia sopra ogni gruppo, la vicinanza fra i comandi
       * significa qualcosa e l'occhio trova subito la sezione che cerca.
       */}
      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
        <DockGroup label="Appearance">
          <div className="flex items-center gap-2">
            {THEME_PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => void applyPreset(p)}
                title={p.name}
                aria-label={`Apply theme ${p.name}`}
                className="h-12 w-12 transition-transform hover:scale-110 scallop"
                style={{ background: `linear-gradient(135deg, ${p.theme.bg} 40%, ${p.theme.accent})` }}
              />
            ))}
          </div>

          <label className="flex h-12 items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Roundness
            <input
              type="range"
              min={0}
              max={50}
              value={theme.radius}
              onChange={(e) => applyRadius(Number(e.target.value))}
              className="w-24 accent-[var(--ink-accent)]"
            />
            {radiusEditing ? (
              <input
                autoFocus
                type="number"
                min={0}
                max={50}
                value={theme.radius}
                onChange={(e) => applyRadius(Math.max(0, Math.min(50, Number(e.target.value))))}
                onBlur={() => setRadiusEditing(false)}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                className="h-12 w-14 rounded-full bg-muted px-1 text-center font-display text-xs font-black tabular-nums text-foreground outline-none ring-2 ring-ink-accent"
              />
            ) : (
              <button
                onClick={() => setRadiusEditing(true)}
                title="Click to type a value"
                className="flex h-12 w-12 items-center justify-center rounded-full text-center font-display font-black tabular-nums text-foreground hover:bg-muted"
              >
                {theme.radius}
              </button>
            )}
          </label>
        </DockGroup>

        <DockGroup label="Text">
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as TextScope | "all")}
            aria-label="Text target"
            className="h-12 rounded-full bg-muted px-4 text-xs font-bold text-foreground outline-none"
          >
            <option value="numbers">Numbers</option>
            <option value="questions">Questions</option>
            <option value="categories">Categories</option>
            <option value="all">All text</option>
          </select>
          <select
            value={current.font ?? ""}
            onChange={(e) => void applyTextStyle({ font: e.target.value })}
            aria-label="Font"
            title="Font"
            className="h-12 rounded-full bg-muted px-4 font-display text-xs font-semibold text-foreground outline-none"
          >
            {BOARD_FONTS.map((f) => (
              <option key={f.label} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <div className="flex h-12 items-center gap-2 rounded-full bg-muted px-4">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Type className="h-3.5 w-3.5" /> Size
            </span>
            <input
              type="range"
              min={0.6}
              max={1.8}
              step={0.1}
              value={current.size ?? 1}
              onChange={(e) => void applyTextStyle({ size: Number(e.target.value) })}
              aria-label="Text size"
              className="w-20 accent-[var(--ink-accent)]"
            />
            {/* Il cursore da solo non dice mai dove sei: il numero sì. */}
            <span className="w-8 shrink-0 text-right font-display text-xs font-black tabular-nums text-foreground">
              {(current.size ?? 1).toFixed(1)}×
            </span>
          </div>
          {([
            ["bold", "B", "font-black"],
            ["italic", "I", "italic"],
            ["underline", "U", "underline"],
          ] as const).map(([key, label, cls]) => (
            <button
              key={key}
              onClick={() => void applyTextStyle({ [key]: !current[key] } as TextStyle)}
              aria-pressed={Boolean(current[key])}
              aria-label={key}
              className={`h-12 w-12 rounded-full text-sm ${cls} ${
                current[key] ? "bg-ink-accent text-card" : "bg-muted text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </DockGroup>

        <DockGroup label="Game">
          <div className="flex h-12 items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Teams</span>
            <TeamNameInput
              defaultValue={theme.teamAlpha ?? ""}
              placeholder="Alpha"
              swatch="bg-team-alpha"
              onSave={(v) => void applyTeamName("teamAlpha", v)}
            />
            <TeamNameInput
              defaultValue={theme.teamBravo ?? ""}
              placeholder="Bravo"
              swatch="bg-team-bravo"
              onSave={(v) => void applyTeamName("teamBravo", v)}
            />
          </div>

          <div className="flex h-12 items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Points</span>
            {rowPoints.map((p, i) => (
              <input
                key={i}
                type="number"
                value={p}
                onChange={(e) => {
                  const next = [...rowPoints];
                  next[i] = Number(e.target.value);
                  setRowPointsState(next);
                }}
                onBlur={() => void applyRowPoints()}
                className="h-12 w-16 rounded-full bg-muted px-2 text-center font-display text-xs font-black tabular-nums outline-none ring-2 ring-transparent focus:ring-ink-accent"
              />
            ))}
          </div>
        </DockGroup>
      </div>
    </motion.div>
  );
}

/**
 * Una didascalia e i comandi che le appartengono.
 *
 * Il registro tipografico è quello della console: maiuscoletto piccolo, molto
 * spaziato, in colore attenuato. Le due pagine adesso dicono "questa è
 * un'etichetta" nello stesso modo.
 */
function DockGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function TeamNameInput({
  defaultValue,
  placeholder,
  swatch,
  onSave,
}: {
  defaultValue: string;
  placeholder: string;
  swatch: string;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  useEffect(() => setValue(defaultValue), [defaultValue]);
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-4 w-4 ${swatch} scallop`} />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => value.trim() !== defaultValue && onSave(value)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        placeholder={placeholder}
        maxLength={24}
        className="h-12 w-24 rounded-full bg-muted px-3 text-xs font-bold outline-none ring-2 ring-transparent focus:ring-ink-accent"
      />
    </div>
  );
}

/* ------------------------------- Play dialog ------------------------------ */

function PlayDialog({ gameId, joinCode, onClose }: { gameId: string; joinCode: string; onClose: () => void }) {
  const navigate = useNavigate();
  const start = useServerFn(startSession);
  const [nonce] = useState(() => Date.now());
  const { data, isLoading, isError } = useQuery({
    queryKey: ["session-start", gameId, nonce],
    queryFn: () => start({ data: { gameId } }),
    staleTime: 0,
    gcTime: 0,
  });

  const joinUrl = `${window.location.origin}/play/${joinCode}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={SPRING_UI}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[36px] bg-card p-8 text-center elev-3"
      >
        <h2 className="font-display text-2xl font-black">Players join with this code</h2>
        <p className="mt-1 text-sm text-muted-foreground">Open on any phone — no app needed</p>

        <div className="my-5 font-display text-5xl font-black tracking-[0.25em] text-ink-accent">{joinCode}</div>

        <div className="mx-auto mb-5 w-fit rounded-[28px] bg-muted p-4">
          <QRCodeSVG value={joinUrl} size={160} />
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(joinUrl);
              toast.success("Join link copied");
            }}
            className="flex items-center justify-center gap-2 rounded-full bg-lilac py-3.5 text-sm font-bold text-foreground elev-1"
          >
            <Copy className="h-4 w-4" /> Copy join link
          </button>
          <button
            disabled={isLoading || isError}
            onClick={() => {
              if (data) void navigate({ to: "/host/$sessionId", params: { sessionId: data.session.id } });
            }}
            className="flex items-center justify-center gap-2 rounded-full bg-coral py-3.5 font-display text-sm font-black text-foreground elev-2 disabled:opacity-50"
          >
            <ExternalLink className="h-4 w-4" />
            {isLoading ? "Preparing session…" : "Open Host Console"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
