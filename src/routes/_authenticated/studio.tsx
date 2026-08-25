import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  MoreVertical,
  Copy,
  Download,
  FileSpreadsheet,
  Trash2,
  Upload,
  LogOut,
  Zap,
  Play,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import {
  bootstrapStudio,
  createGame,
  duplicateGame,
  deleteGame,
  exportGame,
  importGame,
  updateGame,
  updateProfile,
} from "@/lib/games.functions";
import { startSession } from "@/lib/sessions.functions";
import { themeOf, type Game } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { useThemeMode } from "@/components/ThemeToggle";
import { darkBoardColors } from "@/lib/theme-mode";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({
    meta: [
      { title: "Studio — JEOPARDESTINY" },
      { name: "description", content: "Your Jeopardy studio: create, edit and host live trivia boards." },
      { property: "og:title", content: "Studio — JEOPARDESTINY" },
      { property: "og:description", content: "Your Jeopardy studio: create, edit and host live trivia boards." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: StudioPage,
});

function StudioPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const bootstrap = useServerFn(bootstrapStudio);
  const { data, isLoading } = useQuery({
    queryKey: ["studio"],
    queryFn: () => bootstrap(),
  });

  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const games = useMemo(() => {
    const all = (data?.games ?? []) as unknown as Game[];
    if (!search.trim()) return all;
    return all.filter((g) => g.title.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["studio"] });

  const handleCreate = async () => {
    const title = newTitle.trim() || "Untitled Board";
    try {
      const game = await createGame({ data: { title } });
      toast.success("Board created");
      void navigate({ to: "/edit/$gameId", params: { gameId: game.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create board");
    }
  };

  const handleDuplicate = async (gameId: string) => {
    setOpenMenu(null);
    try {
      await duplicateGame({ data: { gameId } });
      toast.success("Board duplicated");
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Duplicate failed");
    }
  };

  const handleDelete = async (gameId: string) => {
    setOpenMenu(null);
    try {
      await deleteGame({ data: { gameId } });
      toast.success("Board deleted");
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleExport = async (gameId: string) => {
    setOpenMenu(null);
    try {
      const payload = await exportGame({ data: { gameId } });
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${payload.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported as JSON");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  };

  const handleExportXlsx = async (gameId: string) => {
    setOpenMenu(null);
    try {
      const payload = await exportGame({ data: { gameId } });
      const XLSX = await import("xlsx");
      const rows = payload.categories.flatMap((cat) =>
        cat.tiles.map((t) => ({
          Category: cat.title,
          Points: t.points,
          Clue: t.question,
          Answer: t.answer,
          Hint: t.hint ?? "",
        })),
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Board");
      XLSX.writeFile(wb, `${payload.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.xlsx`);
      toast.success("Exported as Excel");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  };

  const start = useServerFn(startSession);
  const handlePlay = async (gameId: string) => {
    try {
      const { session } = await start({ data: { gameId } });
      void navigate({ to: "/host/$sessionId", params: { sessionId: session.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start session");
    }
  };

  const handleRename = async (gameId: string, title: string) => {
    setOpenMenu(null);
    try {
      await updateGame({ data: { gameId, title } });
      toast.success("Board renamed");
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rename failed");
    }
  };

  const handleImportFile = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const game = await importGame({ data: parsed as never });
      toast.success("Board imported");
      void navigate({ to: "/edit/$gameId", params: { gameId: game.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed — invalid file");
    }
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-lilac opacity-70 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-48 -right-32 h-[460px] w-[460px] rounded-full bg-peach opacity-70 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-8">
        {/* Greeting banner */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[36px] bg-blush p-6 elev-1 sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center bg-butter scallop">
              <Zap className="h-7 w-7 text-ink-gold" />
            </div>
            <div>
              <EditableUsername
                username={data?.profile?.username ?? ""}
                onSave={async (username) => {
                  await updateProfile({ data: { username } });
                  void refresh();
                }}
              />
              <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">Your Jeopardy Studio</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
            onClick={() => void signOut()}
            className="flex items-center gap-2 rounded-full bg-card px-5 py-3 text-sm font-semibold text-muted-foreground elev-1 transition-transform hover:scale-105 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>

        {/* Action row */}
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <div className="flex min-w-64 flex-1 items-center gap-2 rounded-full bg-card px-3 elev-1">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint">
              <Search className="h-4 w-4 text-foreground" />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search boards…"
              className="h-14 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-full bg-coral px-8 py-4 font-display text-base font-black text-foreground elev-2 transition-transform hover:scale-[1.03]"
          >
            <Plus className="h-5 w-5" /> Create a new game
          </motion.button>
          <button
            onClick={() => importRef.current?.click()}
            className="flex items-center gap-2 rounded-full bg-lilac px-6 py-4 text-sm font-bold text-foreground elev-1 transition-transform hover:scale-105"
          >
            <Upload className="h-4 w-4" /> Import JSON
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImportFile(f);
              e.target.value = "";
            }}
          />
        </div>


        {/* Create dialog (inline card) */}
        {creating && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="mb-8 rounded-[32px] bg-butter p-6 elev-2"
          >
            <h2 className="mb-3 font-display text-lg font-black">Name your board</h2>
            <div className="flex flex-wrap gap-2">
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
                placeholder="e.g. Friday Night Trivia"
                maxLength={80}
                className="h-12 min-w-48 flex-1 rounded-full bg-card px-5 text-sm outline-none ring-2 ring-transparent focus:ring-ink-accent"
              />
              <button
                onClick={() => void handleCreate()}
                className="rounded-full bg-coral px-7 py-3 text-sm font-bold text-foreground elev-1"
              >
                Create
              </button>
              <button
                onClick={() => setCreating(false)}
                className="rounded-full bg-card px-6 py-3 text-sm font-semibold text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {/* Game cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-[32px] bg-muted" />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="rounded-[36px] bg-card p-12 text-center text-muted-foreground elev-1">
            No boards yet — create your first one!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">

            {games.map((game, i) => (
              <GameCard
                key={game.id}
                game={game}
                index={i}
                menuOpen={openMenu === game.id}
                onToggleMenu={() => setOpenMenu(openMenu === game.id ? null : game.id)}
                onCloseMenu={() => setOpenMenu(null)}
                onPlay={() => void handlePlay(game.id)}
                onRename={(title) => void handleRename(game.id, title)}
                onDuplicate={() => void handleDuplicate(game.id)}
                onExport={() => void handleExport(game.id)}
                onExportXlsx={() => void handleExportXlsx(game.id)}
                onDelete={() => void handleDelete(game.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EditableUsername({ username, onSave }: { username: string; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(username);
  useEffect(() => setDraft(username), [username]);

  if (!editing) {
    return (
      <p className="text-sm text-muted-foreground">
        Welcome,{" "}
        <button
          onClick={() => setEditing(true)}
          title="Click to edit your name"
          className="group inline-flex items-center gap-1 rounded-lg px-1 font-semibold text-foreground transition-colors hover:bg-muted"
        >
          {username || "…"}
          <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
        </button>
      </p>
    );
  }
  return (
    <p className="flex items-center gap-1 text-sm text-muted-foreground">
      Welcome,
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const v = draft.trim();
          if (v.length >= 2 && v !== username) void onSave(v).then(() => toast.success("Name updated"));
          else setDraft(username);
        }}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        maxLength={24}
        className="w-36 rounded-full bg-card px-3 py-0.5 font-semibold text-foreground outline-none ring-2 ring-ink-accent"
      />
    </p>
  );
}

function GameCard({
  game,
  index,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onPlay,
  onRename,
  onDuplicate,
  onExport,
  onExportXlsx,
  onDelete,
}: {
  game: Game;
  index: number;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onPlay: () => void;
  onRename: (title: string) => void;
  onDuplicate: () => void;
  onExport: () => void;
  onExportXlsx: () => void;
  onDelete: () => void;
}) {
  const theme = darkBoardColors(themeOf(game), useThemeMode() === "dark");
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(game.title);
  useEffect(() => setDraftTitle(game.title), [game.title]);

  const commitRename = () => {
    setRenaming(false);
    const v = draftTitle.trim();
    if (v && v !== game.title) onRename(v);
    else setDraftTitle(game.title);
  };

  const tints = ["bg-lilac", "bg-mint", "bg-peach", "bg-sky", "bg-blush", "bg-butter"];
  const tint = tints[index % tints.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 160, damping: 20 }}
      className={`group relative flex flex-col rounded-[36px] ${tint} p-6 elev-1 transition-transform hover:-translate-y-1 hover:elev-2`}
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        {renaming ? (
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            maxLength={80}
            className="w-full rounded-full bg-card px-3 py-1 font-display text-lg font-bold outline-none ring-2 ring-ink-accent"
          />
        ) : (
          <h3 className="font-display text-xl font-black leading-tight">{game.title}</h3>
        )}
        <div className="relative">
          <button
            onClick={onToggleMenu}
            aria-label="Board options"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-card/70 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              {/* Click-away backdrop */}
              <button
                aria-label="Close menu"
                onClick={onCloseMenu}
                className="fixed inset-0 z-10 cursor-default"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-0 top-11 z-20 w-48 overflow-hidden rounded-[28px] bg-popover p-2 elev-3"
              >
                {[
                  { icon: Pencil, label: "Rename", fn: () => { onCloseMenu(); setRenaming(true); } },
                  { icon: Copy, label: "Duplicate", fn: onDuplicate },
                  { icon: Download, label: "Export JSON", fn: onExport },
                  { icon: FileSpreadsheet, label: "Export Excel", fn: onExportXlsx },
                  { icon: Trash2, label: "Delete", fn: onDelete, danger: true },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.fn}
                    className={`flex w-full items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted ${
                      item.danger ? "text-danger-ink" : "text-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4" /> {item.label}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* Mini grid preview */}
      <div className="mb-5 grid flex-1 grid-cols-5 gap-1.5 rounded-[26px] p-3" style={{ backgroundColor: theme.bg }}>
        {Array.from({ length: 25 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-[7px]"
            style={{ backgroundColor: i < 5 ? theme.accent : theme.card, opacity: i < 5 ? 0.85 : 1 }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-card px-3.5 py-1.5 font-mono text-xs font-bold tracking-widest text-foreground">
          {game.join_code}
        </span>
        <div className="flex items-center gap-2">
          <Link
            to="/edit/$gameId"
            params={{ gameId: game.id }}
            className="flex items-center gap-1.5 rounded-full bg-card px-5 py-2.5 text-xs font-bold text-foreground elev-1 transition-transform hover:scale-105"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Link>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onPlay}
            className="flex items-center gap-1.5 rounded-full bg-coral px-5 py-2.5 text-xs font-black text-foreground elev-2 transition-transform hover:scale-105"
          >
            <Play className="h-3.5 w-3.5" /> Play
          </motion.button>
        </div>
      </div>

    </motion.div>
  );
}
