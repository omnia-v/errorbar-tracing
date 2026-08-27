"""errorbar tracing — standard OpenTelemetry, curated.

One install, one line; eject anytime, your spans don't change. This package
contains NO instrumentation code of its own: it pins and configures standard,
ecosystem-maintained OpenTelemetry pieces. The identical setup without this
package is documented in docs/eject.md.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

DEFAULT_ENDPOINT = "https://gateway.errorbar.ai/v1/traces"
TAG_ATTRIBUTE = "omnia.tag"

__all__ = ["setup", "resolve_config", "ResolvedConfig", "Tracing", "DEFAULT_ENDPOINT", "TAG_ATTRIBUTE"]


@dataclass
class ResolvedConfig:
    endpoint: str
    headers: dict[str, str]
    service_name: str | None
    resource_attributes: dict[str, str] = field(default_factory=dict)


def resolve_config(
    api_key: str | None = None,
    tag: str | None = None,
    service_name: str | None = None,
    endpoint: str | None = None,
    env: dict[str, str] | None = None,
) -> ResolvedConfig:
    """Pure configuration assembly — unit-testable without starting a pipeline."""
    e = os.environ if env is None else env
    key = api_key or e.get("ERRORBAR_API_KEY") or e.get("OMNIA_API_KEY")
    if not key:
        raise ValueError(
            "errorbar-tracing: no API key. Pass setup(api_key=...) or set ERRORBAR_API_KEY (OMNIA_API_KEY still works). "
            "Refusing to start a tracer that exports nowhere."
        )
    resource_attributes: dict[str, str] = {}
    resolved_tag = tag or e.get("ERRORBAR_TAG") or e.get("OMNIA_TAG")
    if resolved_tag:
        resource_attributes[TAG_ATTRIBUTE] = resolved_tag
    return ResolvedConfig(
        endpoint=endpoint
        or e.get("ERRORBAR_OTLP_ENDPOINT")
        or e.get("OMNIA_OTLP_ENDPOINT")
        or DEFAULT_ENDPOINT,
        headers={"Authorization": f"Bearer {key}"},
        service_name=service_name or e.get("OTEL_SERVICE_NAME"),
        resource_attributes=resource_attributes,
    )


class Tracing:
    """Handle returned by setup(): shutdown() flushes and stops.

    `instrumented` names the libraries actually being traced — the ones both
    installed in this environment and successfully instrumented."""

    def __init__(self, provider, instrumented: list[str]) -> None:
        self._provider = provider
        self.instrumented = instrumented

    def shutdown(self) -> None:
        self._provider.shutdown()


def setup(
    api_key: str | None = None,
    tag: str | None = None,
    service_name: str | None = None,
    endpoint: str | None = None,
) -> Tracing:
    """Start standard OpenTelemetry tracing, exporting to errorbar.

    Call ONCE, at startup, before constructing LLM clients. Instruments
    OpenAI, Anthropic, Gemini and LangChain via the ecosystem's standard
    instrumentation packages.
    """
    config = resolve_config(api_key, tag, service_name, endpoint)

    # Imports live here, not module top: `import errorbar_tracing` must stay
    # side-effect free so resolve_config is usable (and testable) alone.
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

    attrs: dict[str, str] = dict(config.resource_attributes)
    if config.service_name:
        attrs["service.name"] = config.service_name
    provider = TracerProvider(resource=Resource.create(attrs))
    provider.add_span_processor(
        BatchSpanProcessor(
            OTLPSpanExporter(endpoint=config.endpoint, headers=config.headers)
        )
    )

    # Each instrumentation package imports its TARGET library at import time,
    # so instrument only what this environment actually has — an
    # Anthropic-only app must not be forced to install `openai`.
    candidates = (
        ("openai", "opentelemetry.instrumentation.openai", "OpenAIInstrumentor"),
        ("anthropic", "opentelemetry.instrumentation.anthropic", "AnthropicInstrumentor"),
        (
            "google-generativeai",
            "opentelemetry.instrumentation.google_generativeai",
            "GoogleGenerativeAiInstrumentor",
        ),
        ("langchain", "opentelemetry.instrumentation.langchain", "LangchainInstrumentor"),
    )
    instrumented: list[str] = []
    import importlib

    for name, module_path, class_name in candidates:
        try:
            instrumentor = getattr(importlib.import_module(module_path), class_name)()
        except ImportError:
            continue  # target library not installed — nothing to trace
        if not instrumentor.is_instrumented_by_opentelemetry:
            instrumentor.instrument(tracer_provider=provider)
        instrumented.append(name)

    return Tracing(provider, instrumented)
