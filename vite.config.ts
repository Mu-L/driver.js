/// <reference types="vitest/config" />
import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const packageName = "driver.js";

const fileName = {
  es: `${packageName}.mjs`,
  cjs: `${packageName}.cjs`,
  iife: `${packageName}.iife.js`,
};

const formats = Object.keys(fileName) as Array<keyof typeof fileName>;

// The tour entry. The hints entry is built separately (vite.hints.config.ts)
// so each bundle stands alone: no shared chunk to load, and importing one
// never pulls in the other. See that config for the trade-off.
export default defineConfig({
  base: "./",
  plugins: [
    dts({
      bundleTypes: true,
      tsconfigPath: "./tsconfig.json",
    }),
  ],
  build: {
    target: "es2020",
    lib: {
      entry: path.resolve(__dirname, "src/driver.ts"),
      name: packageName,
      formats,
      fileName: format => fileName[format],
    },
    rollupOptions: {
      output: {
        assetFileNames: assetInfo => {
          const name = assetInfo.names?.[0] ?? assetInfo.name;
          return name?.endsWith(".css") ? `driver.css` : (name as string);
        },
      },
    },
  },
  test: {
    environment: "jsdom",
  },
});
