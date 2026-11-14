// Worker du site : tout est servi en fichiers statiques (dist/), sauf /api/booking, qui reçoit une demande
// de booking, vérifie le jeton Turnstile puis envoie le mail via Resend.
// Secrets Cloudflare (variables du Worker, jamais dans le dépôt) : TURNSTILE_SECRET_KEY, RESEND_API_KEY.
// En local : fichier .dev.vars (ignoré par git).

type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  TURNSTILE_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
};

const FROM = "Klaak Booking <booking-klaak@outrance.org>";
const TO = "kevin@outrance.org";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Champs du formulaire : nom du champ → [libellé dans le mail, longueur max, obligatoire].
const FIELDS = {
  name: ["Nom", 120, true],
  email: ["E-mail", 254, true],
  structure: ["Structure / événement", 200, true],
  date: ["Date", 80, true],
  place: ["Lieu", 200, true],
  duration: ["Durée de set", 80, false],
  message: ["Message", 4000, false],
} as const;
type Field = keyof typeof FIELDS;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

/** Une seule ligne, sans retour chariot (évite toute injection dans le sujet du mail). */
const oneLine = (s: string) => s.replace(/[\r\n\t]+/g, " ").trim();

async function booking(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json(405, { ok: false, error: "method" });

  // Vérification d'origine : la demande doit venir du site lui-même.
  if (request.headers.get("origin") !== new URL(request.url).origin) return json(403, { ok: false, error: "origin" });

  let data: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 10_000) return json(413, { ok: false, error: "size" });
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) throw new Error("not an object");
    data = parsed as Record<string, unknown>;
  } catch {
    return json(400, { ok: false, error: "json" });
  }

  // Champ piège invisible : un robot le remplit, une personne jamais. On répond « ok » sans rien envoyer.
  if (typeof data.website === "string" && data.website.trim() !== "") return json(200, { ok: true });

  const values = {} as Record<Field, string>;
  for (const key of Object.keys(FIELDS) as Field[]) {
    const [, max, required] = FIELDS[key];
    const raw = typeof data[key] === "string" ? (data[key] as string).trim() : "";
    const value = key === "message" ? raw : oneLine(raw);
    if ((required && value === "") || value.length > max) return json(400, { ok: false, error: "field", field: key });
    values[key] = value;
  }
  if (!EMAIL.test(values.email)) return json(400, { ok: false, error: "field", field: "email" });

  if (!env.TURNSTILE_SECRET_KEY || !env.RESEND_API_KEY) return json(503, { ok: false, error: "config" });

  // Jeton Turnstile, vérifié côté serveur.
  const token = typeof data.token === "string" ? data.token : "";
  if (token === "" || token.length > 2048) return json(400, { ok: false, error: "captcha" });
  const check = new FormData();
  check.set("secret", env.TURNSTILE_SECRET_KEY);
  check.set("response", token);
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) check.set("remoteip", ip);
  const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: check });
  const outcome = (await verify.json().catch(() => ({}))) as { success?: boolean };
  if (!outcome.success) return json(400, { ok: false, error: "captcha" });

  const text = (Object.keys(FIELDS) as Field[])
    .map((key) => `${FIELDS[key][0]} : ${values[key] || "—"}`)
    .join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      reply_to: values.email,
      subject: `Booking Klaak — ${values.structure} (${values.date})`,
      text,
    }),
  });
  if (!res.ok) {
    // Détail dans les logs du Worker uniquement (jamais la clé).
    console.error(`resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return json(502, { ok: false, error: "provider" });
  }
  return json(200, { ok: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/booking") return booking(request, env);
    if (url.pathname.startsWith("/api/")) return json(404, { ok: false, error: "not_found" });
    return env.ASSETS.fetch(request);
  },
};
