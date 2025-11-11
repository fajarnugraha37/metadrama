import ts from "typescript";

export const createTsPatchTransformer =
  (): ts.TransformerFactory<ts.SourceFile> => {
    return (context) => {
      return (sourceFile) => {
        // Placeholder: pass-through transformer; diagnostics handled by SWC pipeline.
        return sourceFile;
      };
    };
  };

export const registerTsPatch = () => {
  return createTsPatchTransformer;
};
