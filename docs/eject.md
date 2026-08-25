# Ejecting — the same setup without this package

`@omnia-voice/tracing` / `omnia-tracing` is ~200 lines of configuration over standard
OpenTelemetry. If you'd rather own that configuration (or stop using the
package for any reason), here is the identical setup in vanilla OTel. Your
spans do not change — the package and this document produce the same wire
format, attributes, and endpoint.

## TypeScript

```bash
npm install @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-proto \
  @traceloop/instrumentation-openai @traceloop/instrumentation-anthropic \
  @traceloop/instrumentation-langchain
```

```ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { OpenAIInstrumentation } from "@traceloop/instrumentation-openai";
import { AnthropicInstrumentation } from "@traceloop/instrumentation-anthropic";
import { LangChainInstrumentation } from "@traceloop/instrumentation-langchain";

// omnia.tag names your traffic population in errorbar
process.env.OTEL_RESOURCE_ATTRIBUTES = "omnia.tag=my-agent";

const sdk = new NodeSDK({
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
});
sdk.start();
```

## Python

```bash
pip install opentelemetry-sdk opentelemetry-exporter-otlp-proto-http \
  opentelemetry-instrumentation-openai opentelemetry-instrumentation-anthropic \
  opentelemetry-instrumentation-google-generativeai opentelemetry-instrumentation-langchain
```

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
            endpoint="https://gateway.omnia-voice.com/v1/traces",
            headers={"Authorization": f"Bearer {os.environ['OMNIA_API_KEY']}"},
        )
    )
)
AnthropicInstrumentor().instrument(tracer_provider=provider)
# ...and the other instrumentors for whichever libraries you use
```

## Pure env-var form (no code at all)

If your app already initializes OpenTelemetry some other way, skip everything
above and configure the exporter through the standard env contract:

```bash
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://gateway.omnia-voice.com/v1/traces
OTEL_EXPORTER_OTLP_TRACES_HEADERS="Authorization=Bearer ${OMNIA_API_KEY}"
OTEL_RESOURCE_ATTRIBUTES=omnia.tag=my-agent
```
