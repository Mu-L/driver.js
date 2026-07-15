import path from "path";
import { defineConfig } from "vite";

// The hints entry, built standalone and merged into dist/ by the postbuild.
//
// Hints share the popover primitive with the tour, so the two entries could
// import a common chunk instead. They deliberately don't: a shared chunk would
// make the tour bundle — which every existing user loads — depend on a second
// file and cost them bytes for a feature they may never use. Standing alone
// keeps the tour bundle byte for byte what it is today, and lets hints be used
// without the tour at all. The trade-off is that importing both duplicates the
// primitive (~2KB gzip); that is safe, since the two copies only ever handle
// their own popovers and never share state.
//
// Declarations are rolled up by api-extractor in the postbuild rather than
// vite-plugin-dts: in bundleTypes mode the plugin names its bundle after
// package.json's `types` field instead of the lib entry, so it emits the
// tour's API here and overwrites dist/driver.js.d.ts.
export default defineConfig({
  base: "./",
  build: {
    target: "es2020",
    // Kept out of dist/ so the tour build (which runs first) is never touched.
    outDir: "dist-hints",
    lib: {
      entry: path.resolve(__dirname, "src/hints.ts"),
      name: "driverHints",
      formats: ["es", "cjs", "iife"],
      fileName: format => (format === "es" ? "hints.mjs" : format === "cjs" ? "hints.cjs" : "hints.iife.js"),
    },
    rollupOptions: {
      output: {
        assetFileNames: assetInfo => {
          const name = assetInfo.names?.[0] ?? assetInfo.name;
          return name?.endsWith(".css") ? `hints.css` : (name as string);
        },
      },
    },
  },
});
