import { execFileSync } from "node:child_process";
import { copyFileSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { minify } from "terser";
import { Extractor, ExtractorConfig } from "@microsoft/api-extractor";

// The tour and the hints entries come from two separate vite runs (see
// vite.hints.config.ts for why). The hints run writes to dist-hints/ so it
// cannot disturb the tour's output; this step folds it into dist/, rolls up its
// declarations, and minifies both ESM bundles.

// --- hints bundles -----------------------------------------------------------

for (const file of ["hints.mjs", "hints.cjs", "hints.iife.js", "hints.css"]) {
  renameSync(`dist-hints/${file}`, `dist/${file}`);
}

rmSync("dist-hints", { recursive: true, force: true });

// --- hints declarations ------------------------------------------------------

// vite-plugin-dts rolls up the tour's declarations, but it cannot do the same
// for a second entry: in bundleTypes mode it takes its entry from package.json's
// `types` field rather than the lib entry, so it emits the tour's API under the
// hints name. api-extractor is pointed at the hints entry explicitly instead.
execFileSync(
  "npx",
  [
    "tsc",
    "--declaration",
    "--emitDeclarationOnly",
    "--noEmit",
    "false",
    "--sourceMap",
    "false",
    "--outDir",
    "dist-types",
  ],
  { stdio: "inherit" }
);

const extractorResult = Extractor.invoke(ExtractorConfig.loadFileAndPrepare("api-extractor.hints.json"), {
  localBuild: true,
  showVerboseMessages: false,
});

rmSync("dist-types", { recursive: true, force: true });

if (!extractorResult.succeeded) {
  throw new Error(`Rolling up the hints declarations failed with ${extractorResult.errorCount} error(s)`);
}

// --- per-format declarations -------------------------------------------------

// Each entry has a single bundled declaration file. Copy it to the ESM/CJS
// specific extensions so every `exports` condition resolves to types that match
// its module format (avoids the "types masquerade as CJS" issue).
for (const base of ["dist/driver.js", "dist/hints"]) {
  copyFileSync(`${base}.d.ts`, `${base}.d.mts`);
  copyFileSync(`${base}.d.ts`, `${base}.d.cts`);
}

// --- minify ------------------------------------------------------------------

// Vite ships the ESM bundles with their whitespace intact (the CJS and IIFE
// builds are already minified), so run them through Terser for smaller
// gzipped files.
for (const bundle of ["dist/driver.js.mjs", "dist/hints.mjs"]) {
  const { code } = await minify(readFileSync(bundle, "utf8"), { module: true });
  writeFileSync(bundle, code);
}
