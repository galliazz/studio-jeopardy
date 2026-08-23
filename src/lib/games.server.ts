import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { generateJoinCode } from "@/lib/join-code";
import { DEFAULT_THEME } from "@/lib/types";

type Client = SupabaseClient<Database>;

export async function createEmptyBoard(client: Client, hostId: string, title: string) {
  const { data: game, error } = await client
    .from("games")
    .insert({ host_id: hostId, title, join_code: generateJoinCode(), theme: DEFAULT_THEME })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const categories = [];
  for (let i = 0; i < 5; i++) {
    const { data: cat, error: catErr } = await client
      .from("categories")
      .insert({ game_id: game.id, title: `Category ${i + 1}`, position: i })
      .select()
      .single();
    if (catErr) throw new Error(catErr.message);
    categories.push(cat);
  }

  const tiles = categories.flatMap((cat) =>
    DEFAULT_THEME.rowPoints.map((points, row) => ({
      category_id: cat.id,
      row_index: row,
      points,
      question: "",
      answer: "",
    })),
  );
  const { error: tileErr } = await client.from("tiles").insert(tiles);
  if (tileErr) throw new Error(tileErr.message);
  return game;
}

const DEMO: { title: string; tiles: [string, string][] }[] = [
  {
    title: "World Geography",
    tiles: [
      ["This is the largest hot desert in the world.", "What is the Sahara?"],
      ["This European country is shaped like a boot.", "What is Italy?"],
      ["The Strait of Gibraltar separates Spain from this African country.", "What is Morocco?"],
      ["This is the only country crossed by both the Equator and the Tropic of Capricorn.", "What is Brazil?"],
      ["Nouakchott is the capital of this Northwest African country.", "What is Mauritania?"],
    ],
  },
  {
    title: "Science Lab",
    tiles: [
      ["H₂O is the chemical formula for this substance.", "What is water?"],
      ["This planet is known as the Red Planet.", "What is Mars?"],
      ["This force keeps planets in orbit around the Sun.", "What is gravity?"],
      ["This organelle is known as the powerhouse of the cell.", "What is the mitochondria?"],
      ["This scientist proposed the theory of general relativity.", "Who is Albert Einstein?"],
    ],
  },
  {
    title: "Pop Culture",
    tiles: [
      ["This boy wizard is famous for his lightning-shaped scar.", "Who is Harry Potter?"],
      ["This 2023 blockbuster painted movie theaters pink.", "What is Barbie?"],
      ["This artist released the albums “1989” and “Midnights”.", "Who is Taylor Swift?"],
      ["This streaming series features a dimension called the Upside Down.", "What is Stranger Things?"],
      ["This green-clad brother of Mario stars in “Luigi's Mansion”.", "Who is Luigi?"],
    ],
  },
  {
    title: "History Buffs",
    tiles: [
      ["This document, signed in 1776, declared American independence.", "What is the Declaration of Independence?"],
      ["This ancient civilization built the pyramids of Giza.", "Who are the Egyptians?"],
      ["This wall fell in 1989, symbolizing the end of the Cold War.", "What is the Berlin Wall?"],
      ["This “unsinkable” ship sank in 1912 on its maiden voyage.", "What is the Titanic?"],
      ["This vast empire was ruled by Genghis Khan.", "What is the Mongol Empire?"],
    ],
  },
  {
    title: "Food & Drink",
    tiles: [
      ["This yellow fruit is famously rich in potassium.", "What is a banana?"],
      ["Sushi traditionally wraps fish and rice in this dried seaweed.", "What is nori?"],
      ["This Italian dish layers pasta, sauce, and cheese.", "What is lasagna?"],
      ["Worth more than gold by weight, this spice comes from crocus flowers.", "What is saffron?"],
      ["This French term means “everything in its place” in the kitchen.", "What is mise en place?"],
    ],
  },
];

export async function seedDemoGame(client: Client, hostId: string) {
  const { data: game, error } = await client
    .from("games")
    .insert({
      host_id: hostId,
      title: "Demo: Friday Night Trivia",
      join_code: generateJoinCode(),
      theme: DEFAULT_THEME,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  for (let i = 0; i < DEMO.length; i++) {
    const cat = DEMO[i]!;
    const { data: category, error: catErr } = await client
      .from("categories")
      .insert({ game_id: game.id, title: cat.title, position: i })
      .select()
      .single();
    if (catErr) throw new Error(catErr.message);
    const tiles = cat.tiles.map(([question, answer], row) => ({
      category_id: category.id,
      row_index: row,
      points: DEFAULT_THEME.rowPoints[row]!,
      question,
      answer,
    }));
    const { error: tileErr } = await client.from("tiles").insert(tiles);
    if (tileErr) throw new Error(tileErr.message);
  }
  return game;
}
