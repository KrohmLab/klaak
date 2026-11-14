// Formulaire de booking : validation côté navigateur, Turnstile chargé à l'approche du formulaire,
// envoi en JSON vers /api/booking. Le serveur revalide tout (worker/index.ts).

type Turnstile = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id?: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
    __klaakTurnstile?: () => void;
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function initBooking() {
  const form = document.querySelector<HTMLFormElement>("[data-booking]");
  if (!form) return;
  const sitekey = form.dataset.sitekey ?? "";
  const status = form.querySelector<HTMLElement>("[data-status]");
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const slot = form.querySelector<HTMLElement>("[data-turnstile]");
  const msg = form.dataset;
  let token = "";
  let widget: string | undefined;

  const say = (text: string, kind: "error" | "success" | "info") => {
    if (!status) return;
    status.textContent = text;
    status.dataset.kind = kind;
  };

  // Turnstile : chargé seulement quand le formulaire approche de l'écran.
  if (sitekey && slot) {
    const load = () => {
      window.__klaakTurnstile = () => {
        widget = window.turnstile?.render(slot, {
          sitekey,
          theme: "dark",
          callback: (value: string) => (token = value),
          "expired-callback": () => (token = ""),
          "error-callback": () => (token = ""),
        });
      };
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__klaakTurnstile";
      script.async = true;
      document.head.append(script);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          load();
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(form);
  }

  const setError = (input: HTMLInputElement | HTMLTextAreaElement, text: string) => {
    const field = input.closest(".field");
    let error = field?.querySelector<HTMLElement>(".field__error");
    if (!text) {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
      error?.remove();
      return;
    }
    if (!error && field) {
      error = document.createElement("p");
      error.className = "field__error";
      error.id = `${input.id}-err`;
      field.append(error);
    }
    if (error) error.textContent = text;
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", `${input.id}-err`);
  };

  const validate = () => {
    let first: HTMLElement | undefined;
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(".field input, .field textarea").forEach((input) => {
      const value = input.value.trim();
      let text = "";
      if (input.required && !value) text = msg.msgRequired ?? "";
      else if (input.type === "email" && value && !EMAIL.test(value)) text = msg.msgEmail ?? "";
      setError(input, text);
      if (text && !first) first = input;
    });
    first?.focus();
    return !first;
  };

  form.addEventListener("input", (event) => {
    const input = event.target as HTMLInputElement;
    if (input.getAttribute("aria-invalid")) setError(input, "");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!sitekey || !submit || !validate()) return;
    if (!token) return say(msg.msgCaptcha ?? "", "error");

    const label = submit.textContent;
    submit.disabled = true;
    submit.textContent = msg.msgSending ?? "";
    say("", "info");
    try {
      const body = { ...Object.fromEntries(new FormData(form)), token };
      const res = await fetch("/api/booking", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; field?: string };
      if (data.ok) {
        form.reset();
        say(msg.msgSuccess ?? "", "success");
      } else if (data.error === "field" && data.field) {
        const input = form.querySelector<HTMLInputElement>(`[name="${data.field}"]`);
        if (input) {
          setError(input, input.type === "email" ? (msg.msgEmail ?? "") : (msg.msgRequired ?? ""));
          input.focus();
        }
      } else {
        say(data.error === "captcha" ? (msg.msgCaptcha ?? "") : (msg.msgError ?? ""), "error");
      }
    } catch {
      say(msg.msgError ?? "", "error");
    } finally {
      // Un jeton Turnstile ne sert qu'une fois : on en redemande un pour un éventuel nouvel envoi.
      token = "";
      window.turnstile?.reset(widget);
      submit.disabled = false;
      submit.textContent = label;
    }
  });
}
