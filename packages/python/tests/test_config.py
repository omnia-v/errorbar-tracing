import pytest

from errorbar_tracing import DEFAULT_ENDPOINT, TAG_ATTRIBUTE, resolve_config


def test_refuses_without_api_key():
    with pytest.raises(ValueError, match="ERRORBAR_API_KEY"):
        resolve_config(env={})


def test_defaults_to_gateway_with_bearer():
    c = resolve_config(api_key="sk_x", env={})
    assert c.endpoint == DEFAULT_ENDPOINT
    assert c.headers["Authorization"] == "Bearer sk_x"


def test_reads_env():
    c = resolve_config(
        env={
            "OMNIA_API_KEY": "sk_env",
            "OMNIA_TAG": "checkout-agent",
            "OMNIA_OTLP_ENDPOINT": "https://other.example/v1/traces",
            "OTEL_SERVICE_NAME": "svc",
        }
    )
    assert c.headers["Authorization"] == "Bearer sk_env"
    assert c.resource_attributes[TAG_ATTRIBUTE] == "checkout-agent"
    assert c.endpoint == "https://other.example/v1/traces"
    assert c.service_name == "svc"


def test_options_beat_env():
    c = resolve_config(
        api_key="sk_opt",
        tag="t2",
        env={"OMNIA_API_KEY": "sk_env", "OMNIA_TAG": "t1"},
    )
    assert c.headers["Authorization"] == "Bearer sk_opt"
    assert c.resource_attributes[TAG_ATTRIBUTE] == "t2"


def test_no_tag_means_no_attribute():
    c = resolve_config(api_key="k", env={})
    assert c.resource_attributes == {}


def test_errorbar_env_names_take_precedence_and_omnia_still_works():
    c = resolve_config(
        env={
            "ERRORBAR_API_KEY": "sk_new",
            "OMNIA_API_KEY": "sk_old",
            "ERRORBAR_TAG": "new-tag",
            "ERRORBAR_OTLP_ENDPOINT": "https://new.example/v1/traces",
        }
    )
    assert c.headers["Authorization"] == "Bearer sk_new"
    assert c.resource_attributes[TAG_ATTRIBUTE] == "new-tag"
    assert c.endpoint == "https://new.example/v1/traces"
    legacy = resolve_config(env={"OMNIA_API_KEY": "sk_old"})
    assert legacy.headers["Authorization"] == "Bearer sk_old"
