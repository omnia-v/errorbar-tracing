# @omnia-voice/tracing

**Standard OpenTelemetry, curated.** One install, one line, and your LLM traffic streams to [Omnia](https://platform.omnia-voice.com) — where you grade it, calibrate a judge against your own standards, and find out **with confidence intervals** whether a cheaper model holds up on your production traffic.

This SDK contains **no instrumentation code of its own**. It pins and configures the ecosystem's standard OpenTelemetry instrumentations — which gives it a property no other tracing SDK offers: **you can uninstall it without losing your instrumentation.** The identical setup in vanilla OTel is documented below; your spans are byte-for-byte the same either way, and nothing proprietary ever goes on the wire.

## Install

```bash
npm install @omnia-voice/tracing
```

## Use

Call once at startup, **before constructing any LLM client**:

```ts
import { setup } from "@omnia-voice/tracing";

const tracing = setup(); // reads OMNIA_API_KEY and OMNIA_TAG
```

Pure-ESM app? Skip the code entirely — start Node with the loader hook so imports are intercepted before your app runs:

```bash
node --import @omnia-voice/tracing/register app.mjs
```

Short-lived scripts should `await tracing.shutdown()` before exit to flush pending spans; long-running servers can skip it. The `register` entrypoint flushes automatically when the process exits normally — no code needed.

## What gets captured

OpenAI (v4–v7), Anthropic, LangChain, and Gemini (via the Vertex AI SDK) calls — automatically, and only for libraries actually installed. Successful calls, **streamed** calls (content aggregated across chunks), and **failed** calls (stored as ERROR trace structure — the most valuable signal there is, and the one status-code dashboards can't see).

Your inference does **not** move: requests keep going to your current provider; only trace telemetry flows to Omnia.

## Configuration

| Env var | Meaning | Default |
| --- | --- | --- |
| `OMNIA_API_KEY` | Omnia API key — **required**; `setup()` throws rather than exporting nowhere silently | — |
| `OMNIA_TAG` | Population tag: one tag = one evaluation population in Omnia | unset |
| `OMNIA_OTLP_ENDPOINT` | OTLP/HTTP traces endpoint | `https://gateway.omnia-voice.com/v1/traces` |
| `OTEL_SERVICE_NAME` | Standard OTel service name | unset |

All options can also be passed to `setup()` directly; explicit options beat env vars.

## The eject guarantee

Remove this package and wire the same standard pieces yourself — identical spans, same endpoint, nothing lost:

```ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { OpenAIInstrumentation } from "@traceloop/instrumentation-openai";
import { AnthropicInstrumentation } from "@traceloop/instrumentation-anthropic";
import { LangChainInstrumentation } from "@traceloop/instrumentation-langchain";

process.env.OTEL_RESOURCE_ATTRIBUTES = "omnia.tag=my-agent";

new NodeSDK({
  serviceName: "my-service",
  traceExporter: new OTLPTraceExporter({
    url: "https://gateway.omnia-voice.com/v1/traces",
    headers: { Authorization: `Bearer ${process.env.OMNIA_API_KEY}` },
  }),
  instrumentations: [
    new OpenAIInstrumentation(),
    new AnthropicInstrumentation(),
    new LangChainInstrumentation(),
  ],
}).start();
```

Already emitting OpenTelemetry (Vercel AI SDK telemetry, an existing OTel setup)? You don't need this package at all — three env vars point your existing exporter at Omnia. See the [OTLP ingest reference](https://docs.omnia-voice.com/reference/otlp-ingest).

## Privacy

Span **structure** is always stored. Model-call **content** (prompts/completions) is stored only if your Omnia workspace has request logging enabled, under your retention window, with the same scrubbing and size caps as gateway traffic.

## Verify your setup — get a receipt, not a hope

```bash
OMNIA_API_KEY=sk_... sh -c "$(curl -fsSL https://platform.omnia-voice.com/setup.sh)"
```

Proves the key works, confirms traces are actually landing, and names your one next step. Instrumentation that fails silently is the industry default; this is the alternative.

## Links

- [Docs](https://docs.omnia-voice.com/reference/tracing-sdk) · [Platform](https://platform.omnia-voice.com) · [Python package](https://pypi.org/project/omnia-tracing/)

Apache-2.0
