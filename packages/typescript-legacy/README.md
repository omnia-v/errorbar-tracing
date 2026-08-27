# @omnia-voice/tracing — renamed

This package is now **[`@error-bar/tracing`](https://www.npmjs.com/package/@error-bar/tracing)**.
Version 0.2.0 of this name is a shim that re-exports the new package so existing installs keep working. Switch:

```bash
npm uninstall @omnia-voice/tracing && npm install @error-bar/tracing
```

and change `@omnia-voice/tracing` → `@error-bar/tracing` in imports and `--import` flags. Env vars: `ERRORBAR_API_KEY` / `ERRORBAR_TAG` / `ERRORBAR_OTLP_ENDPOINT` (the `OMNIA_*` names are still honoured).
