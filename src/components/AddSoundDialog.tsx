import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Square, Repeat, Check, UploadCloud, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { localizeError, useT } from "@/i18n";
import { AUDIO_CAP_BYTES, uploadMedia } from "@/lib/media";
import { PRESETS, decodeFile, playBufferSlice, type PresetDef } from "@/lib/soundboard-engine";

const MAX_SELECTION_SEC = 8;
const ACCEPTED = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
];

export interface NewClip {
  /** Il nome salvato. Vuoto per i suoni pronti, che si traducono a schermo. */
  name: string;
  /** Solo per il messaggio di conferma: cosa ha appena aggiunto l'host. */
  label?: string;
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
  const t = useT();
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
            {file ? t("sound.trim.title") : t("sound.add.title")}
          </DialogTitle>
          <DialogDescription>
            {file ? t("sound.trim.description") : t("sound.add.description")}
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
            <div
              role="tablist"
              aria-label={t("sound.add.sourceTabs")}
              className="flex gap-2 rounded-full bg-muted p-1"
            >
              {(["presets", "upload"] as const).map((id) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`flex-1 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                    tab === id ? "bg-card text-foreground elev-1" : "text-muted-foreground"
                  }`}
                >
                  {id === "presets" ? t("sound.add.presetsTab") : t("sound.add.uploadTab")}
                </button>
              ))}
            </div>

            {tab === "presets" ? (
              <PresetList
                added={addedPresetKeys}
                onAdd={async (p) => {
                  await onAdd({
                    // Vuoto apposta: il nome lo dà il preset, tradotto a schermo.
                    name: "",
                    label: t(p.nameKey),
                    source: "preset",
                    presetKey: p.key,
                    trimStartMs: 0,
                    trimEndMs: 0,
                    gain: 1,
                  });
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

function PresetList({
  added,
  onAdd,
}: {
  added: string[];
  onAdd: (p: PresetDef) => Promise<void> | void;
}) {
  const t = useT();
  return (
    <ul className="flex flex-col gap-1.5">
      {PRESETS.map((p) => {
        const isAdded = added.includes(p.key);
        const name = t(p.nameKey);
        return (
          <li key={p.key} className="flex items-center gap-2 rounded-[22px] bg-muted px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm font-bold">{name}</span>
            <button
              onClick={() => p.play()}
              aria-label={t("sound.add.preview", { name })}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-foreground elev-1 transition-transform hover:scale-105"
            >
              <Play className="h-4 w-4" />
            </button>
            <button
              disabled={isAdded}
              onClick={() => void onAdd(p)}
              aria-label={
                isAdded ? t("sound.add.alreadyAdded", { name }) : t("sound.add.addNamed", { name })
              }
              className={`flex h-9 items-center gap-1 rounded-full px-4 text-xs font-bold elev-1 ${
                isAdded
                  ? "cursor-not-allowed bg-muted text-muted-foreground"
                  : "bg-primary text-foreground"
              }`}
            >
              {isAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isAdded ? t("sound.add.added") : t("common.add")}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* -------------------------------- drop zone ------------------------------- */

function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<"unsupported" | "tooLarge" | null>(null);
  const [over, setOver] = useState(false);

  const accept = (f: File) => {
    const okType = ACCEPTED.includes(f.type) || /\.(mp3|wav|ogg|m4a)$/i.test(f.name);
    if (!okType) {
      setError("unsupported");
      return;
    }
    if (f.size > AUDIO_CAP_BYTES) {
      setError("tooLarge");
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
        aria-label={t("sound.upload.dropZone")}
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
        <p className="text-sm font-bold">{t("sound.upload.dropTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("sound.upload.dropHint")}</p>
      </div>
      {error && (
        <p className="mt-2 text-xs font-bold text-destructive">
          {error === "unsupported" ? t("sound.upload.unsupported") : t("sound.upload.tooLarge")}
        </p>
      )}
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
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<{
    start: number;
    end: number;
    setOptions: (o: { start: number; end: number }) => void;
  } | null>(null);
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

      regions.on(
        "region-updated",
        (region: {
          start: number;
          end: number;
          setOptions: (o: { start: number; end: number }) => void;
        }) => {
          const { start } = region;
          let { end } = region;
          if (end - start > MAX_SELECTION_SEC) {
            end = start + MAX_SELECTION_SEC;
            region.setOptions({ start, end });
          }
          setRange({ start, end });
        },
      );
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
      {/* La forma d'onda è un asse del tempo: resta da sinistra a destra anche in arabo. */}
      <div ref={containerRef} dir="ltr" className="overflow-hidden rounded-[24px] bg-muted p-2" />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
        <span className="text-muted-foreground">
          {t("sound.trim.range", { start: fmt(range.start), end: fmt(range.end) })}
        </span>
        <span>
          {t("sound.trim.selection", {
            length: (range.end - range.start).toFixed(2),
            max: MAX_SELECTION_SEC,
          })}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={playing ? stop : preview}
          aria-label={playing ? t("sound.trim.stopPreview") : t("sound.trim.playSelection")}
          className="flex h-10 items-center gap-2 rounded-full bg-card px-4 text-xs font-bold elev-1 transition-transform hover:scale-105"
        >
          {playing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}{" "}
          {playing ? t("sound.trim.stop") : t("sound.trim.playSelection")}
        </button>
        <button
          onClick={() => setLoop((v) => !v)}
          aria-pressed={loop}
          aria-label={t("sound.trim.loopPreview")}
          className={`flex h-10 items-center gap-2 rounded-full px-4 text-xs font-bold elev-1 ${
            loop ? "bg-primary text-foreground" : "bg-card"
          }`}
        >
          <Repeat className="h-4 w-4" /> {t("sound.trim.loop")}
        </button>
        {/* Stesso verso della forma d'onda: "prima" è a sinistra in ogni lingua. */}
        <div dir="ltr" className="flex items-center gap-1">
          <button
            onClick={() => nudge("start", -0.1)}
            className="h-10 rounded-full bg-card px-3 text-xs font-bold elev-1"
            aria-label={t("sound.trim.startEarlier")}
          >
            {t("sound.trim.startEarlierShort")}
          </button>
          <button
            onClick={() => nudge("start", 0.1)}
            className="h-10 rounded-full bg-card px-3 text-xs font-bold elev-1"
            aria-label={t("sound.trim.startLater")}
          >
            {t("sound.trim.startLaterShort")}
          </button>
          <button
            onClick={() => nudge("end", -0.1)}
            className="h-10 rounded-full bg-card px-3 text-xs font-bold elev-1"
            aria-label={t("sound.trim.endEarlier")}
          >
            {t("sound.trim.endEarlierShort")}
          </button>
          <button
            onClick={() => nudge("end", 0.1)}
            className="h-10 rounded-full bg-card px-3 text-xs font-bold elev-1"
            aria-label={t("sound.trim.endLater")}
          >
            {t("sound.trim.endLaterShort")}
          </button>
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("sound.trim.gain", { percent: Math.round(gain * 100) })}
        </span>
        <Slider
          value={[gain * 100]}
          min={0}
          max={200}
          step={5}
          onValueChange={([v]) => setGain((v ?? 100) / 100)}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("sound.trim.name")}
        </span>
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
          {t("common.cancel")}
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
              toast.error(localizeError(err, "sound.upload.failed"));
            } finally {
              setSaving(false);
            }
          }}
          className="h-11 rounded-full bg-primary px-5 text-sm font-bold text-foreground elev-1 disabled:opacity-50"
        >
          {saving ? t("sound.trim.adding") : t("sound.trim.addToSoundboard")}
        </motion.button>
      </div>
    </div>
  );
}
