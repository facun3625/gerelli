import type { AgentMessage, AgentProvider, AgentToolCall, AgentTurn } from "./types";

// Mismo modelo que ya usa el bot de la landing (sales-bot.ts) — probado en
// producción, y verificado a mano que interpreta bien function calling con
// varias tools. El tier "flash" sin -lite devolvía 503 (sobrecarga del lado
// de Google) de forma consistente al probarlo.
const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> }; thoughtSignature?: string }
  | { functionResponse: { name: string; response: Record<string, unknown> } };
type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

function toGeminiContents(history: AgentMessage[]): GeminiContent[] {
  return history.map((m): GeminiContent => {
    if (m.role === "user") return { role: "user", parts: [{ text: m.text }] };
    if (m.role === "tool") {
      // Gemini espera la respuesta de una función como contenido "user".
      return { role: "user", parts: [{ functionResponse: { name: m.name, response: { result: m.result } } }] };
    }
    if ("toolCall" in m) {
      // thoughtSignature va sin tocar, tal como vino en la respuesta
      // original — Gemini lo exige (400 si falta) para que el próximo turno
      // entienda el razonamiento detrás de este llamado a función.
      return {
        role: "model",
        parts: [
          {
            functionCall: { name: m.toolCall.name, args: m.toolCall.arguments },
            ...(typeof m.toolCall.raw === "string" ? { thoughtSignature: m.toolCall.raw } : {}),
          },
        ],
      };
    }
    return { role: "model", parts: [{ text: m.text }] };
  });
}

// Implementa AgentProvider contra la API REST de Gemini con function
// calling — es la única pieza que sabe algo de Gemini. run-agent.ts y las
// tools no le importa qué motor hay acá adentro; migrar a Claude es agregar
// un provider-claude.ts con esta misma forma.
export class GeminiAgentProvider implements AgentProvider {
  async respond({
    systemPrompt,
    history,
    tools,
  }: Parameters<AgentProvider["respond"]>[0]): Promise<AgentTurn> {
    if (!GEMINI_API_KEY) throw new Error("Falta configurar GEMINI_API_KEY");

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: toGeminiContents(history),
          ...(tools.length > 0
            ? {
                tools: [
                  {
                    functionDeclarations: tools.map((t) => ({
                      name: t.name,
                      description: t.description,
                      parameters: t.parameters,
                    })),
                  },
                ],
              }
            : {}),
          generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Gemini respondió ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = await res.json();
    const parts: Array<{
      text?: string;
      functionCall?: { name: string; args?: Record<string, unknown> };
      thoughtSignature?: string;
    }> = data?.candidates?.[0]?.content?.parts ?? [];

    const calls: AgentToolCall[] = [];
    let text = "";
    for (const part of parts) {
      if (part.functionCall) {
        calls.push({ name: part.functionCall.name, arguments: part.functionCall.args ?? {}, raw: part.thoughtSignature });
      } else if (typeof part.text === "string") {
        text += part.text;
      }
    }

    if (calls.length > 0) return { type: "tool_calls", calls };
    if (!text.trim()) throw new Error("Gemini no devolvió una respuesta");
    return { type: "text", text: text.trim() };
  }
}
