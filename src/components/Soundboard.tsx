import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Plus, MoreVertical, Square, GripVertical } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { AddSoundDialog, type NewClip } from "@/components/AddSoundDialog";
import { addClip, listClips, removeClip, reorderClips, updateClip, MAX_CLIPS } from "@/lib/soundboard.functions";
import {
  getBoardVolume,
  playClip,
  preloadAll,
  progressOf,
  setBoardVolume,
  stopAll,
  subscribe,
  type SoundboardClip,
} from "@/lib/soundboard-engine";

export function Soundboard({ gameId, hostId }: { gameId: string; hostId: string }) {
  const qc = useQueryClient();
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [volume, setVolume] = useState(() => getBoardVolume());
  const [order, setOrder] = useState<SoundboardClip[] | null>(null);
  const dragIndex = useRef<number | null>(null);

  const { data } = useQuery({
    queryKey: ["soundboard", gameId],
    queryFn: () => listClips({ data: { gameId } }),
  });

  const clips = (order ?? (data as SoundboardClip[] | undefined) ?? []) as SoundboardClip[];

  useEffect(() => {
    setOrder(null);
  }, [data]);

  // Decode uploads into memory so a manual cue is instant on air.
  useEffect(() => {
    if (clips.length) void preloadAll(clips);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ["soundboard", gameId] }), [qc, gameId]);

  const fire = useCallback((clip: SoundboardClip) => {
    playClip(clip);
  }, []);

  // Number keys 1..9 fire the clip at that position.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as HTMLElement)?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > 9) return;
      const clip = clips[n - 1];
      if (clip) {
        e.preventDefault();
        fire(clip);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clips, fire]);

  const commitOrder = async (next: SoundboardClip[]) => {
    setOrder(next);
    try {
      await reorderClips({ data: { gameId, ids: next.map((c) => c.id) } });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reorder");
    }
  };

  const handleAdd = async (clip: NewClip) => {
    try {
      await addClip({
        data: {
          gameId,
          name: clip.name,
          source: clip.source,
          presetKey: clip.presetKey ?? null,
          storagePath: clip.storagePath ?? null,
          trimStartMs: clip.trimStartMs,
          trimEndMs: clip.trimEndMs,
          gain: clip.gain,
        },
      });
      await refresh();
      toast.success(`${clip.name} added`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add sound");
    }
  };

  return (
    <div className="rounded-[32px] bg-card p-5 elev-1">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
        <Volume2 className="h-4 w-4" /> Soundboard
      </h3>


      {clips.length === 0 ? (
        <button
          ref={addButtonRef}
          onClick={() => setAddOpen(true)}
          className="flex w-full flex-col items-center gap-1.5 rounded-[28px] border-2 border-dashed border-border px-4 py-8 text-center transition-colors hover:border-primary"
        >
          <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Plus className="h-4 w-4" /> Add sound
          </span>
          <span className="text-xs text-muted-foreground">No sounds yet — add presets or upload your own</span>
        </button>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {clips.map((clip, i) => (
                <ClipChip
                  key={clip.id}
                  clip={clip}
                  index={i}
                  onPlay={() => fire(clip)}
                  onDragStart={() => (dragIndex.current = i)}
                  onDropAt={() => {
                    const from = dragIndex.current;
                    dragIndex.current = null;
                    if (from === null || from === i) return;
                    const next = [...clips];
                    const [moved] = next.splice(from, 1);
                    if (moved) next.splice(i, 0, moved);
                    void commitOrder(next);
                  }}
                  onRename={async (name) => {
                    await updateClip({ data: { clipId: clip.id, name } });
                    await refresh();
                  }}
                  onTrim={async (patch) => {
                    await updateClip({ data: { clipId: clip.id, ...patch } });
                    await refresh();
                  }}
                  onRemove={async () => {
                    await removeClip({ data: { clipId: clip.id, gameId } });
                    await refresh();
                  }}
                />
              ))}
            </AnimatePresence>
          </div>

          <button
            ref={addButtonRef}
            onClick={() => setAddOpen(true)}
            disabled={clips.length >= MAX_CLIPS}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full border-2 border-dashed border-border px-4 py-2 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Add {clips.length >= MAX_CLIPS ? "(full)" : ""}
          </button>
        </>
      )}

      {/* Volume + Stop all only matter once there is something to play. */}
      {clips.length > 0 && (
        <div className="mt-4 flex items-center gap-3 border-t border-border pt-3">
          <Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Slider
            value={[Math.round(volume * 100)]}
            min={0}
            max={100}
            step={1}
            aria-label="Soundboard volume"
            onValueChange={([v]) => {
              const next = (v ?? 0) / 100;
              setVolume(next);
              setBoardVolume(next);
            }}
          />
          <button
            onClick={() => stopAll()}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 py-2 text-xs font-bold text-foreground"
          >
            <Square className="h-3 w-3" /> Stop all
          </button>
        </div>
      )}


      <AddSoundDialog
        open={addOpen}
        onOpenChange={(v) => {
          setAddOpen(v);
          if (!v) addButtonRef.current?.focus();
        }}
        hostId={hostId}
        gameId={gameId}
        addedPresetKeys={clips.filter((c) => c.source === "preset").map((c) => c.preset_key ?? "")}
        onAdd={handleAdd}
      />
    </div>
  );
}

/* ---------------------------------- chip ---------------------------------- */

function ClipChip({
  clip,
  index,
  onPlay,
  onDragStart,
  onDropAt,
  onRename,
  onTrim,
  onRemove,
}: {
  clip: SoundboardClip;
  index: number;
  onPlay: () => void;
  onDragStart: () => void;
  onDropAt: () => void;
  onRename: (name: string) => Promise<void>;
  onTrim: (patch: { trimStartMs: number; trimEndMs: number; gain: number }) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [editingTrim, setEditingTrim] = useState(false);
  const key = index < 9 ? String(index + 1) : null;

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setProgress(progressOf(clip.id));
      raf = requestAnimationFrame(tick);
    };
    const unsub = subscribe(() => undefined);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      unsub();
    };
  }, [clip.id]);

  const playing = progress !== null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDropAt}
      className={`relative flex items-center gap-1.5 overflow-hidden rounded-full pl-2 pr-1.5 ${
        playing ? "bg-primary" : "bg-lilac"
      }`}
    >
      <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground" aria-hidden />
      <button
        onClick={onPlay}
        aria-label={`Play ${clip.name}${key ? `, key ${key}` : ""}`}
        className="min-w-0 flex-1 truncate py-2.5 text-left text-xs font-bold text-foreground"
      >
        {clip.name}
      </button>
      {key && (
        <span
          aria-hidden
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-card text-[10px] font-black text-foreground"
        >
          {key}
        </span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={`Options for ${clip.name}`}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-card"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-[20px]">
          <DropdownMenuItem
            onSelect={() => {
              const next = window.prompt("Rename clip", clip.name);
              if (next && next.trim()) void onRename(next.trim().slice(0, 40));
            }}
          >
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem disabled={clip.source !== "upload"} onSelect={() => setEditingTrim(true)}>
            Edit trim
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onSelect={() => void onRemove()}>
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {playing && (
        <span
          aria-hidden
          className="absolute bottom-0 left-0 h-0.5 bg-foreground/60"
          style={{ width: `${Math.min(100, (progress ?? 0) * 100)}%` }}
        />
      )}

      {editingTrim && (
        <TrimEditor
          clip={clip}
          onClose={() => setEditingTrim(false)}
          onSave={async (patch) => {
            await onTrim(patch);
            setEditingTrim(false);
          }}
        />
      )}
    </motion.div>
  );
}

/* ------------------------- re-edit trim of an upload ---------------------- */

function TrimEditor({
  clip,
  onClose,
  onSave,
}: {
  clip: SoundboardClip;
  onClose: () => void;
  onSave: (patch: { trimStartMs: number; trimEndMs: number; gain: number }) => Promise<void>;
}) {
  const [start, setStart] = useState(clip.trim_start_ms / 1000);
  const [end, setEnd] = useState(clip.trim_end_ms / 1000);
  const [gain, setGain] = useState(clip.gain);

  return (
    <div className="absolute inset-x-0 top-full z-20 mt-1 flex flex-col gap-2 rounded-[22px] bg-card p-3 elev-2">
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Start {start.toFixed(2)}s
        <Slider value={[start]} min={0} max={Math.max(end, 8)} step={0.05} onValueChange={([v]) => setStart(v ?? 0)} />
      </label>
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        End {end.toFixed(2)}s
        <Slider
          value={[end]}
          min={0}
          max={Math.max(end, start + 8)}
          step={0.05}
          onValueChange={([v]) => setEnd(Math.min(v ?? 0, start + 8))}
        />
      </label>
      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Gain {Math.round(gain * 100)}%
        <Slider value={[gain * 100]} min={0} max={200} step={5} onValueChange={([v]) => setGain((v ?? 100) / 100)} />
      </label>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded-full border-2 border-border px-3 py-1.5 text-[11px] font-bold">
          Cancel
        </button>
        <button
          onClick={() =>
            void onSave({ trimStartMs: Math.round(start * 1000), trimEndMs: Math.round(end * 1000), gain })
          }
          className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-foreground"
        >
          Save
        </button>
      </div>
    </div>
  );
}
