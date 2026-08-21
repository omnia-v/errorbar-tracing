import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import type { Instrumentation } from "@opentelemetry/instrumentation";
import { OpenAIInstrumentation } from "@traceloop/instrumentation-openai";
import { AnthropicInstrumentation } from "@traceloop/instrumentation-anthropic";
import { LangChainInstrumentation } from "@traceloop/instrumentation-langchain";
import { resolveConfig, type SetupOptions, TAG_ATTRIBUTE } from "./config";

export { resolveConfig, DEFAULT_ENDPOINT, TAG_ATTRIBUTE } from "./config";
export type { SetupOptions, ResolvedConfig } from "./config";

export interface Tracing {
  /** Flush pending spans and stop. Call before process exit in short-lived
   *  scripts; long-running servers can skip it. */
  shutdown(): Promise<void>;
  /** The live instrumentation instances — escape hatch for ESM setups where
   *  auto-patching can't intercept an already-imported client:
   *  `tracing.instrumentations.openai.manuallyInstrument(client)`. */
  instrumentations: {
    openai: OpenAIInstrumentation;
    anthropic: AnthropicInstrumentation;
    langchain: LangChainInstrumentation;
  };
}

/**
 * Start standard OpenTelemetry tracing, exporting to Omnia.
 *
 * Call ONCE, before constructing any LLM client (the instrumentations patch
 * module loading, so clients created earlier are not captured — use
 * `tracing.instrumentations.<lib>.manuallyInstrument(client)` for those).
 *
 * Everything this function does is standard OTel configuration; see
 * docs/eject.md for the identical setup without this package.
 */
export function setup(
  opts: SetupOptions & { instrumentations?: Instrumentation[] } = {},
): Tracing {
  const config = resolveConfig(opts);

  const openai = new OpenAIInstrumentation();
  const anthropic = new AnthropicInstrumentation();
  const langchain = new LangChainInstrumentation();

  // The population tag rides the standard resource-attributes env var so the
  // resource pipeline stays 100% stock OTel (no Resource construction here —
  // that API has churned across SDK majors; the env contract hasn't).
  const tagPairs = Object.entries(config.resourceAttributes)
    .map(([k, v]) => `${k}=${v}`)
    .join(",");
  if (tagPairs) {
    process.env.OTEL_RESOURCE_ATTRIBUTES = process.env.OTEL_RESOURCE_ATTRIBUTES
      ? `${process.env.OTEL_RESOURCE_ATTRIBUTES},${tagPairs}`
      : tagPairs;
  }

  const sdk = new NodeSDK({
    serviceName: config.serviceName,
    traceExporter: new OTLPTraceExporter({
      url: config.endpoint,
      headers: config.headers,
    }),
    instrumentations: [
      openai,
      anthropic,
      langchain,
      ...(opts.instrumentations ?? []),
    ],
  });
  sdk.start();

  return {
    shutdown: () => sdk.shutdown(),
    instrumentations: { openai, anthropic, langchain },
  };
}
