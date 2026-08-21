# Fixtures

Recorded span exports (golden files) per instrumented library, replayed in CI
so an upstream instrumentation or semantic-convention drift breaks a test here
before it breaks a customer's traces.

Recording protocol: run the sample app for a library against a local OTLP
collector, save the exported request as JSON, commit it named
`<library>-<instrumentation-version>.json`. The weekly `upstream-latest` CI job
re-runs the suite against unpinned upstreams and compares fresh exports to
these goldens (attribute names and structure, not values).

Empty until the first end-to-end drill records them.
