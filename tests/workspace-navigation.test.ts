import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("workspace position navigation", () => {
  it("opens resume screening inside the workspace instead of linking home", () => {
    const source = readFileSync(resolve(process.cwd(), "components/workspace-app.tsx"), "utf8");

    expect(source).toContain('onClick={() => setScreenOpen(true)}');
    expect(source).not.toMatch(/snapshot\.mode === "database"[\s\S]{0,300}<Link[^>]+href="\/"[^>]*>[\s\S]{0,120}Screen resumes/);
  });
});
