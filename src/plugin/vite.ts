import type { Plugin } from "vite";

import { transformWithSwc } from "./swc";

export const metadramaVitePlugin = (): Plugin => ({
  name: "metadrama-transform",
  enforce: "pre",
  async transform(code, id) {
    if (!/\.[cm]?tsx?$/.test(id)) {
      return null;
    }
    const result = await transformWithSwc(code, id);
    return {
      code: result.code,
      map: result.map ?? undefined,
    };
  },
});
