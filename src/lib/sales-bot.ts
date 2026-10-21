import { estatePlanFeatureLines } from "@/lib/plan-features";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { FAQ_CATEGORIES } from "@/lib/faq-content";

// Modelo gratuito de Gemini con el cupo diario más generoso del free tier
// (ver aistudio.google.com/rate-limit para los límites vigentes en la
// cuenta) — alcanza de sobra para un bot de preguntas de la landing.
const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export type ChatMessage = { role: "user" | "model"; text: string };
export type SalesBotReply = { reply: string; needsHuman: boolean };

// El modelo tiene que devolver exactamente esta forma — así needsHuman es
// un booleano real y no algo que hay que adivinar parseando texto libre.
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    needsHuman: { type: "boolean" },
  },
  required: ["reply", "needsHuman"],
};

async function buildSystemPrompt(): Promise<string> {
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { order: "asc" } });

  const plansText = plans.length
    ? plans
        .map((p) => {
          const parts = [`- ${p.name}: ${formatPrice(Number(p.priceMonthly))}/mes`];
          if (p.priceAnnual) parts.push(`(o ${formatPrice(Number(p.priceAnnual))}/año)`);
          if (p.trialDays > 0) parts.push(`— ${p.trialDays} días de prueba gratis, sin pedir tarjeta`);
          parts.push(...estatePlanFeatureLines(p));
          return parts.join(" ");
        })
        .join("\n")
    : "No hay planes activos cargados todavía.";

  const faqText = FAQ_CATEGORIES.map(
    (c) => `## ${c.title}\n` + c.questions.map(([q, a]) => `P: ${q}\nR: ${a}`).join("\n\n"),
  ).join("\n\n");

  return `Sos el asistente de ventas de Urbi, un servicio de páginas web para inmobiliarias por un plan mensual. La propuesta principal es una web propia, moderna y adaptable a celulares, con catálogo y consultas; el panel sirve para actualizarla.

REGLAS ESTRICTAS — no las rompas nunca:
- Respondé ÚNICAMENTE con información que esté LITERALMENTE en "PLANES ACTUALES" o "PREGUNTAS FRECUENTES" de más abajo. No agregues nada que no esté ahí, no infieras, no completes con conocimiento general — ni sobre Urbi ni sobre cualquier otro tema, aunque estés seguro de la respuesta.
- Si la pregunta no se puede responder solo con esa información (incluye cualquier tema ajeno a Urbi), decilo con honestidad en una frase corta y marcá needsHuman en true, para que un humano del equipo se contacte.
- También marcá needsHuman en true si la persona pide expresamente hablar con alguien del equipo, dejar sus datos, o que la contacten.
- Sé breve: 2 a 4 oraciones por respuesta.
- Tono cercano y directo, en español rioplatense, sin tecnicismos.
- Cuando corresponda (y sea información real de arriba), podés invitar a conocer la plataforma en /#vista-previa o crear la inmobiliaria en /registro.
- Devolvé siempre el JSON pedido: "reply" con el texto para mostrarle a la persona, "needsHuman" en true o false.

PLANES ACTUALES:
${plansText}

PREGUNTAS FRECUENTES YA PUBLICADAS EN EL SITIO:
${faqText}`;
}

// Google usa lo que se manda en el tier gratis para mejorar sus modelos —
// aceptable acá porque no se pide ni se comparte ningún dato personal real
// del visitante en el prompt (el nombre/teléfono que deja para que lo
// contacten se guarda aparte, en SalesBotConversation, no viaja a Gemini).
export async function askSalesBot(history: ChatMessage[]): Promise<SalesBotReply> {
  if (!GEMINI_API_KEY) throw new Error("Falta configurar GEMINI_API_KEY");

  const systemInstruction = await buildSystemPrompt();

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 400,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini respondió ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const rawText: string =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  if (!rawText.trim()) throw new Error("Gemini no devolvió una respuesta");

  const parsed = JSON.parse(rawText);
  if (typeof parsed.reply !== "string") throw new Error("Gemini devolvió un JSON con forma inesperada");
  return { reply: parsed.reply.trim(), needsHuman: Boolean(parsed.needsHuman) };
}
