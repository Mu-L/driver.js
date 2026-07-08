import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { minify } from "terser";

// vite-plugin-dts emits a single bundled declaration file. Copy it to the
// ESM/CJS-specific extensions so each `exports` condition resolves to types
// that match its module format (avoids the "types masquerade as CJS" issue).
const source = "dist/driver.js.d.ts";
copyFileSync(source, "dist/driver.js.d.mts");
copyFileSync(source, "dist/driver.js.d.cts");

// Vite ships the ESM bundle with its whitespace intact (the CJS and IIFE builds
// are already minified), so run it through Terser for a smaller gzipped file.
const esmBundle = "dist/driver.js.mjs";
const { code } = await minify(readFileSync(esmBundle, "utf8"), { module: true });
writeFileSync(esmBundle, code);
