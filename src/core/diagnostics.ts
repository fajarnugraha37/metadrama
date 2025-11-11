import pc from "picocolors";

import type { DiagnosticEntry } from "./registry";

const explanations: Record<string, string> = {
  MD1001:
    "Advice registration failed because the provided pointcut produced no targets.",
  MD1002:
    "Macro expansion failed. Ensure the macro receives a supported AST node.",
};

export function formatDiagnostic(entry: DiagnosticEntry): string {
  const location = entry.file
    ? `${entry.file}${
        entry.span ? `:${entry.span.line}:${entry.span.column}` : ""
      }`
    : "unknown";
  const prefix =
    entry.level === "error"
      ? pc.red("error")
      : entry.level === "warn"
      ? pc.yellow("warn")
      : pc.cyan("info");
  const code = pc.bold(entry.code);
  const hint = entry.hint ? `\n  hint: ${entry.hint}` : "";
  return `${prefix} ${code} ${entry.message}\n  at ${location}${hint}`;
}

export function explainDiagnostic(code: string): string {
  return (
    explanations[code] ?? "No additional documentation available for this code."
  );
}

export function codeframe(
  source: string,
  line: number,
  column: number,
  context = 2
): string {
  const lines = source.split(/\r?\n/);
  const start = Math.max(0, line - 1 - context);
  const end = Math.min(lines.length, line + context);
  return lines
    .slice(start, end)
    .map((text, index) => {
      const currentLine = start + index + 1;
      const marker = currentLine === line ? ">" : " ";
      const gutter = currentLine.toString().padStart(4, " ");
      const pointer =
        currentLine === line ? `\n    ${" ".repeat(column)}^` : "";
      return `${marker} ${gutter} | ${text}${pointer}`;
    })
    .join("\n");
}

export function timer<T>(code: string, message: string, run: () => T): T {
  const start = performance.now();
  try {
    return run();
  } finally {
    const durationMs = performance.now() - start;
    console.debug(
      pc.gray(`[${code}] ${message} in ${durationMs.toFixed(1)}ms`)
    );
  }
}

export type { DiagnosticEntry };
