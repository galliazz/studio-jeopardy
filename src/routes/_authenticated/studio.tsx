import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  Play,
  Pencil,
  QrCode,
  Link as LinkIcon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  bootstrapStudio,
  createGame,
  duplicateGame,
  deleteGame,
  exportGame,
  importGame,
  updateGame,
} from "@/lib/games.functions";
import { startSession } from "@/lib/sessions.functions";
import { themeOf, type Game } from "@/lib/types";
import { useThemeMode } from "@/components/ThemeToggle";
import { darkBoardColors } from "@/lib/theme-mode";
import { SettingsDialog } from "@/components/SettingsDialog";
import { StudioTopBar } from "@/components/StudioTopBar";

import { getSettings } from "@/lib/settings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const { data, isLoading, error } = useQuery({
    queryKey: ["studio"],
    queryFn: () => bootstrap(),
    retry: false,
  });

  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
      // Seed the new board with the default team names from local studio preferences.
      const prefs = getSettings();
      if (prefs.teamAlpha.trim() || prefs.teamBravo.trim()) {
        await updateGame({
          data: { gameId: game.id, theme: { teamAlpha: prefs.teamAlpha, teamBravo: prefs.teamBravo } },
        });
      }
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

  /**
   * Deletion is deferred a few seconds so the snackbar can offer Undo — the
   * card disappears immediately, the server call only fires once the grace
   * period elapses.
   */
  const handleDelete = (gameId: string, title: string) => {
    setPendingDelete((prev) => [...prev, gameId]);
    let undone = false;
    const timer = setTimeout(() => {
      if (undone) return;
      void deleteGame({ data: { gameId } })
        .then(() => refresh())
        .catch((err: unknown) => {
          setPendingDelete((prev) => prev.filter((id) => id !== gameId));
          toast.error(err instanceof Error ? err.message : "Delete failed");
        });
    }, 6000);
    toast.success(`“${title}” deleted`, {
      duration: 6000,
      action: {
        label: "Undo",
        onClick: () => {
          undone = true;
          clearTimeout(timer);
          setPendingDelete((prev) => prev.filter((id) => id !== gameId));
        },
      },
    });
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

  const displayName = data?.profile?.username ?? "there";
  const boardCount = (data?.games ?? []).length;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div aria-hidden className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-lilac opacity-70 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-48 -right-32 h-[460px] w-[460px] rounded-full bg-peach opacity-70 blur-3xl" />

      <StudioTopBar
        displayName={data?.profile?.username ?? "Host"}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="relative z-10 mx-auto max-w-[1440px] px-4 pb-24 pt-8 sm:px-6">
        {/* Page header — plain text, no card */}
        <header className="mb-8">
          <h2 className="font-display text-[28px] font-black leading-9 tracking-tight text-foreground sm:text-[32px]">
            Welcome back, {displayName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading
              ? "Loading boards…"
              : error
                ? "Sign in to load your boards"
                : `${boardCount} board${boardCount === 1 ? "" : "s"}`}
          </p>
        </header>

        {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}

        {/* Action row: primary CTA, secondary action, spacer, low-emphasis search */}
        <div className="relative mb-8 flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setCreating(true)}
            className="flex h-12 items-center gap-2 rounded-full bg-coral px-7 font-display text-base font-black text-foreground elev-2 transition-transform hover:scale-[1.03]"
          >
            <Plus className="h-5 w-5" /> Create a new game
          </motion.button>
          <button
            onClick={() => importRef.current?.click()}
            className="flex h-12 items-center gap-2 rounded-full border-2 border-foreground/20 bg-transparent px-6 text-sm font-bold text-foreground transition-colors hover:bg-foreground/5"
          >
            <Upload className="h-4 w-4" /> Import JSON
          </button>
          <div className="flex-1" />
          {/* Search grows leftward over the buttons, keeping the spring feel */}
          <motion.div
            layout
            animate={{ width: searchOpen || search ? 320 : 40 }}
            transition={{ type: "spring", stiffness: 380, damping: 18 }}
            className={`relative z-10 flex h-10 max-w-[calc(100vw-3rem)] shrink-0 items-center overflow-hidden rounded-full ${
              searchOpen || search ? "bg-card elev-1" : ""
            }`}
          >
            <button
              aria-label="Search boards"
              onClick={() => setSearchOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/5"
            >
              <Search className="h-4 w-4" />
            </button>
            <input
              value={search}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => {
                if (!search.trim()) setSearchOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearch("");
                  setSearchOpen(false);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search boards…"
              className="h-10 w-full min-w-0 bg-transparent pr-4 text-sm outline-none placeholder:text-muted-foreground/60"
            />
          </motion.div>
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
          <div className="grid grid-cols-1 gap-4 min-[600px]:grid-cols-2 min-[600px]:gap-6 min-[840px]:grid-cols-3 min-[1200px]:grid-cols-4">

            {[0, 1, 2].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-[32px] bg-muted" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-[36px] bg-card p-12 text-center text-muted-foreground elev-1">
            <p className="mb-4">You need to be signed in to load and create boards.</p>
            <button
              onClick={() => void navigate({ to: "/auth" })}
              className="rounded-full bg-coral px-7 py-3 text-sm font-bold text-foreground elev-1"
            >
              Sign in
            </button>
          </div>
        ) : games.length === 0 ? (
          <div className="rounded-[36px] bg-card p-12 text-center text-muted-foreground elev-1">
            No boards yet — create your first one!
          </div>
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-4 min-[600px]:grid-cols-2 min-[600px]:gap-6 min-[840px]:grid-cols-3 min-[1200px]:grid-cols-4">

            {games.map((game, i) => (
              <GameCard
                key={game.id}
                game={game}
                index={i}
                stats={data?.stats?.[game.id]}
                onPlay={() => void handlePlay(game.id)}
                onRename={(title) => void handleRename(game.id, title)}
                onDuplicate={() => void handleDuplicate(game.id)}
                onExport={() => void handleExport(game.id)}
                onExportXlsx={() => void handleExportXlsx(game.id)}
                onDelete={() => handleDelete(game.id, game.title)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type BoardStats = { total: number; ready: number; grid: boolean[][] };

function GameCard({
  game,
  index,
  stats,
  onPlay,
  onRename,
  onDuplicate,
  onExport,
  onExportXlsx,
  onDelete,
}: {
  game: Game;
  index: number;
  stats?: BoardStats;
  onPlay: () => void;
  onRename: (title: string) => void;
  onDuplicate: () => void;
  onExport: () => void;
  onExportXlsx: () => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  const theme = darkBoardColors(themeOf(game), useThemeMode() === "dark");
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(game.title);
  const [joinOpen, setJoinOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => setDraftTitle(game.title), [game.title]);

  const joinUrl =
    typeof window === "undefined" ? `/play/${game.join_code}` : `${window.location.origin}/play/${game.join_code}`;

  const commitRename = () => {
    setRenaming(false);
    const v = draftTitle.trim();
    if (v && v !== game.title) onRename(v);
    else setDraftTitle(game.title);
  };

  const total = stats?.total ?? 0;
  const ready = stats?.ready ?? 0;
  const complete = total > 0 && ready === total;
  const grid = stats?.grid;

  const openEditor = () => void navigate({ to: "/edit/$gameId", params: { gameId: game.id } });

  const tints = ["bg-lilac", "bg-mint", "bg-peach", "bg-sky", "bg-blush", "bg-butter"];
  const tint = tints[index % tints.length];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, type: "spring", stiffness: 160, damping: 20 }}
        role="button"
        tabIndex={0}
        title="Open in editor"
        onClick={openEditor}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openEditor();
          }
        }}
        className={`group relative flex cursor-pointer flex-col rounded-[36px] ${tint} p-6 elev-1 outline-none transition-transform hover:-translate-y-1 hover:elev-2 focus-visible:-translate-y-1 focus-visible:elev-2 focus-visible:ring-2 focus-visible:ring-ink-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background`}
      >
        {/* a) Title row — fixed 48px, single-line title + minimal-emphasis menu */}
        <div className="mb-4 flex h-12 min-w-0 items-center gap-2">
          {renaming ? (
            <input
              autoFocus
              value={draftTitle}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") {
                  setDraftTitle(game.title);
                  setRenaming(false);
                }
              }}
              maxLength={80}
              className="h-10 w-full min-w-0 rounded-full bg-card px-3 font-display text-lg font-bold outline-none ring-2 ring-ink-accent"
            />
          ) : (
            <h3
              title={game.title}
              className="min-w-0 flex-1 truncate whitespace-nowrap font-display text-xl font-black"
            >
              {game.title}
            </h3>
          )}

          <div className="relative z-20 shrink-0" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Board options"
                  className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ink-accent focus-visible:ring-offset-2"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/10">
                    <MoreVertical className="h-4 w-4" />
                  </span>
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom" className="w-56 rounded-[24px] p-2">
                <DropdownMenuItem
                  className="rounded-full px-4 py-2.5 text-sm font-semibold"
                  onSelect={() => setJoinOpen(true)}
                >
                  <QrCode className="mr-2 h-4 w-4" /> Join code
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-full px-4 py-2.5 text-sm font-semibold"
                  onSelect={() => setRenaming(true)}
                >
                  <Pencil className="mr-2 h-4 w-4" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-full px-4 py-2.5 text-sm font-semibold" onSelect={onDuplicate}>
                  <Copy className="mr-2 h-4 w-4" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-full px-4 py-2.5 text-sm font-semibold" onSelect={onExport}>
                  <Download className="mr-2 h-4 w-4" /> Export JSON
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-full px-4 py-2.5 text-sm font-semibold" onSelect={onExportXlsx}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="rounded-full px-4 py-2.5 text-sm font-semibold text-danger-ink focus:text-danger-ink"
                  onSelect={() => setConfirmDelete(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* b) Board preview — three distinct surface levels, dashed cells when empty */}
        <div className="mb-4 grid flex-1 grid-cols-5 gap-1.5 rounded-[26px] p-3" style={{ backgroundColor: theme.bg }}>
          {Array.from({ length: 5 }).map((_, col) => (
            <div
              key={col}
              className="aspect-square rounded-[7px]"
              style={{ backgroundColor: theme.accent }}
            />
          ))}
          {Array.from({ length: 5 }).map((_, row) =>
            Array.from({ length: 5 }).map((__, col) => {
              const filled = grid ? Boolean(grid[col]?.[row]) : true;
              return (
                <div
                  key={`${row}-${col}`}
                  className="aspect-square rounded-[7px]"
                  style={
                    filled
                      ? { backgroundColor: theme.card }
                      : { border: `1.5px dashed ${theme.card}`, backgroundColor: "transparent" }
                  }
                />
              );
            }),
          )}
        </div>

        {/* c) Status row */}
        <p className="mb-3 text-xs font-semibold text-foreground/70">
          {complete ? "Ready to play" : `${ready} of ${total || 25} tiles ready`}
        </p>

        {/* d) Full-width CTA */}
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onPlay();
            }
          }}
          className="relative z-20 flex h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-full bg-coral font-display text-lg font-black text-foreground elev-2 outline-none transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-ink-accent focus-visible:ring-offset-2"
        >
          <Play className="h-5 w-5" /> Play
        </div>
      </motion.div>

      {/* Join code + QR dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="rounded-[32px] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Join code</DialogTitle>
            <DialogDescription>Players can join with this code or by scanning the QR.</DialogDescription>
          </DialogHeader>
          <p className="text-center font-mono text-3xl font-black tracking-widest text-foreground">{game.join_code}</p>
          <div className="flex justify-center rounded-[18px] bg-white p-3">
            <QRCodeSVG value={joinUrl} size={160} />
          </div>
          <button
            onClick={() => {
              void navigator.clipboard.writeText(joinUrl);
              toast.success("Join link copied");
            }}
            className="flex items-center justify-center gap-2 rounded-full bg-lilac px-5 py-3 text-sm font-bold text-foreground elev-1"
          >
            <LinkIcon className="h-4 w-4" /> Copy link
          </button>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="rounded-[32px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete “{game.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the board and all of its clues. You can undo right after deleting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-full bg-coral text-foreground" onClick={onDelete}>
              Delete board
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
