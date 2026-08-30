/**
 * Pure configuration assembly — separated from setup() so every decision the
 * SDK makes is unit-testable without starting an OpenTelemetry pipeline.
 *
 * This package deliberately contains NO instrumentation code. It pins and
 * configures standard, ecosystem-maintained OpenTelemetry pieces. The same
 * setup expressed without this package is documented in docs/eject.md — eject
 * anytime; your spans do not change.
 */

export const DEFAULT_ENDPOINT = "https://gateway.errorbar.ai/v1/traces";

/** Resource attribute that names the traffic population in errorbar.
 *  `errorbar.tag` since 0.3.0; the ingest still reads the pre-rename
 *  `omnia.tag` that 0.2.x emitted, so mixed fleets keep one population. */
export const TAG_ATTRIBUTE = "errorbar.tag";

export interface SetupOptions {
  /** errorbar API key. Default: ERRORBAR_API_KEY env var (OMNIA_API_KEY still honoured). Required — setup throws
   *  rather than exporting nowhere silently. */
  apiKey?: string;
  /** Population tag (becomes the `errorbar.tag` resource attribute — one tag =
   *  one gradeable population). Default: ERRORBAR_TAG env var (OMNIA_TAG still honoured). */
  tag?: string;
  /** Service name on the resource. Default: OTEL_SERVICE_NAME env var. */
  serviceName?: string;
  /** OTLP/HTTP traces endpoint. Default: ERRORBAR_OTLP_ENDPOINT env var (OMNIA_OTLP_ENDPOINT still honoured), else
   *  the errorbar gateway. Point it elsewhere and this package exports to any
   *  OTLP receiver — there is nothing errorbar-specific on the wire. */
  endpoint?: string;
}

export interface ResolvedConfig {
  endpoint: string;
  headers: { Authorization: string };
  serviceName: string | undefined;
  /** Attributes merged into OTEL_RESOURCE_ATTRIBUTES semantics. */
  resourceAttributes: Record<string, string>;
}

export function resolveConfig(
  opts: SetupOptions = {},
  env: NodeJS.ProcessEnv = process.env,
): ResolvedConfig {
  const apiKey = opts.apiKey ?? env.ERRORBAR_API_KEY ?? env.OMNIA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "@error-bar/tracing: no API key. Pass setup({ apiKey }) or set ERRORBAR_API_KEY (OMNIA_API_KEY still works). " +
        "Refusing to start a tracer that exports nowhere.",
    );
  }
  const tag = opts.tag ?? env.ERRORBAR_TAG ?? env.OMNIA_TAG;
  const resourceAttributes: Record<string, string> = {};
  if (tag) resourceAttributes[TAG_ATTRIBUTE] = tag;
  return {
    endpoint:
      opts.endpoint ??
      env.ERRORBAR_OTLP_ENDPOINT ??
      env.OMNIA_OTLP_ENDPOINT ??
      DEFAULT_ENDPOINT,
    headers: { Authorization: `Bearer ${apiKey}` },
    serviceName: opts.serviceName ?? env.OTEL_SERVICE_NAME,
    resourceAttributes,
  };
}
