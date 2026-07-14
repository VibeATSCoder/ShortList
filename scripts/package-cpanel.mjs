import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, ".next", "standalone");
const target = join(root, "dist-cpanel");

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
await mkdir(join(target, ".next"), { recursive: true });
await cp(join(root, ".next", "static"), join(target, ".next", "static"), { recursive: true });
try {
  await cp(join(root, "public"), join(target, "public"), { recursive: true });
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
await cp(join(root, "database"), join(target, "database"), { recursive: true });
await cp(join(root, "docs", "CPANEL-DEPLOYMENT.md"), join(target, "CPANEL-DEPLOYMENT.md"));
await cp(join(root, ".env.cpanel.example"), join(target, ".env.cpanel.example"));
await mkdir(join(target, "scripts"), { recursive: true });
await cp(join(root, "scripts", "bootstrap-admin.mjs"), join(target, "scripts", "bootstrap-admin.mjs"));

const appJs = `"use strict";\nprocess.env.NODE_ENV = "production";\nrequire("./server.js");\n`;
await writeFile(join(target, "app.js"), appJs, "utf8");

const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
await writeFile(
  join(target, "release.json"),
  JSON.stringify({
    name: packageJson.name,
    version: packageJson.version,
    deploymentId: process.env.DEPLOYMENT_ID || "set-DEPLOYMENT_ID-during-release",
    builtAt: new Date().toISOString(),
    platform: process.platform,
    architecture: process.arch,
    node: process.version,
  }, null, 2),
  "utf8",
);

console.log(`cPanel artifact ready: ${target}`);
if (process.platform !== "linux") {
  console.warn("Validation artifact only: rebuild this package on the cPanel Linux host before deployment.");
}
