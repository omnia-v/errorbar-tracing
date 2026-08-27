# omnia-tracing — renamed

This distribution is now **[`errorbar-tracing`](https://pypi.org/project/errorbar-tracing/)**.
Version 0.2.0 of this name depends on the new package and re-exports it, so existing installs keep working. Switch:

```bash
pip uninstall omnia-tracing && pip install errorbar-tracing
```

and change `from omnia_tracing import setup` → `from errorbar_tracing import setup`. Env vars: `ERRORBAR_API_KEY` / `ERRORBAR_TAG` / `ERRORBAR_OTLP_ENDPOINT` (the `OMNIA_*` names are still honoured).
