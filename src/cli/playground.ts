export const runPlayground = async (flags: Record<string, unknown> = {}) => {
  const port = Number(flags.port ?? 4173);
  if (typeof Bun === "undefined") {
    console.error(
      "Playground requires Bun runtime. Run `bun run src/cli/index.ts playground`."
    );
    return;
  }
  Bun.serve({
    port,
    fetch() {
      const body = `<!doctype html>
<html>
  <head>
    <title>metadrama playground</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 2rem; }
      pre { background: #111; color: #0f0; padding: 1rem; }
    </style>
  </head>
  <body>
    <h1>metadrama playground</h1>
    <p>Use <code>pointcut</code>, <code>macro</code>, and <code>rule</code> inside <code>aspect.config.ts</code>. Hot reload is handled by Bun&apos;s file watcher.</p>
  </body>
</html>`;
      return new Response(body, { headers: { "content-type": "text/html" } });
    },
  });
  console.log(`metadrama playground running on http://localhost:${port}`);
};
