import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Lovable preview surfaces are unlisted, so allow browsing the app there
// without a login. Real deployments still require a session.
function isPreviewSurface() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return true;
  return /(^|\.)(lovableproject\.com|lovableproject-dev\.com|lovable\.app|gpt-eng\.com|gptengineer\.run)$/i.test(
    host,
  ) && /^(id-preview|preview)/i.test(host);
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      if (isPreviewSurface()) return { user: null };
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
