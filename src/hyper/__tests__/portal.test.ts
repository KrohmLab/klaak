import { describe, expect, it } from "vitest";
import { layout, type Viewport } from "../portal";
import { buildTimeline, type SceneSpec } from "../timeline";
import { snapStep, snapTarget } from "../snap";

// Même structure que le prototype : intro au portail décalé, scènes photo, sets (lentille), dates, booking.
const offset = (w: number, h: number): [number, number] => (w < 760 ? [w * 0.5, h * 0.64] : [w * 0.74, h * 0.46]);
const SCENES: SceneSpec[] = [
  { id: "intro", preview: false, s0: 1 },
  { id: "a", preview: true, s0: 0.52, portal: offset },
  { id: "b", preview: true, s0: 0.52 },
  { id: "c", preview: true, s0: 0.52 },
  { id: "d", preview: true, s0: 0.52 },
  { id: "sets", preview: true, s0: 1, len: 1.5, stops: [0.5] },
  { id: "dates", preview: false, s0: 1, len: 1 + 0.32 * 10 },
  { id: "booking", preview: false, s0: 0.52 },
];
const tl = buildTimeline(SCENES);
const VIEWPORTS: Viewport[] = [
  { w: 1440, h: 900 },
  { w: 1920, h: 1080 },
  { w: 1024, h: 1366 },
  { w: 375, h: 812 },
  { w: 390, h: 664 },
  { w: 2560, h: 1080 },
];

describe("timeline", () => {
  it("place les scènes bout à bout et trie les arrêts", () => {
    expect(tl.start).toEqual([0, 1, 2, 3, 4, 5, 6.5, 6.5 + 4.2]);
    expect(tl.umax).toBeCloseTo(10.7);
    expect(tl.stops).toContain(5.5);
    expect([...tl.stops].sort((a, b) => a - b)).toEqual(tl.stops);
  });
});

describe("portail", () => {
  it("l'image qui entre couvre toujours toute la zone révélée (jamais de bord visible)", () => {
    for (const vp of VIEWPORTS) {
      for (let u = 0; u <= tl.umax; u += 0.004) {
        const f = layout(tl, u, vp);
        f.scenes.forEach((s, i) => {
          if (!s.visible || !s.clip) return;
          const R = s.clip.r * s.scale;
          const c = s.origin;
          // Points du bord de (cercle ∩ écran) : contour du cercle rabattu dans l'écran, plus les coins couverts.
          const pts: [number, number][] = [];
          for (let k = 0; k < 64; k++) {
            const a = (k / 64) * Math.PI * 2;
            pts.push([Math.max(0, Math.min(vp.w, c[0] + Math.cos(a) * R)), Math.max(0, Math.min(vp.h, c[1] + Math.sin(a) * R))]);
          }
          for (const p of pts) {
            const lx = s.origin[0] + (p[0] - s.origin[0] - s.tx) / s.scale;
            const ly = s.origin[1] + (p[1] - s.origin[1] - s.ty) / s.scale;
            const msg = `${vp.w}×${vp.h} u=${u.toFixed(4)} scène ${i}`;
            expect(lx, msg).toBeGreaterThanOrEqual(-0.5);
            expect(lx, msg).toBeLessThanOrEqual(vp.w + 0.5);
            expect(ly, msg).toBeGreaterThanOrEqual(-0.5);
            expect(ly, msg).toBeLessThanOrEqual(vp.h + 0.5);
          }
        });
      }
    }
  }, 120_000);

  it("le centre du cercle reste sur le centre du portail à l'écran", () => {
    const vp = VIEWPORTS[0]!;
    for (let u = 0; u < 2; u += 0.01) {
      layout(tl, u, vp).scenes.forEach((s) => {
        if (!s.clip) return;
        const sx = s.origin[0] + s.scale * (s.clip.x - s.origin[0]) + s.tx;
        const sy = s.origin[1] + s.scale * (s.clip.y - s.origin[1]) + s.ty;
        expect(sx).toBeCloseTo(s.origin[0], 3);
        expect(sy).toBeCloseTo(s.origin[1], 3);
      });
    }
  });

  it("aucun saut : rayon croissant et échelle continue quand u avance", () => {
    for (const vp of VIEWPORTS) {
      let prev = layout(tl, 0, vp);
      for (let u = 0.0005; u <= tl.umax; u += 0.0005) {
        const f = layout(tl, u, vp);
        f.scenes.forEach((s, i) => {
          const p = prev.scenes[i]!;
          // Pendant l'éclosion (enter = 0), le rebond easeOutBack est voulu : on ne contrôle que l'ouverture.
          if (s.clip && p.clip && s.enter && p.enter) {
            const msg = `${vp.w}×${vp.h} u=${u.toFixed(4)} scène ${i}`;
            expect(s.clip.r * s.scale, msg).toBeGreaterThanOrEqual(p.clip.r * p.scale - 1e-6);
            expect(Math.abs(s.scale - p.scale), msg).toBeLessThan(0.02);
            expect(Math.hypot(s.tx - p.tx, s.ty - p.ty), msg).toBeLessThan(3);
          }
        });
        prev = f;
      }
    }
  }, 120_000);

  it("au repos sur une scène, le portail suivant est ouvert au rayon 19 vh", () => {
    const vp = VIEWPORTS[0]!;
    const f = layout(tl, tl.start[2]!, vp);
    expect(f.chapter).toBe(2);
    expect(f.rings.rest.on).toBe(true);
    expect(f.rings.rest.r).toBeCloseTo(vp.h * 0.19, 1);
    expect(f.scenes[3]!.visible).toBe(true);
    expect(f.scenes[4]!.visible).toBe(false);
  });

  it("au plus trois scènes peintes à la fois (sortante, entrante, portail suivant)", () => {
    for (let u = 0; u <= tl.umax; u += 0.01) expect(layout(tl, u, VIEWPORTS[0]!).scenes.filter((s) => s.visible).length).toBeLessThanOrEqual(3);
  });

  it("mode calme : ni zoom ni cercle", () => {
    for (let u = 0; u <= tl.umax; u += 0.01)
      layout(tl, u, VIEWPORTS[0]!, { reduced: true }).scenes.forEach((s) => {
        expect(s.scale).toBe(1);
        expect(s.clip).toBeNull();
      });
  });
});

describe("aimantation", () => {
  const stops = [0, 1, 2];
  it("avance vers l'arrêt suivant au-delà de 0,1 unité", () => expect(snapTarget(stops, 1.15, 1)).toBe(2));
  it("revient si on a seulement effleuré", () => expect(snapTarget(stops, 1.05, 1)).toBe(1));
  it("recule vers l'arrêt précédent", () => expect(snapTarget(stops, 1.6, -1)).toBe(1));
  it("se pose exactement sur l'arrêt", () => {
    let t = 1.5;
    for (let k = 0; k < 600; k++) t = snapStep(stops, t, 1, 1 / 60);
    expect(t).toBe(2);
  });
});
