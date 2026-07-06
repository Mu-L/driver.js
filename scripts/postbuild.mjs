import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { transform } from "esbuild";

// vite-plugin-dts emits a single bundled declaration file. Copy it to the
// ESM/CJS-specific extensions so each `exports` condition resolves to types
// that match its module format (avoids the "types masquerade as CJS" issue).
const source = "dist/driver.js.d.ts";
copyFileSync(source, "dist/driver.js.d.mts");
copyFileSync(source, "dist/driver.js.d.cts");

// Vite 8 whitespace-minifies the CJS and IIFE outputs but ships the ESM bundle
// with its whitespace intact, so run a final esbuild pass on just the .mjs to
// strip it (~9% smaller gzipped). Identifiers are already mangled and no
// sourcemaps are shipped, so there is no downside for consumers.
const esmBundle = "dist/driver.js.mjs";
const minified = await transform(readFileSync(esmBundle, "utf8"), { minify: true, legalComments: "none" });
writeFileSync(esmBundle, minified.code);
