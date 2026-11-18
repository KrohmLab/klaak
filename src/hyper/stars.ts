// Étoiles (spec §6) : elles jaillissent du portail actif, s'étirent en warp avec la vitesse et repartent en
// arrière quand on recule. Port du `drawStars()` du prototype, avec un tracé groupé par profondeur (≈ 36 traits
// par image au lieu de 1 260) : même rendu, beaucoup moins de travail pour le navigateur.

type Star = { x: number; y: number; z: number; pz: number };

const COUNT = 420;
const BUCKETS = 12;

export class Stars {
  private stars: Star[] = [];
  private cx: number | null = null;
  private cy: number | null = null;

  constructor() {
    for (let i = 0; i < COUNT; i++) this.stars.push({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random(), pz: 1 });
  }

  /**
   * @param speed vitesse de défilement des étoiles (négative = elles reculent)
   * @param vel   intensité de la vitesse de scroll (0 → 1), qui écarte les canaux cyan/magenta
   * @param boost luminosité supplémentaire (kick)
   * @param rgb   couleur du set en cours
   * @param center centre d'émission visé (le portail actif)
   */
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, dt: number, speed: number, vel: number, boost: number, rgb: [number, number, number], center: [number, number]) {
    this.cx = this.cx == null ? w / 2 : this.cx + (center[0] - this.cx) * 0.08;
    this.cy = this.cy == null ? h / 2 : this.cy + (center[1] - this.cy) * 0.08;
    const cx = this.cx;
    const cy = this.cy;
    const f = Math.max(w, h) * 0.25;
    const split = 1.5 + vel * 12;
    const gain = 0.3 + vel * 0.9 + boost * 0.3;

    // Segments regroupés par tranche de profondeur : même épaisseur et même opacité dans une tranche.
    const groups: number[][] = Array.from({ length: BUCKETS }, () => []);
    for (const s of this.stars) {
      s.pz = s.z;
      s.z -= speed * dt;
      if (s.z <= 0.03) {
        s.x = Math.random() * 2 - 1;
        s.y = Math.random() * 2 - 1;
        s.z = 1;
        s.pz = 1;
        continue;
      }
      if (s.z > 1) {
        s.x = Math.random() * 2 - 1;
        s.y = Math.random() * 2 - 1;
        s.z = 0.05 + Math.random() * 0.1;
        s.pz = s.z;
        continue;
      }
      const x = cx + (s.x / s.z) * f;
      const y = cy + (s.y / s.z) * f;
      if (x < -60 || x > w + 60 || y < -60 || y > h + 60) {
        s.z = speed >= 0 ? 0 : 2;
        continue;
      }
      const px = cx + (s.x / s.pz) * f;
      const py = cy + (s.y / s.pz) * f;
      const b = Math.min(BUCKETS - 1, Math.floor((1 - s.z) * BUCKETS));
      groups[b]!.push(px, py, x, y);
    }

    ctx.lineCap = "round";
    const channels: [string, number, number][] = [
      ["25,227,255", -split, 0.75],
      ["255,43,214", split, 0.75],
      [`${rgb[0]},${rgb[1]},${rgb[2]}`, 0, 1],
    ];
    groups.forEach((seg, b) => {
      if (!seg.length) return;
      const depth = (b + 0.5) / BUCKETS; // = 1 − z moyen de la tranche
      const a = Math.min(1, depth * gain);
      if (a < 0.01) return;
      ctx.lineWidth = depth * 2.2 + 0.4;
      for (const [col, dx, k] of channels) {
        ctx.strokeStyle = `rgba(${col},${(a * k).toFixed(3)})`;
        ctx.beginPath();
        for (let q = 0; q < seg.length; q += 4) {
          ctx.moveTo(seg[q]! + dx, seg[q + 1]!);
          ctx.lineTo(seg[q + 2]! + dx + (dx === 0 ? 0.01 : 0), seg[q + 3]!);
        }
        ctx.stroke();
      }
    });
  }
}
