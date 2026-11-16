import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Next.js crashes at request time if a "use server" file exports
 * anything but async functions (a constant, an object, a re-export).
 * Types are fine because they disappear at build time.
 */
const ROOTS = ["app", "lib", "components"];
const SKIP = new Set(["node_modules", ".next", "generated"]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts") ? [full] : [];
  });
}

function badExports(source: string): string[] {
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("export "))
    .filter(
      (line) =>
        !/^export\s+async\s+function\b/.test(line) &&
        !/^export\s+default\s+async\s+function\b/.test(line) &&
        !/^export\s+(type|interface)\b/.test(line),
    );
}

describe('"use server" files', () => {
  const files = ROOTS.flatMap((root) => sourceFiles(root)).filter((file) =>
    /^\s*["']use server["']/.test(readFileSync(file, "utf8")),
  );

  it("finds server action files", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s only exports async functions", (file) => {
    expect(badExports(readFileSync(file, "utf8"))).toEqual([]);
  });
});
