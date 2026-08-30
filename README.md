# errorbar tracing SDKs

**Standard OpenTelemetry, curated.** One install, one line, and your LLM traffic streams to [errorbar](https://www.errorbar.ai) — where you can grade it, calibrate a judge on your own standards, and find out with confidence intervals whether a cheaper model passes them.

This SDK contains **no instrumentation code of its own**. It pins and configures the ecosystem's standard OpenTelemetry instrumentations. That has a consequence no other tracing SDK offers: **you can uninstall it without losing your instrumentation** — the same setup in vanilla OTel is documented in [docs/eject.md](docs/eject.md), and your spans are identical either way. Nothing errorbar-specific ever goes on the wire.

## TypeScript

```bash
npm install @error-bar/tracing
```

```ts
import { setup } from "@error-bar/tracing";

setup(); // reads ERRORBAR_API_KEY and ERRORBAR_TAG — call before creating LLM clients
```

**Pure-ESM app?** Skip the code entirely and start Node with the loader hook — imports are intercepted before your app runs:

```bash
node --import @error-bar/tracing/register app.mjs
```

## Python

```bash
pip install errorbar-tracing
```

```python
from errorbar_tracing import setup

setup()  # reads ERRORBAR_API_KEY and ERRORBAR_TAG — call before creating LLM clients
```

## Configuration

| Env var | Meaning | Default |
| --- | --- | --- |
| `ERRORBAR_API_KEY` | errorbar API key (required — setup refuses to start without one) | — |
| `ERRORBAR_TAG` | Population tag: one tag = one gradeable population in errorbar | unset |
| `ERRORBAR_OTLP_ENDPOINT` | OTLP/HTTP traces endpoint | `https://gateway.errorbar.ai/v1/traces` |
| `OTEL_SERVICE_NAME` | Standard OTel service name | unset |

All options can also be passed to `setup()` directly; explicit options beat env vars.

## What gets instrumented

| Library | TypeScript | Python |
| --- | --- | --- |
| OpenAI | ✅ | ✅ |
| Anthropic | ✅ | ✅ |
| Gemini | ✅ (Vertex AI SDK) | ✅ |
| LangChain | ✅ | ✅ |

Only libraries actually installed in your environment are instrumented (Python reports the active set on `tracing.instrumented`).

**Verified end-to-end** (live drills 2026-08-21, every row confirmed gradeable in errorbar):

- TypeScript CJS with `openai@4` **and** `openai@7` (upstream pins `<7`; this package carries a one-line range widening — v7 kept the exact class surface the patch wraps — removed once upstream catches up)
- **Pure ESM** via `node --import @error-bar/tracing/register` (Node 20–24)
- **Streaming** completions (content aggregated across chunks)
- **LangChain** (`@langchain/openai` chat model)
- **Python** with `openai`

Failed calls (auth errors, timeouts) are captured as ERROR spans and stored as trace structure — a fix this drill battery surfaced in the ingest itself. The weekly unpinned-upstream CI canary re-checks all of the above so nothing rots silently. Already emitting OpenTelemetry from a framework like the Vercel AI SDK? You don't need this package at all — point your existing exporter at the endpoint above with an `Authorization: Bearer` header and an `errorbar.tag` resource attribute.

## Privacy

Span **structure** is always stored. Model-call **content** (`gen_ai.*` prompt/completion attributes) is stored only if your errorbar workspace has request logging enabled, under your retention window, with the same scrubbing and size caps as gateway traffic.

## Verify your setup

```bash
ERRORBAR_API_KEY=sk_... sh -c "$(curl -fsSL https://www.errorbar.ai/setup.sh)"
```

Proves the key works, confirms traces are landing, and names your next step.

## Docs

[docs.errorbar.ai/sdks/overview](https://docs.errorbar.ai/sdks/overview) · [TypeScript](https://docs.errorbar.ai/sdks/typescript) · [Python](https://docs.errorbar.ai/sdks/python) · [OTLP ingest](https://docs.errorbar.ai/reference/otlp-ingest)

## License

Apache-2.0

## Renamed from `@omnia-voice/tracing` / `omnia-tracing`

As of 0.2.0 the packages are `@error-bar/tracing` (npm) and `errorbar-tracing` (PyPI). The old names ship one last release (0.2.0) as shims that depend on and re-export the new packages, so nothing breaks — but update your imports; the shims will be removed later. Env vars are `ERRORBAR_*`; the `OMNIA_*` names keep working.

As of 0.3.0 the population tag rides the `errorbar.tag` resource attribute (0.2.x emitted `omnia.tag`). The ingest reads both, so a fleet mid-upgrade still lands in one population.
