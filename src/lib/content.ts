// Accès typé au contenu de src/data/. Les composants passent par ici, jamais par des textes en dur.
import type { ImageMetadata } from "astro";
import datesJson from "../data/dates.json";
import setsJson from "../data/sets.json";
import site from "../data/site.json";
import copy from "../data/copy.json";

/** `null` dans les données = information manquante → affichée comme placeholder [À COMPLÉTER]. */
export type KDate = {
  id: string;
  when: string;
  start: string;
  end: string;
  event: string;
  organizer: string | null;
  venue: string | null;
  city: string | null;
  poster: string | null;
  set: string | null;
  badges: string[];
  link: string | null;
};
export type KSet = {
  id: string;
  title: string;
  /** Ligne d'info sous le titre (événement, lieu, mois). */
  sub: string;
  url: string;
  /** Couleur du set : elle recolore tout le site quand il est choisi. */
  color: string;
  /** Pochette : une affiche de src/assets/posters, ou une photo cadrée sur un point (fx, fy). */
  art: { poster: string } | { photo: string; fx: number; fy: number };
};

export const dates: KDate[] = datesJson;
export const sets: KSet[] = setsJson;
export { site, copy };

const bios = import.meta.glob<string>("../data/bio.*.md", { query: "?raw", import: "default", eager: true });
export const bio = { fr: (bios["../data/bio.fr.md"] ?? "").trim(), en: (bios["../data/bio.en.md"] ?? "").trim() };

const posters = import.meta.glob<{ default: ImageMetadata }>("../assets/posters/*", { eager: true });
const photos = import.meta.glob<{ default: ImageMetadata }>("../assets/photos/*", { eager: true });

export const poster = (file: string | null) => (file ? posters[`../assets/posters/${file}`]?.default : undefined);
export function photo(name: string): ImageMetadata {
  const hit = Object.entries(photos).find(([path]) => path.split("/").pop()?.replace(/\.\w+$/, "") === name);
  if (!hit) throw new Error(`Photo introuvable dans src/assets/photos : ${name}`);
  return hit[1].default;
}
export const setById = (id: string | null) => sets.find((s) => s.id === id);
