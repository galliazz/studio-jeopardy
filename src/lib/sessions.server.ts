import { timerEndsAt } from "@/lib/game-rules";

export function timerEnd(): string {
  return timerEndsAt(Date.now());
}

export function shuffleIds(ids: string[]): string[] {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = arr[i];
    const picked = arr[j];
    if (current === undefined || picked === undefined) continue;
    arr[i] = picked;
    arr[j] = current;
  }
  return arr;
}
