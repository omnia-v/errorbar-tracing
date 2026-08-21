# Fixtures

Drift detection is split across two repos, each testing the layer it owns:

- **This repo (capture):** the CI interception checks (`test/cjs-check.cjs`,
  `test/esm-check.mjs`) assert against a REAL installed provider SDK that
  patching still works — weekly against unpinned upstream latest. That is the
  failure mode that actually bites (a provider SDK restructure, a duplicated
  instrumentation copy), and it needs no recorded goldens.
- **omnia-proxy (mapping):** the dialect-engine tests pin the wire-attribute
  grammars (official `gen_ai.*`, Traceloop indexed, Vercel `ai.*`,
  OpenInference) to the one storage shape downstream consumers parse.

The JSON files here are the hand-rolled OTLP payloads used in the live ingest
drills (2026-08-21) — useful for curl-testing an ingest deployment:

```bash
curl -X POST https://gateway.omnia-voice.com/v1/traces \
  -H "Authorization: Bearer $OMNIA_API_KEY" -H "Content-Type: application/json" \
  --data-binary @ingest-minimal-span.json
```

`ingest-genai-error-span.json` is the failed-model-call shape (gen_ai attrs,
no content) that must be stored as structure, never dropped.
