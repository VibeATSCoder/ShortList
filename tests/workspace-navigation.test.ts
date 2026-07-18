import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("workspace position navigation", () => {
  it("opens resume screening inside the workspace instead of linking home", () => {
    const source = readFileSync(resolve(process.cwd(), "components/workspace-app.tsx"), "utf8");

    expect(source).toContain('onClick={() => setScreenOpen(true)}');
    expect(source).not.toMatch(/snapshot\.mode === "database"[\s\S]{0,300}<Link[^>]+href="\/"[^>]*>[\s\S]{0,120}Screen resumes/);
  });

  it("opens resume screening from the empty-position action", () => {
    const source = readFileSync(resolve(process.cwd(), "components/workspace-app.tsx"), "utf8");

    expect(source).toContain('<button className="button button--dark" onClick={onScreen} type="button">');
    expect(source).toContain('onScreen={() => setScreenOpen(true)}');
    expect(source).not.toContain('<Link className="button button--dark" href="/"><FileSearch size={16} />{t.portfolio}</Link>');
  });
});
