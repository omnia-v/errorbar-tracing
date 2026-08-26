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

/** Resource attribute that names the traffic population in errorbar. */
export const TAG_ATTRIBUTE = "omnia.tag";

export interface SetupOptions {
  /** errorbar API key. Default: OMNIA_API_KEY env var. Required — setup throws
   *  rather than exporting nowhere silently. */
  apiKey?: string;
  /** Population tag (becomes the `omnia.tag` resource attribute — one tag =
   *  one gradeable population). Default: OMNIA_TAG env var. */
  tag?: string;
  /** Service name on the resource. Default: OTEL_SERVICE_NAME env var. */
  serviceName?: string;
  /** OTLP/HTTP traces endpoint. Default: OMNIA_OTLP_ENDPOINT env var, else
   *  the errorbar gateway. Point it elsewhere and this package exports to any
   *  OTLP receiver — there is nothing Omnia-specific on the wire. */
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
  const apiKey = opts.apiKey ?? env.OMNIA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "@omnia-voice/tracing: no API key. Pass setup({ apiKey }) or set OMNIA_API_KEY. " +
        "Refusing to start a tracer that exports nowhere.",
    );
  }
  const tag = opts.tag ?? env.OMNIA_TAG;
  const resourceAttributes: Record<string, string> = {};
  if (tag) resourceAttributes[TAG_ATTRIBUTE] = tag;
  return {
    endpoint: opts.endpoint ?? env.OMNIA_OTLP_ENDPOINT ?? DEFAULT_ENDPOINT,
    headers: { Authorization: `Bearer ${apiKey}` },
    serviceName: opts.serviceName ?? env.OTEL_SERVICE_NAME,
    resourceAttributes,
  };
}
