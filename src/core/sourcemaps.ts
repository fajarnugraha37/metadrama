import MagicString from "magic-string";

export interface SourceMapResult {
  code: string;
  map: string | null;
}

export const createSourceMap = (
  input: string,
  mutate: (ms: MagicString) => void
): SourceMapResult => {
  const ms = new MagicString(input);
  mutate(ms);
  return {
    code: ms.toString(),
    map: ms.generateMap({ hires: true }).toString(),
  };
};
