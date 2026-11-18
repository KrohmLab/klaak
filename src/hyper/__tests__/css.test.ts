// Garde-fou (spec §7) : une classe du voyage n'est définie que dans un seul composant. Deux bugs du prototype
// venaient de classes ou de variables qui se télescopaient.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = fileURLToPath(new URL("../../components/hyper", import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith(".astro"));

describe("CSS du voyage", () => {
  it("chaque classe .hx-* est définie dans un seul fichier", () => {
    const owner = new Map<string, string>();
    const clashes: string[] = [];
    for (const f of files) {
      const css = readFileSync(join(dir, f), "utf8").split("<style")[1] ?? "";
      // Sélecteurs qui DÉFINISSENT une classe (la classe est le dernier élément composé du sélecteur).
      const defined = new Set([...css.matchAll(/\.(hx-[a-z0-9_-]+)(?=[^{},]*\{)/g)].map((m) => m[1]!));
      for (const c of defined) {
        const prev = owner.get(c);
        if (prev && prev !== f) clashes.push(`${c} : ${prev} et ${f}`);
        else owner.set(c, f);
      }
    }
    // Classes volontairement partagées (lentille et portail des scènes 05 et 06, définis dans SetsScene).
    const shared = ["hx-lens", "hx-portal", "hx-portal2", "hx-art--fit", "hx-scene", "hx-on", "hx-mono", "hx-h2", "hx-mega"];
    expect(clashes.filter((c) => !shared.some((s) => c.startsWith(`${s} `)))).toEqual([]);
  });
});
