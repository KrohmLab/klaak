// Aimantation directionnelle (spec §1, prototype `frame()`).
// Quand l'utilisateur lâche, `T` se pose sur l'arrêt suivant dans le sens du mouvement, sauf s'il n'a fait
// qu'effleurer (< 0,1 unité depuis l'arrêt précédent), auquel cas il revient.

export const SNAP = {
  /** Délai sans entrée avant d'aimanter (ms). */
  idle: 380,
  /** En dessous de cette distance parcourue, on revient à l'arrêt de départ. */
  brush: 0.1,
  /** Vitesse d'approche (par seconde). */
  rate: 3.4,
  /** À moins de cette distance, on se pose exactement (sinon les portails n'apparaissent pas en avançant). */
  settle: 1e-3,
} as const;

/** Cible d'aimantation pour la position `t`, selon le dernier sens de défilement (`dir` : +1 ou −1). */
export function snapTarget(stops: number[], t: number, dir: number): number {
  let prev = stops[0] ?? 0;
  let next = stops[stops.length - 1] ?? 0;
  for (const s of stops) if (s <= t + 1e-6) prev = s;
  for (let q = stops.length - 1; q >= 0; q--) {
    const s = stops[q] ?? 0;
    if (s >= t - 1e-6) next = s;
  }
  if (Math.abs(t - prev) < 1e-6) return prev;
  if (dir >= 0) return t - prev > SNAP.brush ? next : prev;
  return next - t > SNAP.brush ? prev : next;
}

/** Fait avancer `t` d'un pas d'aimantation (dt en secondes). */
export function snapStep(stops: number[], t: number, dir: number, dt: number): number {
  const target = snapTarget(stops, t, dir);
  const next = t + (target - t) * Math.min(1, dt * SNAP.rate);
  return Math.abs(target - next) < SNAP.settle ? target : next;
}

/** Arrêt suivant / précédent strictement au-delà de `t` (navigation clavier). */
export function nextStop(stops: number[], t: number): number | undefined {
  return stops.find((s) => s > t + 0.02);
}
export function prevStop(stops: number[], t: number): number | undefined {
  return [...stops].reverse().find((s) => s < t - 0.02);
}
