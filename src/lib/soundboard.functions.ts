import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const MAX_CLIPS = 20;

const clipInput = z.object({
  gameId: z.string().uuid(),
  name: z.string().trim().min(1).max(40),
  source: z.enum(["preset", "upload"]),
  presetKey: z.string().max(40).nullable().optional(),
  storagePath: z.string().max(400).nullable().optional(),
  trimStartMs: z.number().int().min(0).default(0),
  trimEndMs: z.number().int().min(0).default(0),
  gain: z.number().min(0).max(4).default(1),
});

/** All soundboard clips for a game, ordered by position. */
export const listClips = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ gameId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: clips, error } = await context.supabase
      .from("soundboard_clips")
      .select("*")
      .eq("game_id", data.gameId)
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    return clips ?? [];
  });

/** Appends a clip at the end of the board (max 20). */
export const addClip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => clipInput.parse(data))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { count } = await supabase
      .from("soundboard_clips")
      .select("id", { count: "exact", head: true })
      .eq("game_id", data.gameId);
    if ((count ?? 0) >= MAX_CLIPS) throw new Error(`Soundboard is full (${MAX_CLIPS} clips max)`);

    const { data: clip, error } = await supabase
      .from("soundboard_clips")
      .insert({
        game_id: data.gameId,
        host_id: userId,
        name: data.name,
        position: count ?? 0,
        source: data.source,
        preset_key: data.presetKey ?? null,
        storage_path: data.storagePath ?? null,
        trim_start_ms: data.trimStartMs,
        trim_end_ms: data.trimEndMs,
        gain: data.gain,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return clip;
  });

/** Renames a clip or updates its trim / gain. */
export const updateClip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        clipId: z.string().uuid(),
        name: z.string().trim().min(1).max(40).optional(),
        trimStartMs: z.number().int().min(0).optional(),
        trimEndMs: z.number().int().min(0).optional(),
        gain: z.number().min(0).max(4).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const patch: {
      name?: string;
      trim_start_ms?: number;
      trim_end_ms?: number;
      gain?: number;
    } = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.trimStartMs !== undefined) patch.trim_start_ms = data.trimStartMs;
    if (data.trimEndMs !== undefined) patch.trim_end_ms = data.trimEndMs;
    if (data.gain !== undefined) patch.gain = data.gain;
    const { error } = await context.supabase.from("soundboard_clips").update(patch).eq("id", data.clipId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Removes a clip and compacts the remaining positions. */
export const removeClip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ clipId: z.string().uuid(), gameId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error } = await supabase.from("soundboard_clips").delete().eq("id", data.clipId);
    if (error) throw new Error(error.message);
    const { data: rest } = await supabase
      .from("soundboard_clips")
      .select("id")
      .eq("game_id", data.gameId)
      .order("position", { ascending: true });
    await Promise.all(
      (rest ?? []).map((c, i) => supabase.from("soundboard_clips").update({ position: i }).eq("id", c.id)),
    );
    return { ok: true };
  });

/** Persists a new clip order (number keys follow position). */
export const reorderClips = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ gameId: z.string().uuid(), ids: z.array(z.string().uuid()).max(MAX_CLIPS) }).parse(data))
  .handler(async ({ context, data }) => {
    await Promise.all(
      data.ids.map((id, i) =>
        context.supabase.from("soundboard_clips").update({ position: i }).eq("id", id).eq("game_id", data.gameId),
      ),
    );
    return { ok: true };
  });
