// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Deployment target: Node.js (Render), not Cloudflare Workers.
// Nitro's `node-server` preset emits `.output/server/index.mjs`, which listens on
// process.env.PORT. Inside the Lovable sandbox the preview build stays on its own
// managed target; this preset applies to external builds (Render/CI).
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "node-server",
    output: {
      dir: ".output",
      serverDir: ".output/server",
      publicDir: ".output/public",
    },
  },
  vite: {
    build: {
      chunkSizeWarningLimit: 1600,
    },
    preview: {
      allowedHosts: ["veriai-insight.onrender.com"],
    },
  },
});
