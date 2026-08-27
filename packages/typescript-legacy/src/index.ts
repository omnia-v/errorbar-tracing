/**
 * @omnia-voice/tracing is now @error-bar/tracing. This package exists so an
 * existing install keeps working after the rename; it re-exports the new
 * package unchanged and says so once at load.
 */
console.warn(
  "[@omnia-voice/tracing] renamed to @error-bar/tracing — update your import; this shim will be removed in a later release.",
);
export * from "@error-bar/tracing";
