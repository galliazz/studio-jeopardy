import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Play,
  Palette,
  ImagePlus,
  Music,
  X,
  Copy,
  ExternalLink,
  Type,
  Sparkles,
  Trash2,
  Minus,
  Plus,
  ChevronDown,
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
  FONT_WEIGHTS,
  type BoardData,
  type Category,
  type Tile,
  type ThemeSettings,
  type TextScope,
  type TextStyle,
  teamColorVars,
} from "@/lib/types";
import { stripHtml } from "@/lib/sanitize";
import { uploadMedia, useSignedUrl, IMAGE_CAP_BYTES, AUDIO_CAP_BYTES } from "@/lib/media";
import { useThemeMode } from "@/components/ThemeToggle";
import { SettingsDialog } from "@/components/SettingsDialog";
import { AccountMenu } from "@/components/AccountMenu";
import { APP_BAR, APP_BAR_INNER } from "@/components/app-bar";
import { darkBoardColors } from "@/lib/theme-mode";
import { useOrigin } from "@/hooks/use-origin";
import { sfx } from "@/lib/sfx";
import { SPRING_UI } from "@/lib/motion";

export const Route = createFileRoute("/_authenticated/edit/$gameId")({
  head: () => ({
    meta: [
      { title: "Board Editor — JEOPARDESTINY" },
      {
        name: "description",
        content: "Design your trivia board: questions, answers, media, and theme.",
      },
      { property: "og:title", content: "Board Editor — JEOPARDESTINY" },
      {
        property: "og:description",
        content: "Design your trivia board: questions, answers, media, and theme.",
      },
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

/** Larghezza della board diviso la sua altezza: 5 colonne su 5.4 di altezza. */
const BOARD_RATIO = 5 / 5.4;

const FIELD_LABEL =
  "mb-1.5 block text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground";

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
      const next = current.includes(tileId)
        ? current.filter((id) => id !== tileId)
        : [...current, tileId];
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
    <div
      data-editor
      style={teamColorVars(theme)}
      className="flex min-h-screen flex-col text-foreground min-[1100px]:h-screen min-[1100px]:overflow-hidden"
    >
      {/*
       * BARRA — scura e a filo, come Studio e la console, invece della pillola
       * chiara che galleggiava. L'interruttore giorno/notte non è più qui: era
       * in due posti, e il secondo è il menu del profilo, dove stanno anche il
       * codice invito e le impostazioni.
       */}
      <header className={APP_BAR}>
        {/*
         * Tre colonne, non una fila: le due laterali hanno lo stesso peso, così
         * il titolo cade sulla mezzeria della finestra — che è anche quella
         * della board, visto che le colonne sotto sono larghe uguali. Con
         * `flex` e `ml-auto` il titolo stava a sinistra e in mezzo restava
         * mezzo schermo di niente.
         */}
        <div className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] ${APP_BAR_INNER}`}>
          <div className="flex min-w-0 items-center">
            <Link
              to="/studio"
              className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-foreground/20 px-4 text-sm font-bold transition-colors hover:bg-foreground/5"
              aria-label="Back to studio"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Studio</span>
            </Link>
          </div>

          <InlineTitle
            value={board.game.title}
            onSave={async (title) => {
              await updateGame({ data: { gameId, title } });
              void refresh();
            }}
          />

          <div className="flex shrink-0 items-center justify-end gap-2">
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
       * Stessa costruzione della console, perché le proporzioni devono essere
       * quelle: `--board-side` è il lato della board e lo conoscono anche le
       * colonne, così sanno dove comincia e ci si allineano in cima invece di
       * galleggiare a mezza altezza. `--board-offset` è l'aria sopra di lei.
       * Le due colonne hanno lo STESSO tetto di larghezza, quindi la board
       * cade sulla mezzeria esatta della composizione.
       */}
      <div className="min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 [container-type:size] sm:px-6 min-[1100px]:overflow-y-hidden min-[1100px]:py-6">
        <div
          style={
            {
              "--board-side": `min(100cqh, max(16rem, calc((100cqw - var(--board-reserve)) / ${BOARD_RATIO})))`,
            } as CSSProperties
          }
          className="grid h-full grid-cols-1 gap-4 [--board-offset:0px] [--board-reserve:0px] min-[1100px]:min-h-0 min-[1100px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] min-[1100px]:[--board-offset:calc((100cqh_-_var(--board-side))/2)] min-[1100px]:[--board-reserve:46rem]"
        >
          <aside className="order-2 flex flex-col gap-3 min-[1100px]:order-1 min-[1100px]:mt-[var(--board-offset)] min-[1100px]:max-h-[var(--board-side)] min-[1100px]:w-full min-[1100px]:min-h-0 min-[1100px]:max-w-[22rem] min-[1100px]:justify-self-end min-[1100px]:self-start min-[1100px]:overflow-y-auto min-[1100px]:pr-1">
            {/* Ordine chiesto: il testo è quello che si tocca di più mentre si
                scrive un gioco, le Daily Double una volta sola alla fine. */}
            <ThemeBar gameId={gameId} theme={theme} onSaved={refresh} />
            <DailyDoublePanel
              count={dailyDoubles.length}
              picking={ddMode}
              onToggle={() => {
                setDdMode((v) => !v);
                setSelectedTileId(null);
              }}
            />
          </aside>

          <main
            /* Il lato lo decide `--board-side`, lo stesso che conoscono le
               colonne. Sotto i 1100px non ci sono colonne: la board prende la
               larghezza disponibile e si dà l'altezza dalla proporzione. */
            className="relative order-1 aspect-[5/5.4] w-full min-w-0 self-center overflow-hidden [container-type:size] min-[1100px]:order-2 min-[1100px]:aspect-auto min-[1100px]:h-[var(--board-side)] min-[1100px]:w-[calc(var(--board-side)*0.9259)]"
            style={{ backgroundColor: theme.bg, borderRadius: theme.radius + 8 }}
          >
            <div className="h-full w-full p-[2.2cqmin]">
              <div className="grid h-full w-full grid-cols-5 grid-rows-[auto_repeat(5,1fr)] gap-[1.2cqmin]">
                {board.categories.map((cat) => (
                  <CategoryHeader key={cat.id} category={cat} theme={theme} onSaved={refresh} />
                ))}
                {[0, 1, 2, 3, 4].map((row) =>
                  board.categories.map((cat) => {
                    const tile = board.tiles.find(
                      (t) => t.category_id === cat.id && t.row_index === row,
                    );
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

          <aside className="order-3 flex flex-col min-[1100px]:mt-[var(--board-offset)] min-[1100px]:h-[var(--board-side)] min-[1100px]:w-full min-[1100px]:min-h-0 min-[1100px]:max-w-[22rem] min-[1100px]:self-start min-[1100px]:overflow-hidden">
            {selectedTile ? (
              <TileEditor
                key={selectedTile.id}
                tile={selectedTile}
                categoryTitle={
                  board.categories.find((c) => c.id === selectedTile.category_id)?.title
                }
                isDailyDouble={dailyDoubles.includes(selectedTile.id)}
                onToggleDailyDouble={() => void toggleDailyDouble(selectedTile.id)}
                hostId={board.game.host_id}
                gameId={gameId}
                theme={theme}
                onClose={() => setSelectedTileId(null)}
                onSaved={refresh}
              />
            ) : (
              <Panel
                fill
                title={ddMode ? "Daily Doubles" : "Nothing selected"}
                className="justify-center text-center"
              >
                <p className="text-sm text-muted-foreground">
                  {ddMode
                    ? "Tap tiles on the board to mark them. Leave none and the game picks two at random."
                    : "Tap any tile to edit its question, answer, media and formatting."}
                </p>
                {!ddMode && (
                  /* L'unica cosa non evidente della pagina: le categorie si
                   rinominano cliccandole, e niente lo diceva. */
                  <p className="mt-3 text-xs text-muted-foreground/80">
                    Category names are editable too — click one at the top of the board.
                  </p>
                )}
              </Panel>
            )}
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {playOpen && (
          <PlayDialog
            gameId={gameId}
            joinCode={board.game.join_code}
            onClose={() => setPlayOpen(false)}
          />
        )}
        {joinOpen && (
          <JoinDialog joinCode={board.game.join_code} onClose={() => setJoinOpen(false)} />
        )}
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
      {/* Titolo al centro, come le schede della console. Se c'è un contatore
          sta a fianco del titolo e il gruppo resta centrato: messo a destra
          sbilanciava la riga e il titolo non era più sulla mezzeria. */}
      <div className="mb-2.5 flex shrink-0 items-center justify-center gap-2">
        <h3 className="truncate text-center text-sm font-semibold text-muted-foreground">
          {title}
        </h3>
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
        /* Niente pastiglia verde: una pastiglia colorata si legge come
           un'etichetta di stato, non come il titolo della cosa che stai
           modificando. Testo pieno, più grande, e la pastiglia compare solo
           sotto il cursore per dire che si può cambiare. */
        title="Click to rename"
        className="max-w-[45vw] truncate rounded-full px-3 py-1 text-center font-display text-xl font-black tracking-tight text-foreground transition-colors hover:bg-foreground/10 sm:text-2xl"
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
      className="w-[45vw] max-w-sm rounded-full bg-muted px-4 py-1 text-center font-display text-xl font-black tracking-tight outline-none ring-2 ring-ink-accent sm:text-2xl"
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
      /*
       * `ring-*` di Tailwind È un box-shadow, e questa casella ne ha uno scritto
       * inline: lo stile inline vinceva sulla classe e l'anello non si disegnava
       * mai. Non si capiva quale delle cinque caselle da 200 si stesse
       * modificando, e le Daily Double non avevano il loro bordo dorato.
       *
       * Ora: bordo per la Daily Double (trasparente sulle altre, così la
       * scatola è identica e il contenuto non balla), contorno per la
       * selezione. Il passaggio del cursore accende un contorno chiaro, e la
       * selezione lo scavalca perché arriva inline.
       */
      className="relative flex h-full w-full flex-col items-center justify-center gap-[0.6cqmin] overflow-hidden p-[1cqmin] text-center transition-[transform,filter] hover:-translate-y-0.5 hover:brightness-[1.04] hover:[outline:2px_solid_color-mix(in_srgb,white_70%,transparent)] hover:[outline-offset:2px]"
      style={{
        backgroundColor: theme.card,
        borderRadius: theme.radius,
        border: `0.4cqmin solid ${dailyDouble ? "var(--ink-gold)" : "transparent"}`,
        ...(selected
          ? {
              outline: "0.55cqmin solid var(--ink-accent)",
              outlineOffset: "0.35cqmin",
              filter: "brightness(1.08)",
            }
          : null),
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
        <span
          className="flex items-center gap-[0.6cqmin] opacity-70"
          style={{ color: theme.accent }}
        >
          {tile.image_url && (
            <ImagePlus className="h-[1.8cqmin] w-[1.8cqmin]" aria-label="Has image" />
          )}
          {tile.audio_url && <Music className="h-[1.8cqmin] w-[1.8cqmin]" aria-label="Has audio" />}
        </span>
      )}
    </motion.button>
  );
}

/* ------------------------------- Tile editor ------------------------------ */

function TileEditor({
  tile,
  categoryTitle,
  isDailyDouble,
  onToggleDailyDouble,
  hostId,
  gameId,
  theme,
  onClose,
  onSaved,
}: {
  tile: Tile;
  /** Serve a dire QUALE casella: di "200" ce ne sono cinque. */
  categoryTitle: string | undefined;
  isDailyDouble: boolean;
  onToggleDailyDouble: () => void;
  hostId: string;
  gameId: string;
  theme: ThemeSettings;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Esc chiude, come ci si aspetta da un ispettore. Ignorato mentre si scrive
  // in un campo, dove Esc serve semmai ad annullare la riga.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const el = document.activeElement;
      const typing =
        el instanceof HTMLElement &&
        (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
      if (typing) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const editorRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const [answer, setAnswer] = useState(tile.answer);
  const [hint, setHint] = useState(tile.hint ?? "");
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
      <div className="relative mb-2.5 flex shrink-0 items-center justify-center gap-2">
        <h3 className="truncate text-center text-sm font-semibold text-muted-foreground">
          {categoryTitle ? `${categoryTitle} · ` : ""}
          <span className="font-display font-black tabular-nums text-foreground">
            {tile.points}
          </span>
        </h3>
        <button
          onClick={onClose}
          /* Dentro la riga del titolo e non incollata al bordo: a 44px
             abbondanti, il tondo tocca quasi lo spigolo della scheda. Qui è
             più piccola e rientra, così sta dentro la curva. */
          className="absolute right-0 top-1/2 flex h-9 w-9 shrink-0 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Close editor"
          title="Close (Esc)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Colonna, non pila con spaziatura: così la domanda può prendersi tutto
          quello che avanza invece di restare a 96 pixel fissi con mezza scheda
          vuota sotto. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain pr-1">
        {/* Cresce col testo invece di riempire tutta la scheda: una domanda di
            sei parole non ha bisogno di un riquadro alto mezzo schermo. Il
            contentEditable si allunga da sé, quindi basta non forzargli
            un'altezza. */}
        <div className="shrink-0">
          <span className={FIELD_LABEL}>Question</span>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onBlur={saveQuestion}
            /*
             * Incolla come testo semplice.
             *
             * Prima c'era una barretta che compariva al primo clic con grassetto,
             * corsivo, corpo e colore: gli stessi comandi che stanno nel pannello
             * Testo, dove però valgono per TUTTE le domande invece che per una
             * selezione dentro una. Due posti per la stessa cosa, e quello che
             * spuntava dal nulla spingeva giù Risposta, Hint e Media a ogni clic
             * nel campo.
             *
             * Tolta quella, resta questo: senza più un "azzera formattazione",
             * un incolla da una pagina web porterebbe dentro font e colori suoi
             * che la board non governa.
             */
            onPaste={(e) => {
              e.preventDefault();
              const text = e.clipboardData.getData("text/plain");
              document.execCommand("insertText", false, text);
            }}
            className="min-h-12 rounded-[26px] bg-muted px-4 py-3.5 text-sm leading-relaxed outline-none ring-2 ring-transparent focus:ring-ink-accent"
          />
        </div>

        <label className="block shrink-0">
          <span className={FIELD_LABEL}>Answer</span>
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onBlur={() => answer !== tile.answer && void save({ answer })}
            placeholder="What is…?"
            className="h-12 w-full rounded-full bg-muted px-4 text-sm outline-none ring-2 ring-transparent focus:ring-ink-accent"
          />
        </label>

        <label className="block shrink-0">
          <span className={FIELD_LABEL}>Hint · host only</span>
          <input
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="Only you see this while hosting"
            onBlur={() => hint !== (tile.hint ?? "") && void save({ hint: hint || null })}
            className="h-12 w-full rounded-full bg-muted px-4 text-sm outline-none ring-2 ring-transparent focus:ring-ink-accent"
          />
        </label>

        <div className="shrink-0">
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
            <input
              ref={imageRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUpload(f, "image");
                e.target.value = "";
              }}
            />
            <input
              ref={audioRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUpload(f, "audio");
                e.target.value = "";
              }}
            />
          </div>
          {imageUrl && (
            <div className="relative mt-2">
              <img
                src={imageUrl}
                alt="Tile media"
                className="max-h-32 w-full rounded-[26px] object-cover"
              />
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
              <button
                onClick={() => void save({ audio_url: null })}
                className="rounded-full bg-muted p-1.5"
                aria-label="Remove audio"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground">
            Images ≤ 5MB · Audio ≤ 10MB · stored privately
          </p>
        </div>

        {/* I comandi della casella. Stanno in fondo perché è lì che si arriva
            quando si è finito di scriverla, e perché quello spazio era vuoto. */}
        <div className="mt-auto shrink-0 border-t border-foreground/10 pt-3">
          <button
            onClick={onToggleDailyDouble}
            aria-pressed={isDailyDouble}
            className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-bold transition-colors ${
              isDailyDouble
                ? "bg-butter text-ink-gold elev-1"
                : "border border-foreground/20 text-foreground hover:bg-foreground/5"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            {isDailyDouble ? "Is a Daily Double" : "Make it a Daily Double"}
          </button>
          <button
            onClick={() => {
              if (!window.confirm("Clear this tile? Question, answer, hint and media are removed."))
                return;
              if (editorRef.current) editorRef.current.innerHTML = "";
              setAnswer("");
              setHint("");
              void save({ question: "", answer: "", hint: null, image_url: null, audio_url: null });
            }}
            className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-bold text-danger-ink transition-colors hover:bg-danger-ink/10"
          >
            <Trash2 className="h-4 w-4" /> Clear tile
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* -------------------------------- Theme bar ------------------------------- */

function ThemeBar({
  gameId,
  theme,
  onSaved,
}: {
  gameId: string;
  theme: ThemeSettings;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [rowPoints, setRowPointsState] = useState(theme.rowPoints);
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

  /** Colori scelti a mano: salva e basta. Un avviso a ogni scatto del
   *  selettore di colore sarebbe una raffica di notifiche. */
  const applyColors = (patch: Pick<ThemeSettings, "bg" | "card" | "accent">) => {
    patchThemeCache(patch);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void saveTheme(patch), 400);
  };

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
  const current: TextStyle =
    (scope === "all" ? theme.textStyles?.numbers : theme.textStyles?.[scope]) ?? {};

  /** Write a typography patch into the theme JSON for the selected scope(s). */
  const applyTextStyle = async (patch: TextStyle) => {
    const scopes: TextScope[] = scope === "all" ? ["numbers", "questions", "categories"] : [scope];
    const next = { ...(theme.textStyles ?? {}) };
    for (const sc of scopes) next[sc] = { ...(next[sc] ?? {}), ...patch };
    patchThemeCache({ textStyles: next });
    await saveTheme({ textStyles: next });
  };

  /** Il colore di una squadra: salvato in ritardo, come le altre tinte. */
  const applyTeamColor = (key: "teamAlphaColor" | "teamBravoColor", value: string) => {
    patchThemeCache({ [key]: value });
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void saveTheme({ [key]: value }), 400);
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
      <Panel title="Text">
        {/* A CHE COSA si applica. Da solo in riga: è la scelta che comanda
            tutte le altre, e affiancato al carattere si leggevano come due
            valori senza chiave. */}
        <span className={`${ROW_LABEL} mb-1.5 block`}>Applies to</span>
        {/* Menu scritto a mano e non `<select>`: il menu di sistema tiene il
            testo a sinistra e incolla la freccia al bordo, e non c'è verso di
            centrarlo. Qui il valore sta al centro come in tutte le altre
            pastiglie, e la freccia ha il suo margine. */}
        <PillSelect
          label="Text target"
          value={scope}
          options={[
            { value: "numbers", label: "Numbers" },
            { value: "questions", label: "Questions" },
            { value: "categories", label: "Categories" },
            { value: "all", label: "All text" },
          ]}
          onChange={(v) => setScope(v as TextScope | "all")}
        />

        <span className={`${ROW_LABEL} mb-1.5 mt-3 block`}>Font</span>
        <FontPicker
          font={current.font ?? ""}
          weight={current.weight}
          onPick={(patch) => void applyTextStyle(patch)}
        />

        <span className={`${ROW_LABEL} mb-1.5 mt-3 flex items-center gap-1`}>
          <Type className="h-3.5 w-3.5" /> Size
        </span>
        {/* Il cursore non lasciava scrivere un valore. Qui il numero è il
            comando: doppio clic e si digita, oppure meno e più di uno alla
            volta. La misura è in centesimi del corpo di partenza. */}
        <Stepper
          value={Math.round((current.size ?? 1) * 100)}
          min={60}
          max={180}
          wide
          label="Text size"
          onChange={(v) => void applyTextStyle({ size: v / 100 })}
        />

        <div className="mt-3 flex gap-2">
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
              className={`h-12 flex-1 rounded-full text-sm transition-colors ${cls} ${
                current[key]
                  ? "bg-ink-accent text-card"
                  : "border border-foreground/15 text-foreground hover:bg-foreground/5"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Appearance">
        {/* Cinque pastiglie in riga: quattro temi pronti e una personalizzata.
            Con quattro restava un buco a destra, e il gruppo non era centrato
            rispetto alla scheda. */}
        <div className="flex items-center justify-between gap-2">
          {THEME_PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => void applyPreset(p)}
              title={p.name}
              aria-label={`Apply theme ${p.name}`}
              className="h-12 w-12 shrink-0 transition-transform hover:scale-110 scallop"
              style={{
                background: `linear-gradient(135deg, ${p.theme.bg} 40%, ${p.theme.accent})`,
              }}
            />
          ))}
          <CustomThemeSwatch theme={theme} onPick={applyColors} />
        </div>

        <div className="mt-3 flex h-12 items-center gap-3">
          <span className={ROW_LABEL}>Roundness</span>
          <input
            type="range"
            min={0}
            max={50}
            value={theme.radius}
            aria-label="Roundness"
            onChange={(e) => applyRadius(Number(e.target.value))}
            className="min-w-0 flex-1 accent-[var(--ink-accent)]"
          />
          <Stepper value={theme.radius} min={0} max={50} onChange={applyRadius} label="Roundness" />
        </div>
      </Panel>

      <Panel title="Game">
        <span className={`${ROW_LABEL} mb-2 block text-center`}>Teams</span>
        {/* Le due squadre stanno una accanto all'altra: sono una coppia, e in
            colonna si leggevano come due impostazioni separate. */}
        <div className="flex gap-2">
          <TeamNameInput
            defaultValue={theme.teamAlpha ?? ""}
            placeholder="Alpha"
            colorVar="--team-alpha"
            color={theme.teamAlphaColor}
            onSaveColor={(c) => applyTeamColor("teamAlphaColor", c)}
            onSave={(v) => void applyTeamName("teamAlpha", v)}
          />
          <TeamNameInput
            defaultValue={theme.teamBravo ?? ""}
            placeholder="Bravo"
            colorVar="--team-bravo"
            color={theme.teamBravoColor}
            onSaveColor={(c) => applyTeamColor("teamBravoColor", c)}
            onSave={(v) => void applyTeamName("teamBravo", v)}
          />
        </div>

        <span className={`${ROW_LABEL} mb-2 mt-3 block text-center`}>Points ladder</span>
        {/* Cinque valori in una riga sola: è una scala, e a capo 3+2 si leggeva
            come due gruppi con l'ultima riga mezza vuota. */}
        <div className="flex gap-1.5">
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
              className="h-12 min-w-0 flex-1 rounded-full bg-muted px-1 text-center font-display text-xs font-black tabular-nums outline-none ring-2 ring-transparent focus:ring-ink-accent"
            />
          ))}
        </div>
      </Panel>
    </>
  );
}

/* ------------------------------- Controlli -------------------------------- */

/**
 * Una pastiglia che apre un elenco. Il valore sta al centro e la freccia ha il
 * suo margine: il `<select>` di sistema teneva il testo a sinistra e incollava
 * la freccia al bordo, e non c'è modo di centrarlo.
 */
function PillSelect({
  value,
  options,
  label,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  label: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-expanded={open}
        /* Il rientro a sinistra pareggia quello a destra PIÙ la freccia
           (12 + 16 = 28): altrimenti il testo esce di sei pixel dal centro
           della pastiglia, che è proprio quello che si stava cercando di
           evitare passando dal menu di sistema. */
        className="flex h-12 w-full items-center rounded-full bg-muted pl-7 pr-3 text-foreground"
      >
        <span className="flex-1 truncate text-center text-sm font-bold">{current?.label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <button
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-20 cursor-default"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -6 }}
              transition={SPRING_UI}
              className="absolute left-0 right-0 top-14 z-30 rounded-[26px] bg-popover p-2 elev-3"
            >
              {options.map((o) => (
                <button
                  key={o.value}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`h-11 w-full rounded-full px-4 text-center text-sm font-semibold transition-colors ${
                    o.value === value ? "bg-ink-accent text-card" : "hover:bg-foreground/5"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Meno · numero · più.
 *
 * Il numero È il comando: doppio clic e si digita. Prima c'era un bottone che
 * apriva un campo al primo clic, ma il campo si richiudeva da solo e il valore
 * non si riusciva a scrivere.
 */
function Stepper({
  value,
  min,
  max,
  suffix = "",
  wide = false,
  label,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  suffix?: string;
  /** Occupa tutta la riga invece di stare in coda a un cursore. */
  wide?: boolean;
  label: string;
  onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (v: number) => Math.max(min, Math.min(max, v));

  const commit = () => {
    if (draft !== null) {
      const n = Number(draft);
      if (Number.isFinite(n)) onChange(clamp(Math.round(n)));
    }
    setDraft(null);
  };

  const Step = ({ delta, children }: { delta: number; children: React.ReactNode }) => (
    <button
      onClick={() => onChange(clamp(value + delta))}
      disabled={delta < 0 ? value <= min : value >= max}
      aria-label={`${label} ${delta > 0 ? "+" : "−"}1`}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/10 disabled:opacity-30"
    >
      {children}
    </button>
  );

  return (
    <div
      className={`flex h-12 items-center gap-1 rounded-full bg-muted px-1 ${wide ? "w-full" : "shrink-0"}`}
    >
      <Step delta={-1}>
        <Minus className="h-4 w-4" />
      </Step>
      {draft !== null ? (
        <input
          autoFocus
          value={draft}
          inputMode="numeric"
          aria-label={label}
          onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setDraft(null);
          }}
          onFocus={(e) => e.target.select()}
          className={`${wide ? "flex-1" : "w-10"} min-w-0 bg-transparent text-center font-display text-sm font-black tabular-nums text-foreground outline-none`}
        />
      ) : (
        <button
          onDoubleClick={() => setDraft(String(value))}
          title="Double-click to type a value"
          className={`${wide ? "flex-1" : "w-10"} cursor-text select-none text-center font-display text-sm font-black tabular-nums text-foreground`}
        >
          {value}
          {suffix}
        </button>
      )}
      <Step delta={1}>
        <Plus className="h-4 w-4" />
      </Step>
    </div>
  );
}

/**
 * Un bottone solo per il carattere. Si apre e mostra le famiglie scritte nella
 * propria faccia — il nome da solo non dice come sarà — e sotto i tagli di peso.
 */
function FontPicker({
  font,
  weight,
  onPick,
}: {
  font: string;
  weight: number | undefined;
  onPick: (patch: TextStyle) => void;
}) {
  const [open, setOpen] = useState(false);
  const family = BOARD_FONTS.find((f) => f.value === font) ?? BOARD_FONTS[0]!;
  const cut = FONT_WEIGHTS.find((w) => w.value === weight);

  return (
    <div className="relative">
      {/* Due cose distinte dentro un comando solo: la famiglia e il taglio di
          peso, separate da un filetto. Prima erano "Display" e "BLACK" alle due
          estremità della stessa pastiglia, senza niente in mezzo che dicesse
          che erano due informazioni diverse. */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Font"
        className="flex h-12 w-full items-center gap-2 rounded-full bg-muted pl-4 pr-3 text-foreground"
      >
        <span
          className="min-w-0 flex-1 truncate text-center text-sm font-semibold"
          style={family.value ? { fontFamily: family.value } : undefined}
        >
          {family.label}
        </span>
        <span aria-hidden className="h-6 w-px shrink-0 rounded-full bg-foreground/20" />
        <span className="w-16 shrink-0 text-center text-[11px] font-bold text-muted-foreground">
          {cut?.label ?? "Auto"}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-20 cursor-default"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -6 }}
              transition={SPRING_UI}
              className="absolute left-0 right-0 top-14 z-30 rounded-[26px] bg-popover p-2 elev-3"
            >
              <div className="max-h-56 overflow-y-auto overscroll-contain">
                {BOARD_FONTS.map((f) => (
                  <button
                    key={f.label}
                    onClick={() => onPick({ font: f.value })}
                    className={`h-11 w-full rounded-full px-4 text-center text-sm transition-colors ${
                      f.value === font ? "bg-ink-accent text-card" : "hover:bg-foreground/5"
                    }`}
                    style={f.value ? { fontFamily: f.value } : undefined}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 border-t border-foreground/10 pt-2">
                <span className={`${ROW_LABEL} mb-1.5 block px-2`}>Weight</span>
                <div className="flex flex-wrap gap-1.5 px-1 pb-1">
                  {FONT_WEIGHTS.map((w) => (
                    <button
                      key={w.value}
                      onClick={() => onPick({ weight: w.value })}
                      className={`h-10 flex-1 rounded-full px-2 text-xs transition-colors ${
                        w.value === weight
                          ? "bg-ink-accent text-card"
                          : "bg-muted hover:brightness-110"
                      }`}
                      style={{
                        fontWeight: w.value,
                        ...(family.value ? { fontFamily: family.value } : null),
                      }}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * La quinta pastiglia: i colori se li sceglie l'host. Chiude la riga — con
 * quattro restava un vuoto a destra — e aggiunge l'unica cosa che i temi
 * pronti non possono dare.
 */
function CustomThemeSwatch({
  theme,
  onPick,
}: {
  theme: ThemeSettings;
  onPick: (patch: Pick<ThemeSettings, "bg" | "card" | "accent">) => void;
}) {
  const [open, setOpen] = useState(false);
  const rows: { key: "bg" | "card" | "accent"; label: string }[] = [
    { key: "bg", label: "Board" },
    { key: "card", label: "Tiles" },
    { key: "accent", label: "Text" },
  ];

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Custom colours"
        aria-label="Custom colours"
        className="flex h-12 w-12 items-center justify-center text-foreground transition-transform hover:scale-110 scallop"
        style={{ background: `linear-gradient(135deg, ${theme.bg} 40%, ${theme.accent})` }}
      >
        <Palette className="h-4 w-4 mix-blend-difference" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-20 cursor-default"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -6 }}
              transition={SPRING_UI}
              className="absolute right-0 top-14 z-30 w-56 rounded-[26px] bg-popover p-3 elev-3"
            >
              {rows.map((r) => (
                <label
                  key={r.key}
                  className="mb-1.5 flex h-11 items-center gap-3 rounded-full px-2 last:mb-0"
                >
                  <input
                    type="color"
                    value={theme[r.key]}
                    onChange={(e) =>
                      onPick({
                        bg: theme.bg,
                        card: theme.card,
                        accent: theme.accent,
                        [r.key]: e.target.value,
                      })
                    }
                    aria-label={r.label}
                    className="h-7 w-7 shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0"
                  />
                  <span className="flex-1 text-sm font-semibold text-foreground">{r.label}</span>
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">
                    {theme[r.key]}
                  </span>
                </label>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Pallino del colore e nome della squadra, appaiati.
 *
 * Il pallino non era decorazione: adesso apre il selettore e cambia la tinta
 * della squadra ovunque — pastiglie dei punteggi, coda, buzzer sul telefono,
 * overlay — perché quella tinta è una variabile CSS che tutto il resto legge.
 */
function TeamNameInput({
  defaultValue,
  placeholder,
  colorVar,
  color,
  onSave,
  onSaveColor,
}: {
  defaultValue: string;
  placeholder: string;
  colorVar: string;
  color: string | undefined;
  onSave: (value: string) => void;
  onSaveColor: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  useEffect(() => setValue(defaultValue), [defaultValue]);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-muted p-1">
      <label
        className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full"
        style={{ backgroundColor: color ?? `var(${colorVar})` }}
        title={`${placeholder} colour`}
      >
        <input
          type="color"
          value={color ?? "#888888"}
          onChange={(e) => onSaveColor(e.target.value)}
          aria-label={`${placeholder} colour`}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        <Palette className="h-3.5 w-3.5 text-foreground/70 mix-blend-difference" />
      </label>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => value.trim() !== defaultValue && onSave(value)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        placeholder={placeholder}
        maxLength={24}
        aria-label={`${placeholder} name`}
        className="min-w-0 flex-1 bg-transparent px-1 text-center text-xs font-bold outline-none"
      />
    </div>
  );
}

/* ------------------------------- Play dialog ------------------------------ */

function PlayDialog({
  gameId,
  joinCode,
  onClose,
}: {
  gameId: string;
  joinCode: string;
  onClose: () => void;
}) {
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

        <div className="my-5 font-display text-5xl font-black tracking-[0.25em] text-ink-accent">
          {joinCode}
        </div>

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
              if (data)
                void navigate({ to: "/host/$sessionId", params: { sessionId: data.session.id } });
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
