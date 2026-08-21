import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import type {
  Instrumentation,
  InstrumentationNodeModuleDefinition,
} from "@opentelemetry/instrumentation";
import { OpenAIInstrumentation } from "@traceloop/instrumentation-openai";
import { AnthropicInstrumentation } from "@traceloop/instrumentation-anthropic";
import { LangChainInstrumentation } from "@traceloop/instrumentation-langchain";
import { resolveConfig, type SetupOptions, TAG_ATTRIBUTE } from "./config";

/**
 * Upstream pins openai support at ">=4 <7", but v7 kept the exact public
 * class surface the patch wraps (Chat.Completions / Completions / Responses /
 * Images — verified by live drill 2026-08-21, spans + content landed).
 * Widen to <8 until upstream catches up; the weekly unpinned-upstream CI
 * canary re-checks this assumption so the widening can't silently rot.
 */
export class OpenAIInstrumentationWide extends OpenAIInstrumentation {
  protected override init(): InstrumentationNodeModuleDefinition {
    const def = super.init() as InstrumentationNodeModuleDefinition;
    if (def.name === "openai") def.supportedVersions = [">=4 <8"];
    return def;
  }
}

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

  const openai = new OpenAIInstrumentationWide();
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
