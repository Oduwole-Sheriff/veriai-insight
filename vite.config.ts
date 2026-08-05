// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
// export default defineConfig({
//   tanstackStart: {
//     // Make the server entry unambiguous so Nitro/Vite won't resolve to ./server.node.js
//     server: { entry: "./src/server.ts" },
//   },
//   vite: {
//     preview: {
//       allowedHosts: ["veriai-insight.onrender.com"],
//     },
//   },
// });
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  // ADD THIS SECTION BELOW
  vite: {
    build: {
      chunkSizeWarningLimit: 1600,
    },
  },
});
