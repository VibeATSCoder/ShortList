const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export type AIProviderConfig = {
  apiKey?: string;
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
  model: string;
  provider: "openai" | "openrouter";
};

export function aiProviderConfig(): AIProviderConfig {
  const openRouterKey = clean(process.env.OPENROUTER_API_KEY);
  const apiKey = openRouterKey ?? clean(process.env.OPENAI_API_KEY);
  const configuredBaseURL = clean(process.env.OPENAI_BASE_URL)?.replace(/\/+$/, "");
  const provider =
    openRouterKey ||
    configuredBaseURL === OPENROUTER_BASE_URL ||
    apiKey?.startsWith("sk-or-")
      ? "openrouter"
      : "openai";
  const baseURL = configuredBaseURL ?? (provider === "openrouter" ? OPENROUTER_BASE_URL : undefined);
  const appUrl = clean(process.env.APP_URL) ?? "https://ats.mehdisharifi.com";

  return {
    apiKey,
    baseURL,
    provider,
    model:
      clean(process.env.OPENAI_MODEL) ??
      (provider === "openrouter" ? "openai/gpt-4o" : "gpt-5.6"),
    ...(provider === "openrouter"
      ? {
          defaultHeaders: {
            "HTTP-Referer": appUrl,
            "X-OpenRouter-Title": "Shortlist ATS",
          },
        }
      : {}),
  };
}
