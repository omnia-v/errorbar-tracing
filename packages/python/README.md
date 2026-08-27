# errorbar-tracing

**Standard OpenTelemetry, curated.** One install, one line, and your LLM traffic streams to [errorbar](https://platform.omnia-voice.com) — where you grade it, calibrate a judge against your own standards, and find out **with confidence intervals** whether a cheaper model holds up on your production traffic.

This package contains **no instrumentation code of its own**. It pins and configures the ecosystem's standard OpenTelemetry instrumentations — which gives it a property no other tracing SDK offers: **you can uninstall it without losing your instrumentation.** The identical setup in vanilla OTel is documented below; your spans are byte-for-byte the same either way, and nothing proprietary ever goes on the wire.

## Install

```bash
pip install errorbar-tracing
```

## Use

Call once at startup, **before constructing any LLM client**:

```python
from errorbar_tracing import setup

tracing = setup()          # reads ERRORBAR_API_KEY and ERRORBAR_TAG
print(tracing.instrumented)  # e.g. ['openai', 'anthropic'] — only what's installed
```

Short-lived scripts should call `tracing.shutdown()` before exit to flush pending spans; long-running servers can skip it.

## What gets captured

OpenAI, Anthropic, Gemini, and LangChain calls — automatically, and **only for libraries actually installed** (the `instrumented` list tells you exactly which). Successful calls, streamed calls, and **failed** calls (stored as ERROR trace structure — the most valuable signal there is, and the one status-code dashboards can't see).

Your inference does **not** move: requests keep going to your current provider; only trace telemetry flows to errorbar.

## Configuration

| Env var | Meaning | Default |
| --- | --- | --- |
| `ERRORBAR_API_KEY` | errorbar API key — **required**; `setup()` raises rather than exporting nowhere silently | — |
| `ERRORBAR_TAG` | Population tag: one tag = one evaluation population in errorbar | unset |
| `ERRORBAR_OTLP_ENDPOINT` | OTLP/HTTP traces endpoint | `https://gateway.errorbar.ai/v1/traces` |
| `OTEL_SERVICE_NAME` | Standard OTel service name | unset |

All options can also be passed to `setup()` directly; explicit options beat env vars.

## The eject guarantee

Remove this package and wire the same standard pieces yourself — identical spans, same endpoint, nothing lost:

```python
import os
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.anthropic import AnthropicInstrumentor

provider = TracerProvider(
    resource=Resource.create({"service.name": "my-service", "omnia.tag": "my-agent"})
)
provider.add_span_processor(
    BatchSpanProcessor(
        OTLPSpanExporter(
            endpoint="https://gateway.errorbar.ai/v1/traces",
            headers={"Authorization": f"Bearer {os.environ['ERRORBAR_API_KEY']}"},
        )
    )
)
AnthropicInstrumentor().instrument(tracer_provider=provider)
# ...and the other instrumentors for whichever libraries you use
```

Already emitting OpenTelemetry (Pydantic AI, an existing OTel setup)? You don't need this package at all — three env vars point your existing exporter at errorbar. See the [OTLP ingest reference](https://docs.omnia-voice.com/reference/otlp-ingest).

## Privacy

Span **structure** is always stored. Model-call **content** (prompts/completions) is stored only if your errorbar workspace has request logging enabled, under your retention window, with the same scrubbing and size caps as gateway traffic.

## Verify your setup — get a receipt, not a hope

```bash
ERRORBAR_API_KEY=sk_... sh -c "$(curl -fsSL https://platform.omnia-voice.com/setup.sh)"
```

Proves the key works, confirms traces are actually landing, and names your one next step. Instrumentation that fails silently is the industry default; this is the alternative.

## Links

- [Docs](https://docs.omnia-voice.com/reference/tracing-sdk) · [Platform](https://platform.omnia-voice.com) · [Node package](https://www.npmjs.com/package/@omnia-voice/tracing)

Apache-2.0
