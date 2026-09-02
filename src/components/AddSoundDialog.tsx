import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Square, Repeat, Check, UploadCloud, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { AUDIO_CAP_BYTES, uploadMedia } from "@/lib/media";
import { PRESETS, decodeFile, playBufferSlice, type PresetDef } from "@/lib/soundboard-engine";

const MAX_SELECTION_SEC = 8;
const ACCEPTED = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/m4a"];

export interface NewClip {
  name: string;
  source: "preset" | "upload";
  presetKey?: string | null;
  storagePath?: string | null;
  trimStartMs: number;
  trimEndMs: number;
  gain: number;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

export function AddSoundDialog({
  open,
  onOpenChange,
  hostId,
  gameId,
  addedPresetKeys,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hostId: string;
  gameId: string;
  addedPresetKeys: string[];
  onAdd: (clip: NewClip) => Promise<void> | void;
}) {
  const [tab, setTab] = useState<"presets" | "upload">("presets");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) {
      setTab("presets");
      setFile(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[32px] sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-black">
            {file ? "Trim your sound" : "Add a sound"}
          </DialogTitle>
          <DialogDescription>
            {file ? "Pick the part of the clip that plays on air." : "Choose a built-in preset or upload your own."}
          </DialogDescription>
        </DialogHeader>

        {file ? (
          <TrimStep
            file={file}
            hostId={hostId}
            gameId={gameId}
            onCancel={() => setFile(null)}
            onDone={async (clip) => {
              await onAdd(clip);
              onOpenChange(false);
            }}
          />
        ) : (
          <>
            <div role="tablist" aria-label="Add sound source" className="flex gap-2 rounded-full bg-muted p-1">
              {(["presets", "upload"] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`flex-1 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                    tab === t ? "bg-card text-foreground elev-1" : "text-muted-foreground"
                  }`}
                >
                  {t === "presets" ? "Presets" : "Upload your own"}
                </button>
              ))}
            </div>

            {tab === "presets" ? (
              <PresetList
                added={addedPresetKeys}
                onAdd={async (p) => {
                  await onAdd({ name: p.name, source: "preset", presetKey: p.key, trimStartMs: 0, trimEndMs: 0, gain: 1 });
                }}
              />
            ) : (
              <DropZone onFile={setFile} />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------- presets -------------------------------- */

function PresetList({ added, onAdd }: { added: string[]; onAdd: (p: PresetDef) => Promise<void> | void }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {PRESETS.map((p) => {
        const isAdded = added.includes(p.key);
        return (
          <li key={p.key} className="flex items-center gap-2 rounded-[22px] bg-muted px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm font-bold">{p.name}</span>
            <button
              onClick={() => p.play()}
              aria-label={`Preview ${p.name}`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-foreground elev-1 transition-transform hover:scale-105"
            >
              <Play className="h-4 w-4" />
            </button>
            <button
              disabled={isAdded}
              onClick={() => void onAdd(p)}
              aria-label={isAdded ? `${p.name} already added` : `Add ${p.name}`}
              className={`flex h-9 items-center gap-1 rounded-full px-4 text-xs font-bold elev-1 ${
                isAdded ? "cursor-not-allowed bg-muted text-muted-foreground" : "bg-primary text-foreground"
              }`}
            >
              {isAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isAdded ? "Added" : "Add"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* -------------------------------- drop zone ------------------------------- */

function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  const accept = (f: File) => {
    const okType = ACCEPTED.includes(f.type) || /\.(mp3|wav|ogg|m4a)$/i.test(f.name);
    if (!okType) {
      setError("Unsupported format — use MP3, WAV, OGG or M4A");
      return;
    }
    if (f.size > AUDIO_CAP_BYTES) {
      setError("File is too large — 10MB maximum");
      return;
    }
    setError(null);
    onFile(f);
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload an audio file"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) accept(f);
        }}
        className={`flex flex-col items-center gap-2 rounded-[28px] border-2 border-dashed p-8 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          over ? "border-primary bg-muted" : "border-border"
        }`}
      >
        <UploadCloud className="h-7 w-7 text-muted-foreground" />
        <p className="text-sm font-bold">Drop an audio file or click to browse</p>
        <p className="text-xs text-muted-foreground">MP3, WAV, OGG or M4A · up to 10MB</p>
      </div>
      {error && <p className="mt-2 text-xs font-bold text-destructive">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.wav,.ogg,.m4a,audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) accept(f);
        }}
      />
    </div>
  );
}

/* -------------------------------- trim step ------------------------------- */

function TrimStep({
  file,
  hostId,
  gameId,
  onCancel,
  onDone,
}: {
  file: File;
  hostId: string;
  gameId: string;
  onCancel: () => void;
  onDone: (clip: NewClip) => Promise<void> | void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<{ start: number; end: number; setOptions: (o: { start: number; end: number }) => void } | null>(
    null,
  );
  const bufferRef = useRef<AudioBuffer | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const [ready, setReady] = useState(false);
  const [range, setRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [duration, setDuration] = useState(0);
  const [gain, setGain] = useState(1);
  const [loop, setLoop] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [name, setName] = useState(file.name.replace(/\.[^.]+$/, "").slice(0, 40));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let destroyed = false;
    let ws: { destroy: () => void } | null = null;

    (async () => {
      const [{ default: WaveSurfer }, { default: RegionsPlugin }] = await Promise.all([
        import("wavesurfer.js"),
        import("wavesurfer.js/dist/plugins/regions.esm.js"),
      ]);
      if (destroyed || !containerRef.current) return;
      const cs = getComputedStyle(document.documentElement);
      const regions = RegionsPlugin.create();
      const instance = WaveSurfer.create({
        container: containerRef.current,
        height: 96,
        waveColor: cs.getPropertyValue("--lilac").trim() || "#ccc",
        progressColor: cs.getPropertyValue("--coral").trim() || "#999",
        cursorWidth: 0,
        interact: false,
        plugins: [regions],
      });
      ws = instance as unknown as { destroy: () => void };
      instance.loadBlob(file);

      instance.on("decode", (dur: number) => {
        const end = Math.min(dur, MAX_SELECTION_SEC);
        setDuration(dur);
        setRange({ start: 0, end });
        const region = regions.addRegion({
          start: 0,
          end,
          drag: true,
          resize: true,
          color: `color-mix(in srgb, ${cs.getPropertyValue("--coral").trim() || "#999"} 35%, transparent)`,
        });
        regionRef.current = region as unknown as typeof regionRef.current;
        setReady(true);
      });

      regions.on("region-updated", (region: { start: number; end: number; setOptions: (o: { start: number; end: number }) => void }) => {
        let { start, end } = region;
        if (end - start > MAX_SELECTION_SEC) {
          end = start + MAX_SELECTION_SEC;
          region.setOptions({ start, end });
        }
        setRange({ start, end });
      });
    })();

    void decodeFile(file)
      .then((b) => {
        bufferRef.current = b;
      })
      .catch(() => undefined);

    return () => {
      destroyed = true;
      stopRef.current?.();
      ws?.destroy();
    };
  }, [file]);

  const nudge = (edge: "start" | "end", delta: number) => {
    const region = regionRef.current;
    if (!region) return;
    let start = range.start;
    let end = range.end;
    if (edge === "start") start = Math.max(0, Math.min(end - 0.1, start + delta));
    else end = Math.min(duration, Math.max(start + 0.1, end + delta));
    if (end - start > MAX_SELECTION_SEC) {
      if (edge === "start") start = end - MAX_SELECTION_SEC;
      else end = start + MAX_SELECTION_SEC;
    }
    region.setOptions({ start, end });
    setRange({ start, end });
  };

  const preview = () => {
    stopRef.current?.();
    const buffer = bufferRef.current;
    if (!buffer) return;
    stopRef.current = playBufferSlice(buffer, range.start, range.end, gain, loop);
    setPlaying(true);
    if (!loop) window.setTimeout(() => setPlaying(false), (range.end - range.start) * 1000);
  };

  const stop = () => {
    stopRef.current?.();
    stopRef.current = null;
    setPlaying(false);
  };

  const valid = ready && range.end - range.start >= 0.1 && name.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div ref={containerRef} className="overflow-hidden rounded-[24px] bg-muted p-2" />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
        <span className="text-muted-foreground">
          Start {fmt(range.start)} · End {fmt(range.end)}
        </span>
        <span>Selection {(range.end - range.start).toFixed(2)}s / {MAX_SELECTION_SEC}s max</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={playing ? stop : preview}
          aria-label={playing ? "Stop preview" : "Play selection"}
          className="flex h-10 items-center gap-2 rounded-full bg-card px-4 text-xs font-bold elev-1 transition-transform hover:scale-105"
        >
          {playing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />} {playing ? "Stop" : "Play selection"}
        </button>
        <button
          onClick={() => setLoop((v) => !v)}
          aria-pressed={loop}
          aria-label="Loop preview"
          className={`flex h-10 items-center gap-2 rounded-full px-4 text-xs font-bold elev-1 ${
            loop ? "bg-primary text-foreground" : "bg-card"
          }`}
        >
          <Repeat className="h-4 w-4" /> Loop
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => nudge("start", -0.1)}
            className="h-10 rounded-full bg-card px-3 text-xs font-bold elev-1"
            aria-label="Move selection start earlier"
          >
            ⟨ start
          </button>
          <button
            onClick={() => nudge("start", 0.1)}
            className="h-10 rounded-full bg-card px-3 text-xs font-bold elev-1"
            aria-label="Move selection start later"
          >
            start ⟩
          </button>
          <button
            onClick={() => nudge("end", -0.1)}
            className="h-10 rounded-full bg-card px-3 text-xs font-bold elev-1"
            aria-label="Move selection end earlier"
          >
            ⟨ end
          </button>
          <button
            onClick={() => nudge("end", 0.1)}
            className="h-10 rounded-full bg-card px-3 text-xs font-bold elev-1"
            aria-label="Move selection end later"
          >
            end ⟩
          </button>
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gain {Math.round(gain * 100)}%</span>
        <Slider value={[gain * 100]} min={0} max={200} step={5} onValueChange={([v]) => setGain((v ?? 100) / 100)} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 40))}
          className="h-11 rounded-full bg-muted px-4 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <div className="flex justify-end gap-2">
        <button
          onClick={() => {
            stop();
            onCancel();
          }}
          className="h-11 rounded-full border-2 border-border px-5 text-sm font-bold"
        >
          Cancel
        </button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          disabled={!valid || saving}
          onClick={async () => {
            setSaving(true);
            stop();
            try {
              const path = await uploadMedia("game-media", hostId, `${gameId}/soundboard`, file);
              await onDone({
                name: name.trim(),
                source: "upload",
                storagePath: path,
                trimStartMs: Math.round(range.start * 1000),
                trimEndMs: Math.round(range.end * 1000),
                gain,
              });
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Upload failed");
            } finally {
              setSaving(false);
            }
          }}
          className="h-11 rounded-full bg-primary px-5 text-sm font-bold text-foreground elev-1 disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add to soundboard"}
        </motion.button>
      </div>
    </div>
  );
}
