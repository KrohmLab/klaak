import { describe, expect, it } from "vitest";
import hyper from "../../data/hyper.json";
import { frameImg, type Focal } from "../framing";
import { layout } from "../portal";
import { buildTimeline } from "../timeline";

// Proportions réelles des photos (largeur / hauteur).
const AR: Record<string, number> = { "drop-scene": 1 };
const photos = Object.entries(hyper.photos).map(([id, p]) => ({ id, focal: { ...p, ar: AR[p.photo] ?? 1.5 } as unknown as Focal }));
const tl = buildTimeline([
  { id: "a", preview: false, s0: 1 },
  { id: "b", preview: true, s0: 0.52, portal: (w, h) => (w < 760 ? [w * 0.5, h * 0.64] : [w * 0.74, h * 0.46]) },
  { id: "c", preview: true, s0: 0.52 },
]);
const VIEWPORTS = [
  { w: 1440, h: 900 },
  { w: 1920, h: 1080 },
  { w: 375, h: 812 },
  { w: 1024, h: 1366 },
];

describe("cadrage photo", () => {
  it("l'image couvre toujours la zone révélée, au repos comme pendant l'ouverture", () => {
    for (const { id, focal } of photos)
      for (const vp of VIEWPORTS)
        for (const scene of [1, 2])
          for (let u = 0; u <= 2; u += 0.01) {
            const s = layout(tl, u, vp).scenes[scene]!;
            if (!s.visible) continue;
            const e = s.entering;
            const ctx = e
              ? { pan: e.pan, lx: e.lens[0], ly: e.lens[1], rl: e.rLocal, ent: { sc: e.sc, g: e.center, tx: e.tx, ty: e.ty, s0: e.s0 } }
              : { pan: 1, lx: vp.w / 2, ly: vp.h / 2, rl: 1e5, ent: null };
            const f = frameImg(focal, vp.w, vp.h, ctx);
            const iw = f.bw * f.k;
            const ih = f.bh * f.k;
            const left = vp.w / 2 + f.sx - iw / 2;
            const top = vp.h / 2 + f.sy - ih / 2;
            const msg = `${id} ${vp.w}×${vp.h} scène ${scene} u=${u.toFixed(2)}`;
            expect(left, msg).toBeLessThanOrEqual(Math.max(0, ctx.lx - ctx.rl) + 0.5);
            expect(top, msg).toBeLessThanOrEqual(Math.max(0, ctx.ly - ctx.rl) + 0.5);
            expect(left + iw, msg).toBeGreaterThanOrEqual(Math.min(vp.w, ctx.lx + ctx.rl) - 0.5);
            expect(top + ih, msg).toBeGreaterThanOrEqual(Math.min(vp.h, ctx.ly + ctx.rl) - 0.5);
          }
  }, 60_000);
});
