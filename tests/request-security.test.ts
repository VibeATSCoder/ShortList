import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectedOrigin, isSameOrigin } from "@/lib/request-security";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("request origin validation", () => {
  it("uses the configured public origin instead of forwarded client headers", () => {
    vi.stubEnv("APP_URL", "https://ats.mehdisharifi.com/workspace");
    vi.stubEnv("NODE_ENV", "production");
    const request = new NextRequest("http://127.0.0.1:3000/api/screen", {
      headers: {
        origin: "https://ats.mehdisharifi.com",
        "x-forwarded-host": "attacker.example",
        "x-forwarded-proto": "https",
      },
    });

    expect(expectedOrigin(request)).toBe("https://ats.mehdisharifi.com");
    expect(isSameOrigin(request)).toBe(true);
  });

  it("rejects an origin that only matches a spoofed forwarded host", () => {
    vi.stubEnv("APP_URL", "https://ats.mehdisharifi.com");
    vi.stubEnv("NODE_ENV", "production");
    const request = new NextRequest("http://127.0.0.1:3000/api/screen", {
      headers: {
        origin: "https://attacker.example",
        "x-forwarded-host": "attacker.example",
        "x-forwarded-proto": "https",
      },
    });

    expect(isSameOrigin(request)).toBe(false);
  });

  it("requires an Origin header in production", () => {
    vi.stubEnv("APP_URL", "https://ats.mehdisharifi.com");
    vi.stubEnv("NODE_ENV", "production");
    const request = new NextRequest("https://ats.mehdisharifi.com/api/screen");

    expect(isSameOrigin(request)).toBe(false);
  });
});
