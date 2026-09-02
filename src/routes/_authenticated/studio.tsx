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
  Zap,
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

import { sfx } from "@/lib/sfx";
import { getSettings } from "@/lib/settings";

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
            {isLoading ? "Loading boards…" : `${boardCount} board${boardCount === 1 ? "" : "s"}`}
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
  const navigate = useNavigate();
  const theme = darkBoardColors(themeOf(game), useThemeMode() === "dark");
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(game.title);
  const [showQr, setShowQr] = useState(false);
  useEffect(() => setDraftTitle(game.title), [game.title]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, onCloseMenu]);
  const joinUrl =
    typeof window === "undefined" ? `/play/${game.join_code}` : `${window.location.origin}/play/${game.join_code}`;


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
      role="link"
      tabIndex={0}
      title="Open in editor"
      onClick={() => void navigate({ to: "/edit/$gameId", params: { gameId: game.id } })}
      onKeyDown={(e) => {
        if (e.key === "Enter") void navigate({ to: "/edit/$gameId", params: { gameId: game.id } });
      }}
      className={`group relative flex cursor-pointer flex-col rounded-[36px] ${tint} p-6 elev-1 transition-transform hover:-translate-y-1 hover:elev-2`}
    >
      <div className="mb-4 flex min-w-0 items-start justify-between gap-2">
        {renaming ? (
          <input
            autoFocus
            value={draftTitle}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            maxLength={80}
            className="h-12 w-full rounded-full bg-card px-3 py-1 font-display text-lg font-bold outline-none ring-2 ring-ink-accent"
          />
        ) : (
          /* Fixed two-line box keeps every card's title on the same baseline */
          <h3
            className="line-clamp-2 min-h-12 min-w-0 flex-1 font-display text-xl font-black leading-6"
            title={game.title}
          >
            {game.title}
          </h3>
        )}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu();
            }}
            aria-label="Board options"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-lilac text-foreground transition-colors hover:brightness-95"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              {/* Click-away backdrop */}
              <button
                aria-label="Close menu"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseMenu();
                }}
                className="fixed inset-0 z-10 cursor-default"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-11 z-20 w-60 overflow-hidden rounded-[28px] bg-popover p-2 elev-3"
              >
                {/* Share block: join code, link, QR */}
                <div className="mb-1 rounded-[22px] bg-muted/60 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Join code</p>
                  <p className="font-mono text-lg font-black tracking-widest text-foreground">{game.join_code}</p>
                  <div className="mt-2 flex gap-1.5">
                    <button
                      onClick={() => {
                        void navigator.clipboard.writeText(joinUrl);
                        toast.success("Join link copied");
                      }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-card px-3 py-2 text-xs font-bold elev-1"
                    >
                      <LinkIcon className="h-3.5 w-3.5" /> Copy link
                    </button>
                    <button
                      onClick={() => setShowQr((v) => !v)}
                      aria-label="Show QR code"
                      className="flex items-center justify-center gap-1.5 rounded-full bg-card px-3 py-2 text-xs font-bold elev-1"
                    >
                      <QrCode className="h-3.5 w-3.5" /> QR
                    </button>
                  </div>
                  {showQr && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-2 flex justify-center rounded-[18px] bg-white p-2"
                    >
                      <QRCodeSVG value={joinUrl} size={124} />
                    </motion.div>
                  )}
                </div>
                {[
                  { icon: Pencil, label: "Rename", fn: () => { onCloseMenu(); setRenaming(true); } },
                  { icon: Copy, label: "Duplicate", fn: onDuplicate },
                  { icon: Download, label: "Export JSON", fn: onExport },
                  { icon: FileSpreadsheet, label: "Export Excel", fn: onExportXlsx },
                  { icon: Trash2, label: "Delete", fn: onDelete, danger: true },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      item.fn();
                    }}
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

      <div className="flex items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          className="flex flex-1 items-center justify-center gap-2.5 rounded-full bg-coral py-5 font-display text-xl font-black text-foreground elev-2 transition-transform hover:scale-[1.02]"
        >
          <Play className="h-6 w-6" /> Play
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={(e) => {
            e.stopPropagation();
            void navigate({ to: "/edit/$gameId", params: { gameId: game.id } });
          }}
          aria-label="Edit board"
          title="Edit board"
          className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-card text-foreground elev-1 transition-transform hover:scale-[1.05]"
        >
          <Pencil className="h-5 w-5" />
        </motion.button>
      </div>
    </motion.div>
  );
}
