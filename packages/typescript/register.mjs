/**
 * ESM auto-instrumentation entrypoint:
 *
 *   node --import @omnia/tracing/register app.mjs
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
setup();
