import { build } from "esbuild";

await build({
  entryPoints: ["src/panel.ts"],
  bundle: true,
  format: "esm",
  minify: true,
  target: "es2022",
  outfile: "../custom_components/charge_board/frontend/charge-board-panel.js",
});
