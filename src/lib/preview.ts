// Lovable preview surfaces are unlisted, so the app can be browsed there
// without signing in. Real deployments keep the normal auth gate.
export function isPreviewSurface(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return true;
  // Any lovableproject.com sandbox host is a preview surface; on lovable.app
  // only the explicit preview subdomains are.
  if (/(^|\.)(lovableproject\.com|lovableproject-dev\.com|gpt-eng\.com|gptengineer\.run)$/i.test(host)) return true;
  return /(^|\.)lovable\.app$/i.test(host) && /^(id-preview|preview)/i.test(host);
}
