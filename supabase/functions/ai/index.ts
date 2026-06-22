// ============================================================
// WeDrink — AI proxy (Supabase Edge Function)
// Бұл функция Gemini кілтін СЕРВЕРДЕ сақтайды (браузерде көрінбейді).
// Екі істі атқарады:
//   1) AI чат  — body: { system, messages:[{role,content}] }
//   2) Сурет OCR — body: { system, prompt, image:<base64>, mime, json:true }
// Жауап әрқашан: { text: "..." }  (қате болса { error: "..." })
//
// ОРНАТУ (SQL Editor-ге ЕМЕС!):
//   Supabase Dashboard → Edge Functions → Create a function → аты: ai
//   → осы кодты қойып → Deploy.
// Құпиялар (Edge Functions → Secrets):
//   GEMINI_API_KEY     = сіздің Gemini кілтіңіз  (міндетті)
//   GEMINI_MODEL       = gemini-2.5-flash         (міндетті емес)
//   APP_SHARED_SECRET  = өзіңіз ойлаған құпиясөз  (міндетті емес, ұсынылады)
// ============================================================

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-app-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const json = (o: unknown, s = 200) =>
    new Response(JSON.stringify(o), {
      status: s,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  try {
    // Қосымша құпиясөзбен қорғау (қойылса)
    const SECRET = Deno.env.get("APP_SHARED_SECRET");
    if (SECRET && req.headers.get("x-app-secret") !== SECRET) {
      return json({ error: "unauthorized" }, 401);
    }

    const KEY = Deno.env.get("GEMINI_API_KEY");
    if (!KEY) return json({ error: "GEMINI_API_KEY қойылмаған" }, 500);
    const MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";

    const { system, messages, image, mime, prompt, json: wantJson } = await req.json();

    let contents;
    if (image) {
      // Сурет OCR
      contents = [{
        role: "user",
        parts: [
          { text: prompt || "Суретті оқы" },
          { inline_data: { mime_type: mime || "image/jpeg", data: image } },
        ],
      }];
    } else {
      // Әдеттегі чат
      contents = (messages || []).map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: String(m.content || "") }],
      }));
    }

    const gen: Record<string, unknown> = {
      maxOutputTokens: 2048,
      temperature: image ? 0.1 : 0.4,
    };
    if (wantJson) gen.responseMimeType = "application/json";

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: system ? { parts: [{ text: system }] } : undefined,
          contents,
          generationConfig: gen,
        }),
      },
    );

    const data = await r.json();
    if (!r.ok) return json({ error: data?.error?.message || ("Gemini " + r.status) }, 500);

    const text = (data?.candidates?.[0]?.content?.parts || [])
      .map((p: { text?: string }) => p.text || "")
      .join("")
      .trim();

    return json({ text });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
