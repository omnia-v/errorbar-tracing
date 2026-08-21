# omnia-tracing

**Standard OpenTelemetry, curated.** One install, one line, and your LLM traffic streams to [Omnia](https://platform.omnia-voice.com) — where you can grade it, calibrate a judge on your own standards, and find out with confidence intervals whether a cheaper model passes them.

This SDK contains **no instrumentation code of its own**. It pins and configures the ecosystem's standard OpenTelemetry instrumentations. That has a consequence no other tracing SDK offers: **you can uninstall it without losing your instrumentation** — the same setup in vanilla OTel is documented in [docs/eject.md](docs/eject.md), and your spans are identical either way. Nothing Omnia-specific ever goes on the wire.

## TypeScript

```bash
npm install @omnia/tracing
```

```ts
import { setup } from "@omnia/tracing";

setup(); // reads OMNIA_API_KEY and OMNIA_TAG — call before creating LLM clients
```

**Pure-ESM app?** Skip the code entirely and start Node with the loader hook — imports are intercepted before your app runs:

```bash
node --import @omnia/tracing/register app.mjs
```

## Python

```bash
pip install omnia-tracing
```

```python
from omnia_tracing import setup

setup()  # reads OMNIA_API_KEY and OMNIA_TAG — call before creating LLM clients
```

## Configuration

| Env var | Meaning | Default |
| --- | --- | --- |
| `OMNIA_API_KEY` | Omnia API key (required — setup refuses to start without one) | — |
| `OMNIA_TAG` | Population tag: one tag = one gradeable population in Omnia | unset |
| `OMNIA_OTLP_ENDPOINT` | OTLP/HTTP traces endpoint | `https://gateway.omnia-voice.com/v1/traces` |
| `OTEL_SERVICE_NAME` | Standard OTel service name | unset |

All options can also be passed to `setup()` directly; explicit options beat env vars.

## What gets instrumented

| Library | TypeScript | Python |
| --- | --- | --- |
| OpenAI | ✅ | ✅ |
| Anthropic | ✅ | ✅ |
| Gemini | — (planned) | ✅ |
| LangChain | ✅ | ✅ |

Only libraries actually installed in your environment are instrumented (Python reports the active set on `tracing.instrumented`).

**Verified end-to-end** (live drills 2026-08-21, every row confirmed gradeable in Omnia):

- TypeScript CJS with `openai@4` **and** `openai@7` (upstream pins `<7`; this package carries a one-line range widening — v7 kept the exact class surface the patch wraps — removed once upstream catches up)
- **Pure ESM** via `node --import @omnia/tracing/register` (Node 20–24)
- **Streaming** completions (content aggregated across chunks)
- **LangChain** (`@langchain/openai` chat model)
- **Python** with `openai`

Failed calls (auth errors, timeouts) are captured as ERROR spans and stored as trace structure — a fix this drill battery surfaced in the ingest itself. The weekly unpinned-upstream CI canary re-checks all of the above so nothing rots silently. Already emitting OpenTelemetry from a framework like the Vercel AI SDK? You don't need this package at all — point your existing exporter at the endpoint above with an `Authorization: Bearer` header and an `omnia.tag` resource attribute.

## Privacy

Span **structure** is always stored. Model-call **content** (`gen_ai.*` prompt/completion attributes) is stored only if your Omnia workspace has request logging enabled, under your retention window, with the same scrubbing and size caps as gateway traffic.

## Verify your setup

```bash
OMNIA_API_KEY=sk_... sh -c "$(curl -fsSL https://platform.omnia-voice.com/setup.sh)"
```

Proves the key works, confirms traces are landing, and names your next step.

## License

Apache-2.0
