import { createServerFn } from "@tanstack/react-start";

/**
 * Authoritative clock reading. Called once per connect so every surface can
 * measure its own drift (server_time_offset_ms) against the session timeline.
 */
export const getServerTime = createServerFn({ method: "GET" }).handler(async () => ({
  now: Date.now(),
}));
