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
  Type,
  Sparkles,
  QrCode,
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
  boardTextCss,
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
import { useThemeMode } from "@/components/ThemeToggle";
import { SettingsDialog } from "@/components/SettingsDialog";
import { AccountMenu } from "@/components/AccountMenu";
import { darkBoardColors } from "@/lib/theme-mode";
import { useOrigin } from "@/hooks/use-origin";
import { sfx } from "@/lib/sfx";
import { SPRING_UI } from "@/lib/motion";

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
/** Etichetta di riga, in linea con i comandi invece che sopra. */
const ROW_LABEL = "shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground";

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
  const [joinOpen, setJoinOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-pulse rounded-[28px] bg-lilac" />
      </div>
    );
  }

  return (
    /*
     * Una schermata sola, alta quanto la finestra e senza scorrimento: a
     * scorrere è semmai una colonna, mai la pagina. Le tre regioni sono le
     * stesse della console — strumenti a sinistra, la tela in mezzo, e a
     * destra quello che riguarda la cosa selezionata.
     */
    <div data-editor className="flex min-h-screen flex-col text-foreground min-[1100px]:h-screen min-[1100px]:overflow-hidden">
      {/*
       * BARRA — scura e a filo, come Studio e la console, invece della pillola
       * chiara che galleggiava. L'interruttore giorno/notte non è più qui: era
       * in due posti, e il secondo è il menu del profilo, dove stanno anche il
       * codice invito e le impostazioni.
       */}
      <header className="z-50 shrink-0 border-b border-foreground/10 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
          <Link
            to="/studio"
            className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-foreground/20 px-4 text-sm font-bold transition-colors hover:bg-foreground/5"
            aria-label="Back to studio"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Studio</span>
          </Link>

          <InlineTitle
            value={board.game.title}
            onSave={async (title) => {
              await updateGame({ data: { gameId, title } });
              void refresh();
            }}
          />

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setPlayOpen(true)}
              className="flex h-11 items-center gap-2 rounded-full bg-coral px-5 font-display text-sm font-black text-foreground elev-2"
            >
              <Play className="h-4 w-4" /> <span className="hidden sm:inline">Play Game</span>
            </motion.button>
            <AccountMenu
              displayName={board.profile?.username ?? "Host"}
              avatarUrl={board.profile?.avatar_url ?? null}
              onOpenSettings={() => setSettingsOpen(true)}
              items={[{ icon: QrCode, label: "Join code & QR", onSelect: () => setJoinOpen(true) }]}
            />
          </div>
        </div>
      </header>

      {/*
       * CORPO — strumenti · tela · ispettore.
       *
       * La tela sta ferma. Prima la board scivolava di lato all'apertura della
       * scheda: un movimento che si nota, e che sposta proprio la cosa che stai
       * guardando. Qui la colonna di destra c'è sempre, come il pannello del
       * buzzer sulla console: cambia il contenuto, non l'impaginazione.
       */}
      <div className="grid grid-cols-1 gap-3 p-4 min-[1100px]:min-h-0 min-[1100px]:flex-1 min-[1100px]:grid-cols-[19rem_minmax(0,1fr)_22rem] min-[1100px]:gap-4 min-[1100px]:overflow-hidden min-[1100px]:p-5">
        <aside className="flex flex-col gap-3 min-[1100px]:min-h-0 min-[1100px]:overflow-y-auto min-[1100px]:pr-1">
          <DailyDoublePanel
            count={dailyDoubles.length}
            picking={ddMode}
            onToggle={() => {
              setDdMode((v) => !v);
              setSelectedTileId(null);
            }}
          />
          <ThemeBar gameId={gameId} theme={theme} onSaved={refresh} />
        </aside>

        {/*
         * LA TELA. Il riquadro esterno è il contenitore misurato; quello dentro
         * prende il lato più stretto fra larghezza e altezza e si centra, così
         * la board entra sempre intera senza che nessuno debba scorrere.
         */}
        <main /*
         * `container-type: size` pretende una dimensione definita su tutti e due
         * gli assi. In colonna singola la riga si misura sul contenuto, quindi
         * l'altezza è indefinita e il contenitore collassa a zero — la board
         * spariva. Sotto i 1100px gliela do io con la proporzione della board;
         * sopra, la cella della griglia è già alta quanto deve.
         */
        className="relative order-first aspect-[5/5.4] w-full min-w-0 [container-type:size] min-[1100px]:order-none min-[1100px]:aspect-auto min-[1100px]:h-full min-[1100px]:w-auto min-[1100px]:min-h-0">
          <div
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden p-[2.2cqmin] elev-3 [container-type:size]"
            style={{
              width: `min(100cqw, calc(100cqh * ${5 / 5.4}))`,
              height: `min(100cqh, calc(100cqw * ${5.4 / 5}))`,
              backgroundColor: theme.bg,
              borderRadius: theme.radius + 8,
            }}
          >
            <div className="grid h-full w-full grid-cols-5 grid-rows-[auto_repeat(5,1fr)] gap-[1.2cqmin]">
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
                      onClick={() =>
                        ddMode ? void toggleDailyDouble(tile.id) : setSelectedTileId(tile.id)
                      }
                    />
                  );
                }),
              )}
            </div>
          </div>
        </main>

        <aside className="flex flex-col min-[1100px]:min-h-0 min-[1100px]:overflow-hidden">
          {selectedTile ? (
            <TileEditor
              key={selectedTile.id}
              tile={selectedTile}
              hostId={board.game.host_id}
              gameId={gameId}
              theme={theme}
              onClose={() => setSelectedTileId(null)}
              onSaved={refresh}
            />
          ) : (
            <Panel fill title={ddMode ? "Daily Doubles" : "No tile selected"} className="justify-center text-center">
              <p className="text-sm text-muted-foreground">
                {ddMode
                  ? "Tap tiles on the board to mark them. Leave none and the game picks two at random."
                  : "Tap any tile to edit its question, answer, media and formatting."}
              </p>
            </Panel>
          )}
        </aside>
      </div>

      <AnimatePresence>
        {playOpen && (
          <PlayDialog gameId={gameId} joinCode={board.game.join_code} onClose={() => setPlayOpen(false)} />
        )}
        {joinOpen && <JoinDialog joinCode={board.game.join_code} onClose={() => setJoinOpen(false)} />}
      </AnimatePresence>
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

/* --------------------------------- Panel --------------------------------- */

/**
 * La scheda dell'editor: stessa forma, stesso titolo e stessa elevazione delle
 * schede della console. Era l'unica cosa che le due pagine non condividevano.
 */
function Panel({
  title,
  action,
  fill = false,
  className = "",
  children,
}: {
  title: string;
  action?: React.ReactNode;
  /** Occupa l'altezza che avanza invece di misurare sul contenuto. */
  fill?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    /*
     * `shrink-0` di norma. Dentro una colonna che scorre, una scheda flessibile
     * si lascia rimpicciolire sotto il proprio contenuto per far stare tutto
     * nello spazio disponibile: a finestra bassa le schede si accavallavano e
     * la riga della rotondità finiva sotto quella del testo.
     */
    <div
      className={`flex flex-col rounded-[32px] bg-card p-4 elev-2 ${
        fill ? "min-h-0 flex-1" : "shrink-0"
      } ${className}`}
    >
      <div className="mb-2.5 flex shrink-0 items-center justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ----------------------------- Daily Doubles ------------------------------ */

function DailyDoublePanel({
  count,
  picking,
  onToggle,
}: {
  count: number;
  picking: boolean;
  onToggle: () => void;
}) {
  return (
    <Panel
      title="Daily Doubles"
      action={
        <span className="shrink-0 rounded-full bg-foreground/10 px-2.5 py-1 font-display text-xs font-black tabular-nums">
          {count}/2
        </span>
      }
    >
      <button
        onClick={onToggle}
        aria-pressed={picking}
        className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-bold transition-colors ${
          picking
            ? "bg-butter text-ink-gold elev-1"
            : "border border-foreground/20 text-foreground hover:bg-foreground/5"
        }`}
      >
        <Sparkles className="h-4 w-4" />
        {picking ? "Done picking" : "Pick on the board"}
      </button>
    </Panel>
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

/* ------------------------------ Join dialog ------------------------------- */

/**
 * Codice invito, QR e link. Sta nel menu del profilo e non più come pastiglia
 * verde in barra: lì occupava il posto più in vista della pagina per una cosa
 * che serve una volta sola, quando inviti i giocatori.
 */
function JoinDialog({ joinCode, onClose }: { joinCode: string; onClose: () => void }) {
  const origin = useOrigin();
  const joinUrl = origin ? `${origin}/play/${joinCode}` : "";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={SPRING_UI}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[32px] bg-card p-6 text-center elev-3"
      >
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">Join code &amp; QR</h3>
        <div className="mx-auto mb-4 w-fit rounded-[20px] bg-muted p-3 text-foreground">
          {joinUrl ? (
            <QRCodeSVG value={joinUrl} size={148} bgColor="transparent" fgColor="currentColor" />
          ) : (
            <div className="h-[148px] w-[148px]" />
          )}
        </div>
        <button
          onClick={() => {
            void navigator.clipboard.writeText(joinCode);
            toast.success("Join code copied");
          }}
          className="mx-auto flex items-center gap-2 font-display text-2xl font-black tracking-[0.15em] text-ink-accent"
        >
          {joinCode} <Copy className="h-4 w-4 opacity-60" />
        </button>
        <button
          onClick={() => {
            void navigator.clipboard.writeText(joinUrl);
            toast.success("Join link copied");
          }}
          className="mx-auto mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-muted px-4 text-sm font-bold text-foreground elev-1"
        >
          <Copy className="h-4 w-4" /> Copy link
        </button>
      </motion.div>
    </motion.div>
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
      className="flex min-h-0 items-center justify-center overflow-hidden p-[0.8cqmin] text-center transition-[border-radius] duration-300"
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
          className="w-full bg-transparent text-center font-bold uppercase tracking-wide outline-none"
          style={{ color: theme.accent, ...boardTextCss(theme, "categories", null, 1.6) }}
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="h-full w-full font-bold uppercase leading-tight tracking-wide transition-opacity hover:opacity-70"
          style={{ color: theme.accent, ...boardTextCss(theme, "categories", null, 1.6) }}
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
      /* Riempie la sua cella: l'altezza la decide la griglia, che a sua volta
         entra sempre intera nella finestra. Niente aspetto fisso, o la board
         tornerebbe a essere più alta dello schermo. */
      className={`relative flex h-full w-full flex-col items-center justify-center gap-[0.6cqmin] overflow-hidden p-[1cqmin] text-center transition-all ${
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
          className="absolute right-[1cqmin] top-[1cqmin] flex h-[3.2cqmin] w-[3.2cqmin] items-center justify-center rounded-full bg-butter"
        >
          <Sparkles className="h-[2cqmin] w-[2cqmin] text-ink-gold" />
        </span>
      )}
      <span
        /* `tracking-tight` come sulla board della console: più il testo cresce,
           più le lettere vanno strette, o si leggono staccate. */
        className="font-display font-black leading-none tracking-tight"
        style={{ color: theme.accent, ...boardTextCss(theme, "numbers", null, 3.6) }}
      >
        {tile.points}
      </span>
      {preview ? (
        <span
          /* Testo piccolo: un filo di spaziatura in più, al contrario dei numeri.
             E opacità 75 invece di 60 — a 60 il contrasto non reggeva sulle
             tinte chiare del tema. */
          className="line-clamp-2 w-full break-words leading-snug tracking-[0.01em] opacity-75"
          style={{ color: theme.accent, ...boardTextCss(theme, "questions", null, 1.45) }}
        >
          {preview}
        </span>
      ) : (
        <span
          className="font-bold uppercase tracking-wider opacity-45"
          style={{ color: theme.accent, ...boardTextCss(theme, "questions", null, 1.3) }}
        >
          Empty
        </span>
      )}
      {/* Icone al posto delle emoji: le emoji cambiano faccia da un sistema
          all'altro e non prendono il colore del tema. */}
      {(tile.image_url || tile.audio_url) && (
        <span className="flex items-center gap-[0.6cqmin] opacity-70" style={{ color: theme.accent }}>
          {tile.image_url && <ImagePlus className="h-[1.8cqmin] w-[1.8cqmin]" aria-label="Has image" />}
          {tile.audio_url && <Music className="h-[1.8cqmin] w-[1.8cqmin]" aria-label="Has audio" />}
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
    /*
     * Una scheda della colonna, non più un pannello che galleggiava sopra la
     * board con una fascia lilla in testa. La fascia colorata era l'unico
     * elemento del genere in tutta l'applicazione: la console non ne ha, Studio
     * nemmeno. Qui il titolo è un titolo, come nelle altre schede.
     *
     * Entra con una dissolvenza minima. Prima arrivava scivolando da destra di
     * 80 pixel mentre la board si spostava di lato per farle largo: due
     * movimenti insieme per un clic su una casella, che è la cosa che si fa
     * cento volte di fila mentre si scrive un gioco.
     */
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING_UI}
      className="flex min-h-0 flex-1 flex-col rounded-[32px] bg-card p-4 elev-2"
    >
      <div className="mb-2.5 flex shrink-0 items-center justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-muted-foreground">
          Edit tile · <span className="font-display font-black tabular-nums text-foreground">{tile.points}</span>
        </h3>
        <button
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
          aria-label="Close editor"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
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
    /*
     * Tre schede impilate nella colonna degli strumenti, non più una barra
     * galleggiante in fondo allo schermo.
     *
     * La barra era otto controlli di quattro argomenti diversi su una riga
     * sola, appoggiata sopra la board e con uno scorrimento interno suo: non
     * somigliava a niente altro nell'applicazione. Queste sono le stesse schede
     * della console — stessa forma, stesso titolo, stessa elevazione.
     */
    <>
      <Panel title="Appearance">
        <div className="flex flex-wrap items-center gap-2">
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

        <label className="mt-3 flex h-12 items-center gap-3">
          <span className={ROW_LABEL}>Roundness</span>
          <input
            type="range"
            min={0}
            max={50}
            value={theme.radius}
            onChange={(e) => applyRadius(Number(e.target.value))}
            className="min-w-0 flex-1 accent-[var(--ink-accent)]"
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
              className="h-12 w-14 shrink-0 rounded-full bg-muted px-1 text-center font-display text-xs font-black tabular-nums text-foreground outline-none ring-2 ring-ink-accent"
            />
          ) : (
            <button
              onClick={() => setRadiusEditing(true)}
              title="Click to type a value"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display font-black tabular-nums text-foreground hover:bg-muted"
            >
              {theme.radius}
            </button>
          )}
        </label>
      </Panel>

      <Panel title="Text">
        {/* Prima riga: a CHE COSA si applica, e con quale carattere. */}
        <div className="flex gap-2">
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as TextScope | "all")}
            aria-label="Text target"
            className="h-12 min-w-0 flex-1 rounded-full bg-muted px-4 text-xs font-bold text-foreground outline-none"
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
            className="h-12 min-w-0 flex-1 rounded-full bg-muted px-4 font-display text-xs font-semibold text-foreground outline-none"
          >
            {BOARD_FONTS.map((f) => (
              <option key={f.label} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-2 flex h-12 items-center gap-3 rounded-full bg-muted px-4">
          <span className={`${ROW_LABEL} flex items-center gap-1`}>
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
            className="min-w-0 flex-1 accent-[var(--ink-accent)]"
          />
          {/* Il cursore da solo non dice mai dove sei: il numero sì. */}
          <span className="w-8 shrink-0 text-right font-display text-xs font-black tabular-nums text-foreground">
            {(current.size ?? 1).toFixed(1)}×
          </span>
        </div>

        <div className="mt-2 flex gap-2">
          {(
            [
              ["bold", "B", "font-black"],
              ["italic", "I", "italic"],
              ["underline", "U", "underline"],
            ] as const
          ).map(([key, label, cls]) => (
            <button
              key={key}
              onClick={() => void applyTextStyle({ [key]: !current[key] } as TextStyle)}
              aria-pressed={Boolean(current[key])}
              aria-label={key}
              className={`h-12 flex-1 rounded-full text-sm ${cls} ${
                current[key] ? "bg-ink-accent text-card" : "bg-muted text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Game">
        <span className={`${ROW_LABEL} mb-2 block`}>Teams</span>
        <div className="flex flex-col gap-2">
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

        <span className={`${ROW_LABEL} mb-2 mt-3 block`}>Points ladder</span>
        <div className="flex flex-wrap gap-2">
          {rowPoints.map((p, i) => (
            <input
              key={i}
              type="number"
              value={p}
              aria-label={`Row ${i + 1} points`}
              onChange={(e) => {
                const next = [...rowPoints];
                next[i] = Number(e.target.value);
                setRowPointsState(next);
              }}
              onBlur={() => void applyRowPoints()}
              className="h-12 w-[calc(33.333%-0.34rem)] rounded-full bg-muted px-2 text-center font-display text-xs font-black tabular-nums outline-none ring-2 ring-transparent focus:ring-ink-accent"
            />
          ))}
        </div>
      </Panel>
    </>
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
