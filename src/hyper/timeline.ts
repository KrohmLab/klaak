// Timeline du voyage : position de chaque scène sur l'axe virtuel `u` (en « unités de scène ») et arrêts
// d'aimantation. Tout est calculé depuis la liste des scènes, donc depuis les données (nombre de dates…).

export type SceneSpec = {
  id: string;
  /** Longueur en unités : 1 par défaut (1 unité de passage, le reste en « hold »). */
  len?: number;
  /** Arrêts d'aimantation supplémentaires, relatifs au début de la scène (ex. fin du hold des sets). */
  stops?: number[];
  /** Le portail de cette scène s'ouvre depuis un rayon r0 (aperçu au repos) plutôt que depuis 0. */
  preview: boolean;
  /** Échelle de départ de la scène quand elle entre (S0) : 0,52 pour une photo, 1 pour une scène à lentille. */
  s0: number;
  /** Centre du portail qui révèle cette scène, en fraction de l'écran. Défaut : centre. */
  portal?: (w: number, h: number) => [number, number];
};

export type Timeline = {
  scenes: SceneSpec[];
  start: number[];
  len: number[];
  /** Début de la dernière scène : on ne va jamais au-delà. */
  umax: number;
  /** Arrêts d'aimantation, triés. */
  stops: number[];
};

export function buildTimeline(scenes: SceneSpec[]): Timeline {
  const start: number[] = [];
  const len = scenes.map((s) => s.len ?? 1);
  let acc = 0;
  for (const l of len) {
    start.push(acc);
    acc += l;
  }
  const stops = [...start];
  scenes.forEach((s, i) => s.stops?.forEach((k) => stops.push((start[i] ?? 0) + k)));
  stops.sort((a, b) => a - b);
  return { scenes, start, len, umax: start[start.length - 1] ?? 0, stops: [...new Set(stops)] };
}

/** Indice de la scène qui commence le plus près en dessous de `u` (utile pour la navigation clavier). */
export function sceneAt(tl: Timeline, u: number): number {
  let i = 0;
  tl.start.forEach((s, k) => {
    if (u >= s - 1e-6) i = k;
  });
  return i;
}
