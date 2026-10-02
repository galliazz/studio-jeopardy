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
  Table2,
  Sparkles,
  Play,
  Pencil,
  QrCode,
  Link as LinkIcon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
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
import { FirstRunCard } from "@/components/FirstRunCard";
import { APP_GUTTER } from "@/components/app-bar";
import { localizeError, useT } from "@/i18n";
import { boardFromRows, parseCsv, sheetCsvUrl } from "@/lib/csv-import";
import { aiAvailable, generateBoard } from "@/lib/ai-board.functions";
import type { AiDifficulty } from "@/lib/ai-board";
import { dismissFirstRun, firstRunDismissed, shouldShowFirstRun } from "@/lib/first-run";

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
import { SPRING_SNAP, SPRING_UI } from "@/lib/motion";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({
    meta: [
      { title: "Studio — JEOPARDESTINY" },
      {
        name: "description",
        content: "Your Jeopardy studio: create, edit and host live trivia boards.",
      },
      { property: "og:title", content: "Studio — JEOPARDESTINY" },
      {
        property: "og:description",
        content: "Your Jeopardy studio: create, edit and host live trivia boards.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: StudioPage,
});

function StudioPage() {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const bootstrap = useServerFn(bootstrapStudio);
  const { data, isLoading, error } = useQuery({
    queryKey: ["studio"],
    // Swallow the "no authorization header" rejection so a signed-out preview
    // renders the studio shell instead of crashing into the error overlay.
    queryFn: async () => {
      // No session (signed-out preview): skip the RPC entirely so the auth
      // middleware never throws an unhandled "no authorization header" error.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) return null;
      try {
        return await bootstrap();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (/unauthor/i.test(message)) return null;
        throw err;
      }
    },
    retry: false,
  });

  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string[]>([]);
  const importRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  // Focus the search input as soon as the spring expands, and collapse it when
  // the user clicks outside while the field is empty.
  useEffect(() => {
    if (searchOpen) {
      const id = setTimeout(() => searchRef.current?.focus(), 0);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen && !search.trim()) return;
    const handleDown = (e: MouseEvent) => {
      if (searchWrapRef.current?.contains(e.target as Node)) return;
      if (!search.trim()) setSearchOpen(false);
    };
    document.addEventListener("mousedown", handleDown, true);
    return () => document.removeEventListener("mousedown", handleDown, true);
  }, [searchOpen, search]);
  const games = useMemo(() => {
    const all = ((data?.games ?? []) as unknown as Game[]).filter(
      (g) => !pendingDelete.includes(g.id),
    );
    if (!search.trim()) return all;
    return all.filter((g) => g.title.toLowerCase().includes(search.toLowerCase()));
  }, [data, search, pendingDelete]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["studio"] });

  const handleCreate = async () => {
    const title = newTitle.trim() || "Untitled Board";
    try {
      const game = await createGame({ data: { title } });
      // Seed the new board with the default team names from local studio preferences.
      const prefs = getSettings();
      if (prefs.teamAlpha.trim() || prefs.teamBravo.trim()) {
        await updateGame({
          data: {
            gameId: game.id,
            theme: { teamAlpha: prefs.teamAlpha, teamBravo: prefs.teamBravo },
          },
        });
      }
      toast.success(t("studio.toast.created"));
      void navigate({ to: "/edit/$gameId", params: { gameId: game.id } });
    } catch (err) {
      toast.error(localizeError(err, "studio.toast.createFailed"));
    }
  };

  const handleDuplicate = async (gameId: string) => {
    try {
      await duplicateGame({ data: { gameId } });
      toast.success(t("studio.toast.duplicated"));
      void refresh();
    } catch (err) {
      toast.error(localizeError(err, "studio.toast.duplicateFailed"));
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
          toast.error(localizeError(err, "studio.toast.deleteFailed"));
        });
    }, 6000);
    toast.success(t("studio.toast.deleted", { title }), {
      duration: 6000,
      action: {
        label: t("common.undo"),
        onClick: () => {
          undone = true;
          clearTimeout(timer);
          setPendingDelete((prev) => prev.filter((id) => id !== gameId));
        },
      },
    });
  };

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [importingSheet, setImportingSheet] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>("mixed");
  const [generating, setGenerating] = useState(false);
  /* Il ricordo sta in localStorage, che sul server non esiste: si legge dopo
     il primo render, altrimenti l'HTML del server e quello del browser non
     combaciano e React ricostruisce tutto. */
  const [firstRunHidden, setFirstRunHidden] = useState(true);
  useEffect(() => setFirstRunHidden(firstRunDismissed()), []);

  const handleExport = async (gameId: string) => {
    try {
      const payload = await exportGame({ data: { gameId } });
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${payload.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("studio.toast.exportedJson"));
    } catch (err) {
      toast.error(localizeError(err, "studio.toast.exportFailed"));
    }
  };

  const handleExportXlsx = async (gameId: string) => {
    try {
      const payload = await exportGame({ data: { gameId } });
      const XLSX = await import("xlsx");
      const rows = payload.categories.flatMap((cat) =>
        cat.tiles.map((tile) => ({
          [t("studio.excel.category")]: cat.title,
          [t("studio.excel.points")]: tile.points,
          [t("studio.excel.clue")]: tile.question,
          [t("studio.excel.answer")]: tile.answer,
          [t("studio.excel.hint")]: tile.hint ?? "",
        })),
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), t("studio.excel.sheet"));
      XLSX.writeFile(wb, `${payload.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.xlsx`);
      toast.success(t("studio.toast.exportedExcel"));
    } catch (err) {
      toast.error(localizeError(err, "studio.toast.exportFailed"));
    }
  };

  const start = useServerFn(startSession);
  const handlePlay = async (gameId: string) => {
    try {
      const { session } = await start({ data: { gameId } });
      void navigate({ to: "/host/$sessionId", params: { sessionId: session.id } });
    } catch (err) {
      toast.error(localizeError(err, "studio.toast.startFailed"));
    }
  };

  const handleRename = async (gameId: string, title: string) => {
    try {
      await updateGame({ data: { gameId, title } });
      toast.success(t("studio.toast.renamed"));
      void refresh();
    } catch (err) {
      toast.error(localizeError(err, "studio.toast.renameFailed"));
    }
  };

  /**
   * Importa un tabellone. Il tipo si decide dal contenuto e non
   * dall'estensione: un foglio esportato da Google a volte arriva con un
   * nome qualunque, e chi importa non deve saperlo.
   */
  const importBoard = async (payload: unknown, note?: string) => {
    const game = await importGame({ data: payload as never });
    toast.success(note ? `${t("studio.toast.imported")} — ${note}` : t("studio.toast.imported"));
    void navigate({ to: "/edit/$gameId", params: { gameId: game.id } });
  };

  const importRows = async (rows: string[][], fallbackTitle: string) => {
    const { board, skipped } = boardFromRows(rows, fallbackTitle);
    // Le colonne vuote le aggiunge l'importatore: quello che conta è se è
    // arrivata almeno una casella vera.
    if (!board.categories.some((c) => c.tiles.length)) {
      throw new Error(t("studio.import.nothingUsable"));
    }
    await importBoard(board, skipped ? t("studio.import.skipped", { count: skipped }) : undefined);
  };

  const importCsvText = (text: string, fallbackTitle: string) =>
    importRows(parseCsv(text), fallbackTitle);

  /**
   * Un bottone solo per tre formati.
   *
   * Chi esporta in Excel si aspetta di poter ricaricare quel file: l'estensione
   * la guarda solo per il foglio di calcolo, che è binario. Per gli altri due
   * decide il contenuto, perché i nomi dei file mentono — un `.txt` con dentro
   * del JSON è JSON, e un CSV rinominato resta un CSV.
   */
  const handleImportFile = async (file: File) => {
    const fallbackTitle = file.name.replace(/\.[^.]+$/, "").slice(0, 80) || "Import";
    try {
      if (/\.xlsx?$/i.test(file.name)) {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0] ?? ""];
        if (!sheet) throw new Error(t("studio.import.nothingUsable"));
        /* Via Excel le celle tornano già divise: si salta il CSV e si passano
           le righe come sono, numeri compresi. */
        const rows = XLSX.utils
          .sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, raw: false })
          .map((row) => row.map((cell) => (cell == null ? "" : String(cell))));
        await importRows(rows, fallbackTitle);
        return;
      }
      const text = await file.text();
      const looksJson = text.trimStart().startsWith("{");
      if (looksJson) await importBoard(JSON.parse(text) as unknown);
      else await importCsvText(text, fallbackTitle);
    } catch (err) {
      toast.error(localizeError(err, "studio.toast.importFailed"));
    }
  };

  /** Il foglio dev'essere pubblicato sul web: così non si chiede l'accesso
      all'account di Google, e non passa di qui nessun dato in più. */
  const handleImportSheet = async () => {
    const url = sheetCsvUrl(sheetUrl);
    if (!url) {
      toast.error(t("studio.import.notASheet"));
      return;
    }
    setImportingSheet(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(t("studio.import.sheetUnreachable"));
      await importCsvText(await res.text(), t("studio.import.fromSheet"));
      setSheetOpen(false);
      setSheetUrl("");
    } catch (err) {
      toast.error(localizeError(err, "studio.import.sheetUnreachable"));
    } finally {
      setImportingSheet(false);
    }
  };

  /* Se la chiave API non c'è, il bottone non compare: meglio un'interfaccia
     più corta che un bottone che si scusa. La risposta è un booleano e non
     cambia durante la visita, quindi non si ricontrolla. */
  const askAi = useServerFn(aiAvailable);
  const { data: ai } = useQuery({
    queryKey: ["ai-available"],
    queryFn: () => askAi(),
    staleTime: Infinity,
    retry: false,
  });

  const makeBoard = useServerFn(generateBoard);
  const handleGenerate = async () => {
    const topic = aiTopic.trim();
    if (topic.length < 2) return;
    setGenerating(true);
    try {
      const { board, tiles } = await makeBoard({
        data: { topic, language: t.locale, difficulty: aiDifficulty },
      });
      const game = await importGame({ data: board as never });
      /* Due messaggi: quanto è arrivato, e che va riletto. Il secondo resta
         più a lungo, perché è quello che conta: una data inventata si
         riconosce solo rileggendo. */
      toast.success(t("studio.ai.done", { count: tiles }));
      toast.warning(t("studio.ai.review"), { duration: 8000 });
      setAiOpen(false);
      setAiTopic("");
      void navigate({ to: "/edit/$gameId", params: { gameId: game.id } });
    } catch (err) {
      toast.error(localizeError(err, "errors.ai.failed"));
    } finally {
      setGenerating(false);
    }
  };

  const showFirstRun =
    !firstRunHidden &&
    !isLoading &&
    shouldShowFirstRun({
      boards: (data?.games ?? []).length,
      dismissed: false,
      hasPlayed: data?.hasPlayed ?? true,
    });

  const username = data?.profile?.username;
  const boardCount = (data?.games ?? []).length;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -start-40 -top-40 h-[420px] w-[420px] rounded-full bg-lilac opacity-70 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -end-32 h-[460px] w-[460px] rounded-full bg-peach opacity-70 blur-3xl"
      />

      <StudioTopBar
        displayName={username ?? t("studio.defaultHostName")}
        avatarUrl={data?.profile?.avatar_url ?? null}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Stesso margine della barra: il titolo sta sotto il logo, la lente di
          ricerca sotto l'avatar. */}
      <div className={`relative z-10 w-full pb-24 pt-8 ${APP_GUTTER}`}>
        {/* Page header — plain text, no card */}
        <header className="mb-8">
          <h2 className="font-display text-[28px] font-black leading-9 tracking-tight text-foreground sm:text-[32px]">
            {username == null
              ? t("studio.header.welcomeBackGuest")
              : t("studio.header.welcomeBack", { name: username })}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading
              ? t("studio.header.loadingBoards")
              : error
                ? t("studio.header.signInToLoad")
                : t("studio.header.boardCount", { count: boardCount })}
          </p>
        </header>

        {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}

        {showFirstRun && (
          <FirstRunCard
            onDismiss={() => {
              dismissFirstRun();
              setFirstRunHidden(true);
            }}
          />
        )}

        {/* Action row: primary CTA, secondary action, spacer, low-emphasis search */}
        <div className="relative mb-8 flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setCreating(true)}
            className="flex h-12 items-center gap-2 rounded-full bg-coral px-7 font-display text-base font-black text-foreground elev-2 transition-transform hover:scale-[1.03]"
          >
            <Plus className="h-5 w-5" /> {t("studio.actions.createGame")}
          </motion.button>
          <button
            onClick={() => importRef.current?.click()}
            title={t("studio.actions.importFileHint")}
            className="flex h-12 items-center gap-2 rounded-full border-2 border-foreground/20 bg-transparent px-6 text-sm font-bold text-foreground transition-colors hover:bg-foreground/5"
          >
            <Upload className="h-4 w-4" /> {t("studio.actions.importFile")}
          </button>
          <button
            onClick={() => {
              setSheetOpen(true);
              setAiOpen(false);
            }}
            className="flex h-12 items-center gap-2 rounded-full border-2 border-foreground/20 bg-transparent px-6 text-sm font-bold text-foreground transition-colors hover:bg-foreground/5"
          >
            <Table2 className="h-4 w-4" /> {t("studio.actions.importSheet")}
          </button>
          {ai?.available && (
            <button
              onClick={() => {
                setAiOpen((v) => !v);
                setSheetOpen(false);
              }}
              className="flex h-12 items-center gap-2 rounded-full border-2 border-ink-accent/40 bg-transparent px-6 text-sm font-bold text-foreground transition-colors hover:bg-foreground/5"
            >
              <Sparkles className="h-4 w-4" /> {t("studio.actions.generateAi")}
            </button>
          )}
          <div className="flex-1" />
          {/* Search grows leftward over the buttons, keeping the spring feel */}
          <motion.div
            ref={searchWrapRef}
            layout
            animate={{ width: searchOpen || search ? 320 : 40 }}
            transition={SPRING_SNAP}
            className={`relative z-10 flex h-10 max-w-[calc(100vw-3rem)] shrink-0 items-center overflow-hidden rounded-full ${
              searchOpen || search ? "bg-card elev-1" : ""
            }`}
          >
            <button
              aria-label={t("studio.actions.searchBoards")}
              onClick={() => setSearchOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/5"
            >
              <Search className="h-4 w-4" />
            </button>
            <input
              ref={searchRef}
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
              placeholder={t("studio.actions.searchPlaceholder")}
              className="h-10 w-full min-w-0 bg-transparent pe-4 text-sm outline-none placeholder:text-muted-foreground"
            />
          </motion.div>
          <input
            ref={importRef}
            type="file"
            accept="application/json,text/csv,.csv,.json,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImportFile(f);
              e.target.value = "";
            }}
          />
        </div>

        {/* Genera con l'IA: argomento, difficoltà, e la lingua è quella della UI. */}
        {aiOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={SPRING_UI}
            className="mb-6 rounded-[32px] bg-card p-6 elev-2"
          >
            <h2 className="flex items-center gap-2 font-display text-lg font-black">
              <Sparkles className="h-4 w-4 text-ink-accent" /> {t("studio.ai.title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("studio.ai.help")}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input
                autoFocus
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !generating) void handleGenerate();
                }}
                maxLength={120}
                disabled={generating}
                placeholder={t("studio.ai.placeholder")}
                className="h-12 min-w-0 flex-1 basis-64 rounded-full bg-muted px-5 text-sm outline-none ring-2 ring-transparent focus:ring-ink-accent disabled:opacity-60"
              />
              {/* Tre livelli, visibili tutti e tre: una tendina a tre voci
                  costa un clic in più e non spiega niente di più. */}
              <div
                role="radiogroup"
                aria-label={t("studio.ai.difficulty.help")}
                className="flex h-12 shrink-0 items-center gap-1 rounded-full bg-muted p-1"
              >
                {(["easy", "mixed", "hard"] as const).map((level) => (
                  <button
                    key={level}
                    role="radio"
                    aria-checked={aiDifficulty === level}
                    disabled={generating}
                    onClick={() => setAiDifficulty(level)}
                    className={`h-10 rounded-full px-4 text-sm font-bold transition-colors ${
                      aiDifficulty === level
                        ? "bg-card text-foreground elev-1"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t(`studio.ai.difficulty.${level}`)}
                  </button>
                ))}
              </div>
              <button
                onClick={() => void handleGenerate()}
                disabled={generating || aiTopic.trim().length < 2}
                className="h-12 shrink-0 rounded-full bg-coral px-6 font-display text-sm font-black text-foreground elev-1 disabled:opacity-50"
              >
                {generating ? t("studio.ai.generating") : t("studio.ai.generate")}
              </button>
              <button
                onClick={() => setAiOpen(false)}
                disabled={generating}
                className="h-12 shrink-0 rounded-full border-2 border-foreground/20 px-5 text-sm font-bold disabled:opacity-50"
              >
                {t("studio.ai.cancel")}
              </button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{t("studio.ai.difficulty.help")}</p>
          </motion.div>
        )}

        {/* Importa da Google Sheets: basta il link del foglio pubblicato. */}
        {sheetOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={SPRING_UI}
            className="mb-6 rounded-[32px] bg-card p-6 elev-2"
          >
            <h2 className="font-display text-lg font-black">{t("studio.import.sheetTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("studio.import.sheetHelp")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <input
                autoFocus
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleImportSheet()}
                placeholder="https://docs.google.com/spreadsheets/…"
                className="h-12 min-w-0 flex-1 rounded-full bg-muted px-5 text-sm outline-none ring-2 ring-transparent focus:ring-ink-accent"
              />
              <button
                onClick={() => void handleImportSheet()}
                disabled={importingSheet || !sheetUrl.trim()}
                className="h-12 rounded-full bg-coral px-6 font-display text-sm font-black text-foreground elev-1 disabled:opacity-50"
              >
                {importingSheet ? t("studio.import.importing") : t("studio.import.importNow")}
              </button>
              <button
                onClick={() => setSheetOpen(false)}
                className="h-12 rounded-full border-2 border-foreground/20 px-5 text-sm font-bold"
              >
                {t("common.cancel")}
              </button>
            </div>
          </motion.div>
        )}

        {/* Create dialog (inline card) */}
        {creating && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="mb-8 rounded-[32px] bg-butter p-6 elev-2"
          >
            <h2 className="mb-3 font-display text-lg font-black">{t("studio.create.title")}</h2>
            <div className="flex flex-wrap gap-2">
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
                placeholder={t("studio.create.placeholder")}
                maxLength={80}
                className="h-12 min-w-48 flex-1 rounded-full bg-card px-5 text-sm outline-none ring-2 ring-transparent focus:ring-ink-accent"
              />
              <button
                onClick={() => void handleCreate()}
                className="rounded-full bg-coral px-7 py-3 text-sm font-bold text-foreground elev-1"
              >
                {t("studio.create.submit")}
              </button>
              <button
                onClick={() => setCreating(false)}
                className="rounded-full bg-card px-6 py-3 text-sm font-semibold text-muted-foreground"
              >
                {t("common.cancel")}
              </button>
            </div>
          </motion.div>
        )}

        {/* Game cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 min-[600px]:grid-cols-2 min-[600px]:gap-6 min-[840px]:grid-cols-3 min-[1200px]:grid-cols-4 min-[1600px]:grid-cols-5 min-[2000px]:grid-cols-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-[32px] bg-muted" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-[36px] bg-card p-12 text-center text-muted-foreground elev-1">
            <p className="mb-4">{t("studio.signedOut.body")}</p>
            <button
              onClick={() => void navigate({ to: "/auth" })}
              className="rounded-full bg-coral px-7 py-3 text-sm font-bold text-foreground elev-1"
            >
              {t("studio.signedOut.signIn")}
            </button>
          </div>
        ) : games.length === 0 ? (
          <div className="rounded-[36px] bg-card p-12 text-center text-muted-foreground elev-1">
            {t("studio.empty")}
          </div>
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-4 min-[600px]:grid-cols-2 min-[600px]:gap-6 min-[840px]:grid-cols-3 min-[1200px]:grid-cols-4 min-[1600px]:grid-cols-5 min-[2000px]:grid-cols-6">
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
  stats?: BoardStats | undefined;
  onPlay: () => void;
  onRename: (title: string) => void;
  onDuplicate: () => void;
  onExport: () => void;
  onExportXlsx: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const navigate = useNavigate();
  const theme = darkBoardColors(themeOf(game), useThemeMode() === "dark");
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(game.title);
  const [joinOpen, setJoinOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => setDraftTitle(game.title), [game.title]);

  const joinUrl =
    typeof window === "undefined"
      ? `/play/${game.join_code}`
      : `${window.location.origin}/play/${game.join_code}`;

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
        transition={{ ...SPRING_UI, delay: index * 0.05 }}
        role="button"
        tabIndex={0}
        title={t("studio.card.openInEditor")}
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
                  aria-label={t("studio.card.options")}
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
                  <QrCode className="me-2 h-4 w-4" /> {t("studio.card.joinCode")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-full px-4 py-2.5 text-sm font-semibold"
                  onSelect={() => setRenaming(true)}
                >
                  <Pencil className="me-2 h-4 w-4" /> {t("studio.card.rename")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-full px-4 py-2.5 text-sm font-semibold"
                  onSelect={onDuplicate}
                >
                  <Copy className="me-2 h-4 w-4" /> {t("studio.card.duplicate")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-full px-4 py-2.5 text-sm font-semibold"
                  onSelect={onExport}
                >
                  <Download className="me-2 h-4 w-4" /> {t("studio.card.exportJson")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-full px-4 py-2.5 text-sm font-semibold"
                  onSelect={onExportXlsx}
                >
                  <FileSpreadsheet className="me-2 h-4 w-4" /> {t("studio.card.exportExcel")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="rounded-full px-4 py-2.5 text-sm font-semibold text-danger-ink focus:text-danger-ink"
                  onSelect={() => setConfirmDelete(true)}
                >
                  <Trash2 className="me-2 h-4 w-4" /> {t("common.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* b) Board preview — three distinct surface levels, dashed cells when empty */}
        <div
          className="mb-4 grid flex-1 grid-cols-5 gap-1.5 rounded-[26px] p-3"
          style={{ backgroundColor: theme.bg }}
        >
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
          {complete
            ? t("studio.card.readyToPlay")
            : t("studio.card.tilesReady", { ready, count: total || 25 })}
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
          <Play className="h-5 w-5" /> {t("studio.card.play")}
        </div>
      </motion.div>

      {/* Join code + QR dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="rounded-[32px] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">{t("studio.joinDialog.title")}</DialogTitle>
            <DialogDescription>{t("studio.joinDialog.description")}</DialogDescription>
          </DialogHeader>
          <p className="text-center font-mono text-3xl font-black tracking-widest text-foreground">
            {game.join_code}
          </p>
          <div className="flex justify-center rounded-[18px] bg-white p-3">
            <QRCodeSVG value={joinUrl} size={160} />
          </div>
          <button
            onClick={() => {
              void navigator.clipboard.writeText(joinUrl);
              toast.success(t("studio.joinDialog.linkCopied"));
            }}
            className="flex items-center justify-center gap-2 rounded-full bg-lilac px-5 py-3 text-sm font-bold text-foreground elev-1"
          >
            <LinkIcon className="h-4 w-4" /> {t("common.copyLink")}
          </button>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="rounded-[32px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              {t("studio.deleteDialog.title", { title: game.title })}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("studio.deleteDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="rounded-full bg-coral text-foreground" onClick={onDelete}>
              {t("studio.deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
