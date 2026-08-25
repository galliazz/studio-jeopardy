const TIMER_SECONDS = 15;

export function timerEnd(): string {
  return new Date(Date.now() + TIMER_SECONDS * 1000).toISOString();
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