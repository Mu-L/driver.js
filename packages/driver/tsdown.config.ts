import { defineConfig } from "tsdown";

// Two isolated builds rather than one multi-entry build, for the same reason
// the vite setup used two configs: with both entries in one build the shared
// popover primitive gets split into a common chunk, which would make the tour
// bundle depend on a second file and merge both stylesheets. Standing alone,
// each entry ships self-contained (the primitive is duplicated, ~2KB gzip).
const shared = {
  target: "es2020",
  platform: "browser",
  dts: true,
  minify: true,
  // Keep the exact filenames the package has always shipped. The iife format
  // appends its own ".iife" infix, so plain ".js" yields "<entry>.iife.js".
  outExtensions: (ctx: { format: string }) =>
    ctx.format === "es" ? { js: ".mjs" } : ctx.format === "cjs" ? { js: ".cjs" } : { js: ".js" },
} as const;

export default defineConfig([
  {
    ...shared,
    entry: { "driver.js": "src/driver.ts" },
    format: ["es", "cjs", "iife"],
    // The documented CDN global is window["driver"]["js"].driver — rollup-style
    // expansion of the dotted name.
    globalName: "driver.js",
    css: {
      fileName: "driver.css",
      minify: true,
    },
  },
  {
    ...shared,
    entry: { hints: "src/hints.ts" },
    format: ["es", "cjs", "iife"],
    globalName: "driverHints",
    css: {
      fileName: "hints.css",
      minify: true,
    },
  },
]);
