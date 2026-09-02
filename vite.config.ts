// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    // Pre-bundle the Radix primitives we use so Vite never re-optimizes deps
    // mid-session (which reloads React and throws "Cannot read properties of
    // null (reading 'useRef'/'useMemo')" on first render of a new dialog/menu).
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "@radix-ui/react-dialog",
        "@radix-ui/react-alert-dialog",
        "@radix-ui/react-dropdown-menu",
        "@radix-ui/react-popover",
        "@radix-ui/react-tooltip",
        "@radix-ui/react-select",
        "@radix-ui/react-slider",
        "@radix-ui/react-switch",
      ],
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
