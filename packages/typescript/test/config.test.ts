import { describe, it, expect } from "vitest";
import { resolveConfig, DEFAULT_ENDPOINT, TAG_ATTRIBUTE } from "../src/config";

const ENV = {} as NodeJS.ProcessEnv;

describe("resolveConfig", () => {
  it("refuses to start without an API key — no silent nowhere-exporter", () => {
    expect(() => resolveConfig({}, ENV)).toThrow(/OMNIA_API_KEY/);
  });

  it("defaults to the Omnia gateway endpoint with a bearer header", () => {
    const c = resolveConfig({ apiKey: "sk_x" }, ENV);
    expect(c.endpoint).toBe(DEFAULT_ENDPOINT);
    expect(c.headers.Authorization).toBe("Bearer sk_x");
  });

  it("reads key, tag, endpoint and service name from env", () => {
    const c = resolveConfig({}, {
      OMNIA_API_KEY: "sk_env",
      OMNIA_TAG: "checkout-agent",
      OMNIA_OTLP_ENDPOINT: "https://other.example/v1/traces",
      OTEL_SERVICE_NAME: "svc",
    } as NodeJS.ProcessEnv);
    expect(c.headers.Authorization).toBe("Bearer sk_env");
    expect(c.resourceAttributes[TAG_ATTRIBUTE]).toBe("checkout-agent");
    expect(c.endpoint).toBe("https://other.example/v1/traces");
    expect(c.serviceName).toBe("svc");
  });

  it("explicit options beat env", () => {
    const c = resolveConfig(
      { apiKey: "sk_opt", tag: "t2" },
      { OMNIA_API_KEY: "sk_env", OMNIA_TAG: "t1" } as NodeJS.ProcessEnv,
    );
    expect(c.headers.Authorization).toBe("Bearer sk_opt");
    expect(c.resourceAttributes[TAG_ATTRIBUTE]).toBe("t2");
  });

  it("omits the tag attribute entirely when no tag is set", () => {
    const c = resolveConfig({ apiKey: "k" }, ENV);
    expect(Object.keys(c.resourceAttributes)).toHaveLength(0);
  });
});

describe("OpenAIInstrumentationWide", () => {
  it("widens upstream's openai pin to include v7 (live-drilled 2026-08-21)", async () => {
    const { OpenAIInstrumentationWide } = await import("../src/index");
    const inst = new OpenAIInstrumentationWide() as unknown as {
      init(): { name: string; supportedVersions: string[] } | Array<{ name: string; supportedVersions: string[] }>;
    };
    const def = inst.init();
    const defs = Array.isArray(def) ? def : [def];
    const openai = defs.find((d) => d.name === "openai");
    expect(openai?.supportedVersions).toEqual([">=4 <8"]);
  });
});
