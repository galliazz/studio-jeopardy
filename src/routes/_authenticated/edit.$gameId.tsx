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
import { ThemeToggle } from "@/components/ThemeToggle";

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

  const board = data as unknown as BoardData | undefined;
  const theme = board ? themeOf(board.game) : null;
  const selectedTile = board?.tiles.find((t) => t.id === selectedTileId) ?? null;

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["board", gameId] }),
    [queryClient, gameId],
  );

  if (!board || !theme) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-pulse rounded-[28px] bg-lilac" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-44">
      {/* Top bar */}
      <div className="sticky top-0 z-30 px-4 pt-4">
        <div className="mx-auto flex max-w-7xl items-center gap-3 rounded-full bg-card/90 px-4 py-3 elev-2 backdrop-blur-md">
          <Link
            to="/studio"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-lilac text-foreground transition-transform hover:scale-105"
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
            <ThemeToggle />
            <span className="hidden rounded-full bg-mint px-4 py-2 font-mono text-xs font-bold tracking-widest text-foreground sm:block">
              {board.game.join_code}
            </span>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setPlayOpen(true)}
              className="flex items-center gap-2 rounded-full bg-coral px-6 py-3 font-display text-sm font-black text-foreground elev-2"
            >
              <Play className="h-4 w-4" /> Play Game
            </motion.button>
          </div>
        </div>
      </div>

      {/* Board canvas — themed preview */}
      <div className="mx-auto max-w-7xl px-4 pt-6">
        <div
          className="p-5 elev-3 transition-[border-radius] duration-300 sm:p-7"
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
        className="max-w-[40vw] truncate rounded-full px-3 py-1.5 text-left font-display text-xl font-black hover:bg-muted"
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
      className="rounded-full bg-muted px-4 py-1.5 font-display text-xl font-black outline-none ring-2 ring-ink-accent"
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
      className="flex min-h-16 items-center justify-center p-2 text-center transition-[border-radius] duration-300"
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
        selected ? "ring-4 ring-ink-accent" : "hover:-translate-y-0.5 hover:brightness-[1.03]"
      }`}
      style={{
        backgroundColor: theme.card,
        borderRadius: theme.radius,
        boxShadow: `0 2px 6px -2px color-mix(in srgb, ${theme.accent} 22%, transparent), 0 10px 22px -14px color-mix(in srgb, ${theme.accent} 28%, transparent)`,
      }}
    >
      <span className="font-display text-xl font-black sm:text-3xl" style={{ color: theme.accent }}>
        {tile.points}
      </span>
      {preview ? (
        <span
          className="line-clamp-2 text-[10px] leading-tight opacity-60 sm:text-xs"
          style={{ color: theme.accent }}
        >
          {preview}
        </span>
      ) : (
        <span className="text-[10px] italic opacity-40" style={{ color: theme.accent }}>
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
      className="fixed bottom-40 right-4 top-24 z-40 flex w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[36px] bg-card elev-3"
    >
      <div className="flex items-center justify-between bg-lilac px-6 py-4">
        <span className="font-display text-sm font-black uppercase tracking-wide">Edit tile</span>
        <button onClick={onClose} className="rounded-full bg-card p-2 text-muted-foreground hover:text-foreground" aria-label="Close editor">
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
            className="h-11 w-28 rounded-full bg-muted px-4 text-sm font-bold outline-none ring-2 ring-transparent focus:ring-ink-accent"
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
                className="mb-2 flex flex-wrap items-center gap-1 rounded-full bg-lilac p-2 elev-1"
              >
                <FmtBtn onClick={() => exec("bold")} label="Bold"><Bold className="h-4 w-4" /></FmtBtn>
                <FmtBtn onClick={() => exec("italic")} label="Italic"><Italic className="h-4 w-4" /></FmtBtn>
                <FmtBtn onClick={() => exec("underline")} label="Underline"><Underline className="h-4 w-4" /></FmtBtn>
                <select
                  onChange={(e) => exec("fontSize", e.target.value)}
                  defaultValue="3"
                  className="h-9 rounded-full bg-card px-2 text-xs font-semibold text-foreground outline-none"
                  aria-label="Font size"
                >
                  <option value="2">Small</option>
                  <option value="3">Normal</option>
                  <option value="5">Large</option>
                  <option value="7">Huge</option>
                </select>
                <label className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-foreground hover:bg-card" aria-label="Text color">
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
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">Answer</span>
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onBlur={() => answer !== tile.answer && void save({ answer })}
            placeholder="What is…?"
            className="h-11 w-full rounded-full bg-muted px-4 text-sm outline-none ring-2 ring-transparent focus:ring-ink-accent"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">Hint (optional, host-only)</span>
          <input
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            onBlur={() => hint !== (tile.hint ?? "") && void save({ hint: hint || null })}
            className="h-11 w-full rounded-full bg-muted px-4 text-sm outline-none ring-2 ring-transparent focus:ring-ink-accent"
          />
        </label>

        <div>
          <span className="mb-2 block text-xs font-semibold text-muted-foreground">Media</span>
          <div className="flex gap-2">
            <button
              onClick={() => imageRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-sky py-3.5 text-xs font-bold text-foreground elev-1"
            >
              <ImagePlus className="h-4 w-4" /> Image
            </button>
            <button
              onClick={() => audioRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-peach py-3.5 text-xs font-bold text-foreground elev-1"
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
      className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-card"
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
      className="fixed bottom-5 left-1/2 z-30 w-[min(960px,calc(100vw-2rem))] -translate-x-1/2 rounded-[36px] bg-card/95 px-6 py-4 elev-3 backdrop-blur-md"
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          {THEME_PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => void applyPreset(p)}
              title={p.name}
              aria-label={`Apply theme ${p.name}`}
              className="h-10 w-10 transition-transform hover:scale-110 scallop"
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
            className="w-24 accent-[var(--ink-accent)]"
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
              className="h-8 w-14 rounded-full bg-muted px-1 text-center text-xs font-bold text-foreground outline-none ring-2 ring-ink-accent"
            />
          ) : (
            <button
              onDoubleClick={() => setRadiusEditing(true)}
              title="Double-click to type a value"
              className="w-9 rounded-full px-1 py-0.5 text-center font-bold text-foreground hover:bg-muted"
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
              className="h-10 w-16 rounded-full bg-muted px-2 text-center text-xs font-bold outline-none ring-2 ring-transparent focus:ring-ink-accent"
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
      <span className={`h-4 w-4 ${swatch} scallop`} />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => value.trim() !== defaultValue && onSave(value)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        placeholder={placeholder}
        maxLength={24}
        className="h-10 w-24 rounded-full bg-muted px-3 text-xs font-bold outline-none ring-2 ring-transparent focus:ring-ink-accent"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
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
