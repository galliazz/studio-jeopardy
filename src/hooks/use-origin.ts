import { useEffect, useState } from "react";

/** Browser origin, resolved after hydration so SSR never touches `window`. */
export function useOrigin(): string {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  return origin;
}
