import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { supabasePublishableKey, supabaseUrl } from "@/integrations/supabase/env";

/**
 * Server-local publishable client for anonymous/public Data API access.
 * New-format sb_ keys are opaque (not JWTs), so strip the default
 * Authorization bearer and send only the apikey header.
 * Call inside handlers only — env is injected at request time.
 */
export function createPublicClient() {
  const key = supabasePublishableKey()!;
  return createClient<Database>(supabaseUrl()!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}
