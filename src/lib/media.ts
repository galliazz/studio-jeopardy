import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const IMAGE_CAP_BYTES = 5 * 1024 * 1024;
export const AUDIO_CAP_BYTES = 10 * 1024 * 1024;

export type MediaBucket = "game-media" | "avatars";

/**
 * Uploads a file into the host's own folder of a private bucket.
 * Path shape: {hostId}/{scope}/{uuid}-{safeName}. RLS enforces the first
 * folder segment equals the uploader's user id.
 */
export async function uploadMedia(
  bucket: MediaBucket,
  hostId: string,
  scope: string,
  file: File,
): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  const path = `${hostId}/${scope}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

const urlCache = new Map<string, { url: string; expiresAt: number }>();

/** Creates (and caches) a signed URL for a private object path. */
export async function signedUrl(bucket: MediaBucket, path: string): Promise<string> {
  const cached = urlCache.get(`${bucket}:${path}`);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.url;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) throw new Error(error.message);
  urlCache.set(`${bucket}:${path}`, { url: data.signedUrl, expiresAt: Date.now() + 3600_000 });
  return data.signedUrl;
}

/** React hook resolving a private storage path to a signed URL. */
export function useSignedUrl(bucket: MediaBucket, path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setUrl(null);
      return;
    }
    if (path.startsWith("http")) {
      setUrl(path);
      return;
    }
    signedUrl(bucket, path)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [bucket, path]);
  return url;
}
