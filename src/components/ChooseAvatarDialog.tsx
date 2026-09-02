import { useEffect, useRef, useState } from "react";
import { Check, ImagePlus, Upload } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { updateProfile } from "@/lib/games.functions";
import { IMAGE_CAP_BYTES, uploadMedia } from "@/lib/media";
import { AVATAR_PRESETS, setAvatarValue, type AvatarValue } from "@/lib/avatar";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const BOX = 240;
const OUT = 256;

/** 1:1 circular crop with pan + zoom over the picked file. */
function CropStep({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    const image = new Image();
    image.onload = () => setImg(image);
    image.src = u;
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const baseScale = img ? BOX / Math.min(img.width, img.height) : 1;

  const confirm = () => {
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const f = OUT / BOX;
    const w = img.width * baseScale * zoom * f;
    const h = img.height * baseScale * zoom * f;
    ctx.drawImage(img, OUT / 2 + pos.x * f - w / 2, OUT / 2 + pos.y * f - h / 2, w, h);
    canvas.toBlob((b) => b && onConfirm(b), "image/jpeg", 0.9);
  };

  return (
    <div className="space-y-4">
      <div
        className="relative mx-auto touch-none overflow-hidden rounded-full border border-border bg-muted"
        style={{ width: BOX, height: BOX }}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setPos({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y });
        }}
        onPointerUp={() => (drag.current = null)}
      >
        {url && (
          <img
            src={url}
            alt="Crop preview"
            draggable={false}
            className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
            style={{
              width: img ? img.width * baseScale * zoom : BOX,
              height: img ? img.height * baseScale * zoom : BOX,
              transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
            }}
          />
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-muted-foreground">Zoom</span>
        <Slider value={[zoom * 100]} min={100} max={300} step={1} onValueChange={([v]) => setZoom((v ?? 100) / 100)} />
      </div>
      <p className="text-center text-xs text-muted-foreground">Drag the photo to reposition it.</p>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="h-11 rounded-full border border-border px-5 text-sm font-bold text-foreground">
          Back
        </button>
        <button onClick={confirm} className="h-11 rounded-full bg-coral px-6 text-sm font-black text-foreground elev-1">
          Use photo
        </button>
      </div>
    </div>
  );
}

export function ChooseAvatarDialog({
  current,
  initial,
  onClose,
}: {
  current: AvatarValue;
  initial: string;
  onClose: () => void;
}) {
  const [choice, setChoice] = useState<AvatarValue>(current);
  const [pending, setPending] = useState<File | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(
    current && !current.startsWith("preset:") ? current : null,
  );
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = (file: File | undefined | null) => {
    setError(null);
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setError("Use a JPG, PNG or WebP image");
      return;
    }
    if (file.size > IMAGE_CAP_BYTES) {
      setError("That image is larger than 5MB");
      return;
    }
    setPending(file);
  };

  const confirmCrop = async (blob: Blob) => {
    setPending(null);
    setBusy(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) throw new Error("Sign in to upload a photo");
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const path = await uploadMedia("avatars", uid, "profile", file);
      setUploadedPath(path);
      setUploadedPreview(URL.createObjectURL(blob));
      setChoice(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!choice) return;
    setBusy(true);
    try {
      await updateProfile({ data: { avatar_url: choice } });
      setAvatarValue(choice);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save avatar");
      setBusy(false);
    }
  };

  const ring = (selected: boolean) =>
    selected ? "ring-2 ring-ring ring-offset-2 ring-offset-card" : "";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90svh] w-full overflow-y-auto rounded-[32px] p-6 sm:max-w-[560px]">
        <DialogTitle className="font-display text-2xl font-black text-foreground">Choose avatar</DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          Pick a preset or upload your own photo.
        </DialogDescription>

        {pending ? (
          <CropStep file={pending} onCancel={() => setPending(null)} onConfirm={(b) => void confirmCrop(b)} />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {AVATAR_PRESETS.map((p) => {
                const value = `preset:${p.id}`;
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-label={p.label}
                    aria-pressed={choice === value}
                    onClick={() => setChoice(value)}
                    className={`flex aspect-square w-full items-center justify-center rounded-full text-foreground outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring ${p.bg} ${ring(choice === value)}`}
                  >
                    <Icon className="h-6 w-6" />
                  </button>
                );
              })}
            </div>

            <div className="border-t border-border pt-4">
              <p className="mb-2 text-sm font-bold text-foreground">Upload photo</p>
              <div className="flex items-center gap-4">
                {uploadedPath && (
                  <button
                    type="button"
                    aria-label="Your uploaded photo"
                    aria-pressed={choice === uploadedPath}
                    onClick={() => setChoice(uploadedPath)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring ${ring(choice === uploadedPath)}`}
                  >
                    {uploadedPreview ? (
                      <img src={uploadedPreview} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center font-display font-black">
                        {initial}
                      </span>
                    )}
                  </button>
                )}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Upload a photo"
                  onClick={() => fileRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileRef.current?.click();
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    pick(e.dataTransfer.files?.[0]);
                  }}
                  className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-[28px] border-2 border-dashed p-5 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                    dragOver ? "border-ink-accent bg-muted" : "border-border"
                  }`}
                >
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">Drop an image or click to browse</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG or WebP · up to 5MB</p>
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => pick(e.target.files?.[0])}
              />
              {error && <p className="mt-2 text-xs font-semibold text-destructive">{error}</p>}
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <button
                onClick={onClose}
                className="h-12 rounded-full border border-border px-6 text-sm font-bold text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => void save()}
                disabled={!choice || busy}
                className="flex h-12 items-center gap-2 rounded-full bg-coral px-7 font-display text-base font-black text-foreground elev-2 transition-transform hover:scale-105 disabled:pointer-events-none disabled:opacity-40"
              >
                {busy ? <Upload className="h-4 w-4 animate-pulse" /> : <Check className="h-4 w-4" />}
                Select
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
