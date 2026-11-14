/** Hauteurs (en %) d'une forme d'onde décorative, stable d'un build à l'autre pour une même graine. */
export function wave(seed: string, bars: number): number[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return Array.from({ length: bars }, (_, i) => {
    h = Math.imul(h ^ (h >>> 13), 1274126177) + i;
    const noise = ((h >>> 8) % 1000) / 1000;
    const envelope = 0.55 + 0.45 * Math.sin((i / bars) * Math.PI * 3);
    return Math.round(18 + 82 * noise * envelope);
  });
}
