/**
 * ESM auto-instrumentation entrypoint:
 *
 *   node --import @omnia-voice/tracing/register app.mjs
 *
 * Pure-ESM apps import their LLM clients before any runtime call could patch
 * them, so interception has to happen at the module loader. This registers
 * OpenTelemetry's import-in-the-middle hook FIRST, then starts setup() from
 * env (OMNIA_API_KEY, OMNIA_TAG, OMNIA_OTLP_ENDPOINT, OTEL_SERVICE_NAME).
 *
 * CommonJS apps don't need this file — calling setup() before creating
 * clients is enough.
 */
import { register, createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

// Register the hook from the SAME @opentelemetry/instrumentation copy the
// instrumentations extend. With two copies in the tree (ours vs the one
// nested under @traceloop/*), the loader hook and the instrumentations'
// Hook class hold separate registries and ESM interception silently
// no-ops — the exact bug this resolution path prevents.
const hookPath = require.resolve("@opentelemetry/instrumentation/hook.mjs", {
  paths: [require.resolve("@traceloop/instrumentation-openai/package.json")],
});
register(pathToFileURL(hookPath).href, import.meta.url);

const { setup } = require("./dist/index.js");
const tracing = setup();

// This entrypoint keeps the only shutdown handle, so it owns the flush: the
// batch exporter holds spans up to 5s, and a short-lived script exits before
// that timer ever fires — dropping its spans silently (drilled 2026-08-22).
// beforeExit fires when the event loop drains; the async flush schedules
// work, which keeps the process alive until the export completes. Does not
// fire on process.exit() or fatal signals — servers killed by SIGTERM lose
// at most the final 5s window, same as any OTel batch exporter.
let flushed = false;
process.once("beforeExit", () => {
  if (flushed) return;
  flushed = true;
  tracing.shutdown().catch(() => {});
});
