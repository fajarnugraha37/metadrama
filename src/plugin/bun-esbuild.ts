import path from "node:path";

import type { OnLoadResult, Plugin } from "esbuild";

import { transformWithSwc } from "./swc";

export const createBunPlugin = (): Plugin => ({
  name: "metadrama",
  setup(build) {
    build.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, async (args) => {
      const source = await Bun.file(args.path).text();
      const result = await transformWithSwc(source, args.path);
      const onLoadResult: OnLoadResult = {
        contents: result.code,
        loader: args.path.endsWith("x") ? "tsx" : "ts",
        resolveDir: path.dirname(args.path),
        warnings: result.diagnostics.map((diag) => ({
          text: `${diag.code}: ${diag.message}`,
          location: diag.file
            ? {
                file: diag.file,
                line: diag.span?.line ?? 0,
                column: diag.span?.column ?? 0,
              }
            : null,
        })),
        watchFiles: [args.path],
        pluginData: { map: result.map ?? null },
      };
      return onLoadResult;
    });
  },
});
