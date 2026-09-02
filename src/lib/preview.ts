// Lovable preview surfaces are unlisted, so the app can be browsed there
// without signing in. Real deployments keep the normal auth gate.
export function isPreviewSurface(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return true;
  const zone =
    /(^|\.)(lovableproject\.com|lovableproject-dev\.com|lovable\.app|gpt-eng\.com|gptengineer\.run)$/i;
  return zone.test(host) && /^(id-preview|preview)/i.test(host);
}
