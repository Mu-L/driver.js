import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { transformWithEsbuild } from "vite";

// vite-plugin-dts emits a single bundled declaration file. Copy it to the
// ESM/CJS-specific extensions so each `exports` condition resolves to types
// that match its module format (avoids the "types masquerade as CJS" issue).
const source = "dist/driver.js.d.ts";
copyFileSync(source, "dist/driver.js.d.mts");
copyFileSync(source, "dist/driver.js.d.cts");

// Vite ships the ESM bundle with its whitespace intact (the CJS and IIFE builds
// are already minified), so strip it here for a smaller gzipped file. Reuses
// Vite's own esbuild so the build pulls in no extra dependency.
const esmBundle = "dist/driver.js.mjs";
const { code } = await transformWithEsbuild(readFileSync(esmBundle, "utf8"), esmBundle, {
  minify: true,
  legalComments: "none",
});
writeFileSync(esmBundle, code);
