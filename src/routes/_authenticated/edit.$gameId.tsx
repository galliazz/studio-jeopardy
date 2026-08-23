import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { themeOf, type BoardData, type Category, type Tile, type ThemeSettings } from "@/lib/types";
import { stripHtml } from "@/lib/sanitize";
import { uploadMedia, useSignedUrl, IMAGE_CAP_BYTES, AUDIO_CAP_BYTES } from "@/lib/media";

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

const THEME_PRESETS: { name: string; theme: Pick<ThemeSettings, "bg" | "card" | "accent"> }[] = [
  { name: "Midnight Gold", theme: { bg: "#070714", card: "#141433", accent: "#f7b731" } },
  { name: "Lavender Dream", theme: { bg: "#4a4458", card: "#e8def8", accent: "#6750a4" } },
  { name: "Electric Night", theme: { bg: "#04121f", card: "#0a2a44", accent: "#4fc3f7" } },
  { name: "Paper Light", theme: { bg: "#f7f2fa", card: "#ffffff", accent: "#0061a4" } },
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

  const board = data as unknown as BoardData | undefined;
  const theme = board ? themeOf(board.game) : null;
  const selectedTile = board?.tiles.find((t) => t.id === selectedTileId) ?? null;

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["board", gameId] }),
    [queryClient, gameId],
  );

  if (!board || !theme) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-16 w-16 animate-pulse rounded-[24px] bg-lavender" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-40">
      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link
            to="/studio"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Back to studio"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <InlineTitle
            value={board.game.title}
            onSave={async (title) => {
              await updateGame({ data: { gameId, title } });
              void refresh();
            }}
          />
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-full bg-secondary px-3 py-1.5 font-mono text-xs font-bold tracking-widest text-secondary-foreground sm:block">
              {board.game.join_code}
            </span>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setPlayOpen(true)}
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-electric-blue/30"
            >
              <Play className="h-4 w-4" /> Play Game
            </motion.button>
          </div>
        </div>
      </div>

      {/* Board canvas — themed preview */}
      <div className="mx-auto max-w-7xl px-4 pt-6">
        <div
          className="p-4 sm:p-6"
          style={{ backgroundColor: theme.bg, borderRadius: theme.radius + 8 }}
        >
          <div className="grid grid-cols-5 gap-2 sm:gap-3">
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
                    onClick={() => setSelectedTileId(tile.id)}
                  />
                );
              }),
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Tap any tile to edit its question, answer, media, and formatting.
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
        className="max-w-[40vw] truncate rounded-xl px-2 py-1 text-left font-display text-xl font-bold hover:bg-muted"
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
      className="rounded-xl border-2 border-electric-blue bg-background px-2 py-1 font-display text-xl font-bold outline-none"
    />
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
      className="flex min-h-16 items-center justify-center p-2 text-center"
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
          className="w-full bg-transparent text-center text-xs font-bold uppercase tracking-wide outline-none sm:text-sm"
          style={{ color: theme.accent }}
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="h-full w-full text-xs font-bold uppercase leading-tight tracking-wide transition-opacity hover:opacity-70 sm:text-sm"
          style={{ color: theme.accent }}
        >
          {category.title}
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
  onClick,
}: {
  tile: Tile;
  theme: ThemeSettings;
  selected: boolean;
  onClick: () => void;
}) {
  const preview = stripHtml(tile.question);
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`flex min-h-20 flex-col items-center justify-center gap-1 p-2 text-center transition-all sm:min-h-24 ${
        selected ? "ring-4 ring-electric-blue" : "hover:brightness-125"
      }`}
      style={{ backgroundColor: theme.card, borderRadius: theme.radius }}
    >
      <span className="font-display text-lg font-black sm:text-2xl" style={{ color: theme.accent }}>
        {tile.points}
      </span>
      {preview ? (
        <span
          className="line-clamp-2 text-[10px] leading-tight opacity-60 sm:text-xs"
          style={{ color: theme.card === "#ffffff" || theme.card === "#e8def8" ? "#333" : "#eee" }}
        >
          {preview}
        </span>
      ) : (
        <span className="text-[10px] italic opacity-40" style={{ color: "#bbb" }}>
          empty
        </span>
      )}
      {(tile.image_url || tile.audio_url) && (
        <span className="text-[9px]" style={{ color: theme.accent }}>
          {tile.image_url ? "🖼" : ""}{tile.audio_url ? " 🎵" : ""}
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
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="fixed bottom-36 right-4 top-20 z-40 flex w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[28px] border border-border bg-card shadow-2xl"
    >
      <div className="flex items-center justify-between bg-muted px-5 py-3">
        <span className="font-display text-sm font-bold">Edit tile</span>
        <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-background" aria-label="Close editor">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">Points</span>
          <input
            type="number"
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            onBlur={() => points !== tile.points && void save({ points })}
            className="h-10 w-28 rounded-xl border-2 border-input bg-background px-3 text-sm font-bold outline-none focus:border-electric-blue"
          />
        </label>

        <div>
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">Question</span>
          <AnimatePresence>
            {focused && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="mb-2 flex flex-wrap items-center gap-1 rounded-2xl bg-deep-purple p-1.5"
              >
                <FmtBtn onClick={() => exec("bold")} label="Bold"><Bold className="h-4 w-4" /></FmtBtn>
                <FmtBtn onClick={() => exec("italic")} label="Italic"><Italic className="h-4 w-4" /></FmtBtn>
                <FmtBtn onClick={() => exec("underline")} label="Underline"><Underline className="h-4 w-4" /></FmtBtn>
                <select
                  onChange={(e) => exec("fontSize", e.target.value)}
                  defaultValue="3"
                  className="h-8 rounded-lg bg-transparent px-1 text-xs text-lavender outline-none"
                  aria-label="Font size"
                >
                  <option value="2">Small</option>
                  <option value="3">Normal</option>
                  <option value="5">Large</option>
                  <option value="7">Huge</option>
                </select>
                <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-lavender hover:bg-white/10" aria-label="Text color">
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
            className="min-h-24 rounded-2xl border-2 border-input bg-background p-3 text-sm outline-none focus:border-electric-blue"
          />
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">Answer</span>
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onBlur={() => answer !== tile.answer && void save({ answer })}
            placeholder="What is…?"
            className="h-10 w-full rounded-xl border-2 border-input bg-background px-3 text-sm outline-none focus:border-electric-blue"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">Hint (optional, host-only)</span>
          <input
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            onBlur={() => hint !== (tile.hint ?? "") && void save({ hint: hint || null })}
            className="h-10 w-full rounded-xl border-2 border-input bg-background px-3 text-sm outline-none focus:border-electric-blue"
          />
        </label>

        <div>
          <span className="mb-2 block text-xs font-semibold text-muted-foreground">Media</span>
          <div className="flex gap-2">
            <button
              onClick={() => imageRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-secondary py-3 text-xs font-semibold text-secondary-foreground"
            >
              <ImagePlus className="h-4 w-4" /> Image
            </button>
            <button
              onClick={() => audioRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-secondary py-3 text-xs font-semibold text-secondary-foreground"
            >
              <Music className="h-4 w-4" /> Audio
            </button>
            <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f, "image"); e.target.value = ""; }} />
            <input ref={audioRef} type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f, "audio"); e.target.value = ""; }} />
          </div>
          {imageUrl && (
            <div className="relative mt-2">
              <img src={imageUrl} alt="Tile media" className="max-h-32 w-full rounded-2xl object-cover" />
              <button
                onClick={() => void save({ image_url: null })}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white"
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
      className="flex h-8 w-8 items-center justify-center rounded-lg text-lavender transition-colors hover:bg-white/10"
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
      transition={{ type: "spring", stiffness: 200, damping: 24, delay: 0.2 }}
      className="fixed bottom-5 left-1/2 z-30 w-[min(960px,calc(100vw-2rem))] -translate-x-1/2 rounded-[32px] border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-md"
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          {THEME_PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => void applyPreset(p)}
              title={p.name}
              aria-label={`Apply theme ${p.name}`}
              className="h-9 w-9 rounded-full border-2 border-border transition-transform hover:scale-110"
              style={{ background: `linear-gradient(135deg, ${p.theme.bg} 40%, ${p.theme.accent})` }}
            />
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          Roundness
          <input
            type="range"
            min={0}
            max={40}
            value={theme.radius}
            onChange={(e) => applyRadius(Number(e.target.value))}
            className="w-24 accent-[oklch(0.48_0.12_252)]"
          />
          {radiusEditing ? (
            <input
              autoFocus
              type="number"
              min={0}
              max={40}
              value={theme.radius}
              onChange={(e) => applyRadius(Math.max(0, Math.min(40, Number(e.target.value))))}
              onBlur={() => setRadiusEditing(false)}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="h-7 w-14 rounded-lg border-2 border-electric-blue bg-background px-1 text-center text-xs font-bold text-foreground outline-none"
            />
          ) : (
            <button
              onDoubleClick={() => setRadiusEditing(true)}
              title="Double-click to type a value"
              className="w-8 rounded-lg px-1 py-0.5 text-center text-foreground hover:bg-muted"
            >
              {theme.radius}
            </button>
          )}
        </label>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Teams</span>
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

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Points</span>
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
              className="h-9 w-16 rounded-xl border-2 border-input bg-background px-2 text-center text-xs font-bold outline-none focus:border-electric-blue"
            />
          ))}
        </div>
      </div>
    </motion.div>
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
      <span className={`h-3 w-3 rounded-full ${swatch}`} />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => value.trim() !== defaultValue && onSave(value)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        placeholder={placeholder}
        maxLength={24}
        className="h-9 w-24 rounded-xl border-2 border-input bg-background px-2 text-xs font-bold outline-none focus:border-electric-blue"
      />
    </div>
  );
}

/* ------------------------------- Play dialog ------------------------------ */

function PlayDialog({ gameId, joinCode, onClose }: { gameId: string; joinCode: string; onClose: () => void }) {
  const navigate = useNavigate();
  const start = useServerFn(startSession);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["session-start", gameId],
    queryFn: () => start({ data: { gameId } }),
  });

  const joinUrl = `${window.location.origin}/play/${joinCode}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[32px] bg-card p-8 text-center shadow-2xl"
      >
        <h2 className="font-display text-2xl font-black">Players join with this code</h2>
        <p className="mt-1 text-sm text-muted-foreground">Open on any phone — no app needed</p>

        <div className="my-5 font-display text-5xl font-black tracking-[0.25em] text-electric-blue">{joinCode}</div>

        <div className="mx-auto mb-5 w-fit rounded-3xl bg-white p-3">
          <QRCodeSVG value={joinUrl} size={160} />
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(joinUrl);
              toast.success("Join link copied");
            }}
            className="flex items-center justify-center gap-2 rounded-full bg-secondary py-3 text-sm font-semibold text-secondary-foreground"
          >
            <Copy className="h-4 w-4" /> Copy join link
          </button>
          <button
            disabled={isLoading || isError}
            onClick={() => {
              if (data) void navigate({ to: "/host/$sessionId", params: { sessionId: data.session.id } });
            }}
            className="flex items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-electric-blue/30 disabled:opacity-50"
          >
            <ExternalLink className="h-4 w-4" />
            {isLoading ? "Preparing session…" : "Open Host Console"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
