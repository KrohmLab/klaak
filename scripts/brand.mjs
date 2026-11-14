// Génère les visuels de marque à partir de public/logo.svg : image Open Graph, favicon, icône iOS.
// À relancer seulement si le logo change : `npm run brand`. Les fichiers générés sont commités.
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const logo = await readFile("public/logo.svg", "utf8");
const d = logo.match(/<path d="([^"]+)"/)?.[1];
if (!d) throw new Error("Tracé introuvable dans public/logo.svg");
const [W, H] = [1307, 924]; // viewBox du logo

const VOID = "#07060d";
const layer = (color, dx = 0, dy = 0, extra = "") => `<path d="${d}" fill="${color}" fill-rule="evenodd" transform="translate(${dx} ${dy})" ${extra}/>`;

// Open Graph 1200 × 630 : logo en glitch chromatique sur fond sombre.
const s = 0.6;
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="c" cx="28%" cy="40%" r="55%"><stop offset="0" stop-color="#19e3ff" stop-opacity=".22"/><stop offset="1" stop-color="#19e3ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="m" cx="74%" cy="62%" r="55%"><stop offset="0" stop-color="#ff2bd6" stop-opacity=".25"/><stop offset="1" stop-color="#ff2bd6" stop-opacity="0"/></radialGradient>
    <clipPath id="s1"><rect x="0" y="${H * 0.41}" width="${W}" height="${H * 0.07}"/></clipPath>
    <clipPath id="s2"><rect x="0" y="${H * 0.66}" width="${W}" height="${H * 0.03}"/></clipPath>
  </defs>
  <rect width="1200" height="630" fill="${VOID}"/>
  <rect width="1200" height="630" fill="url(#c)"/>
  <rect width="1200" height="630" fill="url(#m)"/>
  <g transform="translate(${(1200 - W * s) / 2} ${(630 - H * s) / 2}) scale(${s})">
    ${layer("#19e3ff", -26, 8)}
    ${layer("#ff2bd6", 26, -8)}
    ${layer("#f4f2ff")}
    <g clip-path="url(#s1)">${layer("#f4f2ff", 60, 0)}</g>
    <g clip-path="url(#s2)">${layer("#c6ff1a", -44, 0)}</g>
  </g>
  <rect x="0" y="0" width="1200" height="10" fill="#c6ff1a"/>
</svg>`;
await sharp(Buffer.from(og)).png({ compressionLevel: 9, palette: true }).toFile("public/og.png");

// Favicon et icône iOS : logo vert acide sur carré sombre.
const icon = (size, pad) => {
  const k = (size - pad * 2) / W;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${VOID}"/><g transform="translate(${pad} ${(size - H * k) / 2}) scale(${k})">${layer("#c6ff1a")}</g></svg>`;
};
await writeFile("public/favicon.svg", icon(64, 3));
await sharp(Buffer.from(icon(180, 14))).png().toFile("public/apple-touch-icon.png");
console.log("Générés : public/og.png, public/favicon.svg, public/apple-touch-icon.png");
