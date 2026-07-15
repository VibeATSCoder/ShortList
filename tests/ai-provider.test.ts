import { afterEach, describe, expect, it } from "vitest";

import { aiProviderConfig } from "@/lib/ai-provider";

const original = {
  APP_URL: process.env.APP_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
};

afterEach(() => {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("AI provider configuration", () => {
  it("detects OpenRouter keys and applies its compatible endpoint", () => {
    process.env.OPENAI_API_KEY = "sk-or-v1-test";
    delete process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_MODEL;
    delete process.env.OPENROUTER_API_KEY;

    expect(aiProviderConfig()).toMatchObject({
      provider: "openrouter",
      baseURL: "https://openrouter.ai/api/v1",
      model: "openai/gpt-4o",
    });
  });

  it("honors explicit OpenRouter endpoint and model configuration", () => {
    process.env.OPENAI_API_KEY = "custom-key";
    process.env.OPENAI_BASE_URL = "https://openrouter.ai/api/v1/";
    process.env.OPENAI_MODEL = "openai/gpt-4o-2024-08-06";

    expect(aiProviderConfig()).toMatchObject({
      provider: "openrouter",
      baseURL: "https://openrouter.ai/api/v1",
      model: "openai/gpt-4o-2024-08-06",
    });
  });
});
