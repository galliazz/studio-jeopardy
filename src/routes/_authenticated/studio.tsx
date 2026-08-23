import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
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
} from "@/lib/games.functions";
import { themeOf, type Game } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";

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
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-lavender opacity-60 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-48 -right-32 h-[460px] w-[460px] rounded-full bg-pastel-blue opacity-60 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-8">
        {/* Header */}
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-deep-purple">
              <Zap className="h-6 w-6 text-gold" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Welcome, <span className="font-semibold text-foreground">{data?.profile?.username ?? "…"}</span>
              </p>
              <h1 className="font-display text-3xl font-black tracking-tight">Your Jeopardy Studio</h1>
            </div>
          </div>
          <button
            onClick={() => void signOut()}
            className="flex items-center gap-2 rounded-full border border-input bg-card px-5 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>

        {/* Action row */}
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <div className="flex min-w-64 flex-1 items-center gap-2 rounded-full border-2 border-input bg-card px-5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search boards…"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-electric-blue/30"
          >
            <Plus className="h-5 w-5" /> Create New Board
          </motion.button>
          <button
            onClick={() => importRef.current?.click()}
            className="flex items-center gap-2 rounded-full bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground"
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
            className="mb-8 rounded-[28px] bg-card p-6 shadow-xl shadow-deep-purple/10"
          >
            <h2 className="mb-3 font-display text-lg font-bold">Name your board</h2>
            <div className="flex gap-2">
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
                placeholder="e.g. Friday Night Trivia"
                maxLength={80}
                className="h-12 flex-1 rounded-2xl border-2 border-input bg-background px-4 text-sm outline-none focus:border-electric-blue"
              />
              <button
                onClick={() => void handleCreate()}
                className="rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground"
              >
                Create
              </button>
              <button
                onClick={() => setCreating(false)}
                className="rounded-full bg-muted px-5 text-sm font-semibold text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {/* Game cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-[32px] bg-muted" />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="rounded-[32px] bg-card p-12 text-center text-muted-foreground shadow">
            No boards yet — create your first one!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((game, i) => (
              <GameCard
                key={game.id}
                game={game}
                index={i}
                menuOpen={openMenu === game.id}
                onToggleMenu={() => setOpenMenu(openMenu === game.id ? null : game.id)}
                onDuplicate={() => void handleDuplicate(game.id)}
                onExport={() => void handleExport(game.id)}
                onDelete={() => void handleDelete(game.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GameCard({
  game,
  index,
  menuOpen,
  onToggleMenu,
  onDuplicate,
  onExport,
  onDelete,
}: {
  game: Game;
  index: number;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const theme = themeOf(game);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 160, damping: 20 }}
      className="group relative flex flex-col rounded-[32px] bg-card p-5 shadow-lg shadow-deep-purple/5 transition-shadow hover:shadow-xl"
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <h3 className="font-display text-lg font-bold leading-tight">{game.title}</h3>
        <div className="relative">
          <button
            onClick={onToggleMenu}
            aria-label="Board options"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-2xl border border-border bg-popover p-1.5 shadow-xl"
            >
              {[
                { icon: Copy, label: "Duplicate", fn: onDuplicate },
                { icon: Download, label: "Export JSON", fn: onExport },
                { icon: Trash2, label: "Delete", fn: onDelete, danger: true },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.fn}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${
                    item.danger ? "text-destructive" : "text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" /> {item.label}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Mini grid preview */}
      <div className="mb-4 grid flex-1 grid-cols-5 gap-1 rounded-2xl p-2" style={{ backgroundColor: theme.bg }}>
        {Array.from({ length: 25 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded"
            style={{ backgroundColor: i < 5 ? theme.accent : theme.card, opacity: i < 5 ? 0.9 : 1 }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="rounded-full bg-secondary px-3 py-1 font-mono text-xs font-bold tracking-widest text-secondary-foreground">
          {game.join_code}
        </span>
        <Link
          to="/edit/$gameId"
          params={{ gameId: game.id }}
          className="flex items-center gap-1.5 rounded-full bg-deep-purple px-4 py-2 text-xs font-bold text-lavender transition-transform hover:scale-105"
        >
          <Pencil className="h-3.5 w-3.5" /> Open
          <Play className="h-3 w-3" />
        </Link>
      </div>
    </motion.div>
  );
}
