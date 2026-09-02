import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import { generateJoinCode } from "@/lib/join-code";
import { createEmptyBoard, seedDemoGame } from "@/lib/games.server";
import { DEFAULT_THEME } from "@/lib/types";

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** First-run bootstrap: ensures a profile exists (seeding a demo game for brand-new hosts) and returns studio data. */
export const bootstrapStudio = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    let { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (!profile) {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email ?? "host";
      const username = email.split("@")[0]!.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 24) || "host";
      const { data: created, error } = await supabase
        .from("profiles")
        .insert({ id: userId, username })
        .select()
        .single();
      if (error) throw new Error(error.message);
      profile = created;
      await seedDemoGame(supabase, userId);
    }
    const { data: games } = await supabase.from("games").select("*").order("updated_at", { ascending: false });
    const list = games ?? [];

    // Per-board completeness used by the Studio cards (counts + a 5x5 ready map).
    const { data: cats } = list.length
      ? await supabase
          .from("categories")
          .select("id, game_id, position")
          .in("game_id", list.map((g) => g.id))
      : { data: [] };
    const catList = cats ?? [];
    const { data: tiles } = catList.length
      ? await supabase
          .from("tiles")
          .select("category_id, row_index, question, answer")
          .in("category_id", catList.map((c) => c.id))
      : { data: [] };
    const catMeta = new Map(catList.map((c) => [c.id, { gameId: c.game_id, position: c.position }]));
    const stats: Record<string, { total: number; ready: number; grid: boolean[][] }> = {};
    for (const g of list) {
      stats[g.id] = { total: 0, ready: 0, grid: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => false)) };
    }
    for (const t of tiles ?? []) {
      const meta = catMeta.get(t.category_id);
      if (!meta) continue;
      const s = stats[meta.gameId];
      if (!s) continue;
      const ok = Boolean(t.question?.trim()) && Boolean(t.answer?.trim());
      s.total += 1;
      if (ok) s.ready += 1;
      const col = s.grid[meta.position];
      if (col && t.row_index >= 0 && t.row_index < 5) col[t.row_index] = ok;
    }
    return { profile, games: list, stats };
  });

export const createGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ title: z.string().trim().min(1).max(80) }).parse(data))
  .handler(async ({ context, data }) => {
    return createEmptyBoard(context.supabase, context.userId, data.title);
  });

export const getGameBoard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ gameId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: game, error } = await supabase.from("games").select("*").eq("id", data.gameId).single();
    if (error) throw new Error(error.message);
    const { data: categories } = await supabase
      .from("categories")
      .select("*")
      .eq("game_id", game.id)
      .order("position");
    const catIds = (categories ?? []).map((c) => c.id);
    const { data: tiles } = catIds.length
      ? await supabase.from("tiles").select("*").in("category_id", catIds)
      : { data: [] };
    return { game, categories: categories ?? [], tiles: tiles ?? [] };
  });

export const updateGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        gameId: z.string().uuid(),
        title: z.string().trim().min(1).max(80).optional(),
        theme: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const patch: Database["public"]["Tables"]["games"]["Update"] = {
      updated_at: new Date().toISOString(),
    };
    if (data.title !== undefined) patch.title = data.title;
    if (data.theme !== undefined) patch.theme = { ...DEFAULT_THEME, ...data.theme } as unknown as Json;
    const { error } = await context.supabase.from("games").update(patch).eq("id", data.gameId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateCategoryTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ categoryId: z.string().uuid(), title: z.string().trim().max(60) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("categories")
      .update({ title: data.title || "Untitled" })
      .eq("id", data.categoryId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateTile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        tileId: z.string().uuid(),
        question: z.string().max(4000).optional(),
        answer: z.string().max(2000).optional(),
        hint: z.string().max(500).nullable().optional(),
        points: z.number().int().min(0).max(100000).optional(),
        image_url: z.string().max(500).nullable().optional(),
        audio_url: z.string().max(500).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { tileId, ...raw } = data;
    const patch = stripUndefined(raw) as Database["public"]["Tables"]["tiles"]["Update"];
    const { error } = await context.supabase.from("tiles").update(patch).eq("id", tileId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Applies a new per-row point ladder to every tile of the game. */
export const setRowPoints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ gameId: z.string().uuid(), rowPoints: z.array(z.number().int().min(0).max(100000)).length(5) })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: game, error: gErr } = await supabase.from("games").select("*").eq("id", data.gameId).single();
    if (gErr) throw new Error(gErr.message);
    const { data: categories } = await supabase.from("categories").select("id").eq("game_id", data.gameId);
    const catIds = (categories ?? []).map((c) => c.id);
    for (let row = 0; row < 5; row++) {
      const { error } = await supabase
        .from("tiles")
        .update({ points: data.rowPoints[row]! })
        .in("category_id", catIds)
        .eq("row_index", row);
      if (error) throw new Error(error.message);
    }
    const theme = { ...DEFAULT_THEME, ...(game.theme as Record<string, unknown>), rowPoints: data.rowPoints };
    const { error } = await supabase
      .from("games")
      .update({ theme: theme as unknown as Json, updated_at: new Date().toISOString() })
      .eq("id", data.gameId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const duplicateGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ gameId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: game, error } = await supabase.from("games").select("*").eq("id", data.gameId).single();
    if (error) throw new Error(error.message);
    const { data: categories } = await supabase.from("categories").select("*").eq("game_id", game.id).order("position");
    const catIds = (categories ?? []).map((c) => c.id);
    const { data: tiles } = catIds.length
      ? await supabase.from("tiles").select("*").in("category_id", catIds)
      : { data: [] };

    const { data: copy, error: cErr } = await supabase
      .from("games")
      .insert({
        host_id: context.userId,
        title: `${game.title} (Copy)`,
        join_code: generateJoinCode(),
        theme: game.theme,
      })
      .select()
      .single();
    if (cErr) throw new Error(cErr.message);

    for (const cat of categories ?? []) {
      const { data: newCat, error: nErr } = await supabase
        .from("categories")
        .insert({ game_id: copy.id, title: cat.title, position: cat.position })
        .select()
        .single();
      if (nErr) throw new Error(nErr.message);
      const catTiles = (tiles ?? [])
        .filter((t) => t.category_id === cat.id)
        .map((t) => ({
          category_id: newCat.id,
          row_index: t.row_index,
          points: t.points,
          question: t.question,
          answer: t.answer,
          hint: t.hint,
          image_url: t.image_url,
          audio_url: t.audio_url,
        }));
      if (catTiles.length) {
        const { error: tErr } = await supabase.from("tiles").insert(catTiles);
        if (tErr) throw new Error(tErr.message);
      }
    }
    return copy;
  });

export const deleteGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ gameId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("games").delete().eq("id", data.gameId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const exportSchema = z.object({
  version: z.literal(1),
  title: z.string().min(1).max(80),
  theme: z.record(z.string(), z.unknown()).optional(),
  categories: z
    .array(
      z.object({
        title: z.string().max(60),
        tiles: z
          .array(
            z.object({
              row_index: z.number().int().min(0).max(4),
              points: z.number().int().min(0).max(100000),
              question: z.string().max(4000),
              answer: z.string().max(2000),
              hint: z.string().max(500).nullable().optional(),
            }),
          )
          .max(5),
      }),
    )
    .length(5),
});

export const exportGame = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ gameId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: game, error } = await supabase.from("games").select("*").eq("id", data.gameId).single();
    if (error) throw new Error(error.message);
    const { data: categories } = await supabase.from("categories").select("*").eq("game_id", game.id).order("position");
    const catIds = (categories ?? []).map((c) => c.id);
    const { data: tiles } = catIds.length
      ? await supabase.from("tiles").select("*").in("category_id", catIds)
      : { data: [] };
    return {
      version: 1 as const,
      title: game.title,
      theme: game.theme as Record<string, Json>,
      categories: (categories ?? []).map((cat) => ({
        title: cat.title,
        tiles: (tiles ?? [])
          .filter((t) => t.category_id === cat.id)
          .sort((a, b) => a.row_index - b.row_index)
          .map((t) => ({
            row_index: t.row_index,
            points: t.points,
            question: t.question,
            answer: t.answer,
            hint: t.hint,
          })),
      })),
    };
  });

export const importGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => exportSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: game, error } = await supabase
      .from("games")
      .insert({
        host_id: userId,
        title: data.title,
        join_code: generateJoinCode(),
        theme: { ...DEFAULT_THEME, ...(data.theme ?? {}) } as unknown as Json,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    for (let i = 0; i < data.categories.length; i++) {
      const cat = data.categories[i]!;
      const { data: newCat, error: cErr } = await supabase
        .from("categories")
        .insert({ game_id: game.id, title: cat.title, position: i })
        .select()
        .single();
      if (cErr) throw new Error(cErr.message);
      if (cat.tiles.length) {
        const { error: tErr } = await supabase.from("tiles").insert(
          cat.tiles.map((t) => ({
            category_id: newCat.id,
            row_index: t.row_index,
            points: t.points,
            question: t.question,
            answer: t.answer,
            hint: t.hint ?? null,
          })),
        );
        if (tErr) throw new Error(tErr.message);
      }
    }
    return game;
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        username: z.string().trim().min(2).max(24).optional(),
        avatar_url: z.string().max(500).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const patch = stripUndefined(data) as Database["public"]["Tables"]["profiles"]["Update"];
    const { error } = await context.supabase.from("profiles").update(patch).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
