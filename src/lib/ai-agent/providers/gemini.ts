import { GoogleGenAI } from "@google/genai";
import { ASSISTANT_TOOLS, executeAssistantTool } from "@/lib/ai-agent/tools";
import type { AssistantProperty, AssistantProviderInput, AssistantReply } from "@/lib/ai-agent/types";

const tools = ASSISTANT_TOOLS.map((tool) => ({
  type: "function" as const,
  name: tool.name,
  description: tool.description,
  parameters: tool.parameters,
}));

function transcript(input: AssistantProviderInput): string {
  return input.history
    .map((message) => `${message.role === "user" ? "Cliente" : "Asistente"}: ${message.content}`)
    .join("\n\n");
}

export async function runGeminiAssistant(tenantId: string, input: AssistantProviderInput): Promise<AssistantReply> {
  const client = new GoogleGenAI({ apiKey: input.apiKey });
  const requestConfig = {
    model: input.model,
    system_instruction: input.instructions,
    tools,
    store: false,
    generation_config: { thinking_level: "low" as const, max_output_tokens: 600 },
  };
  // Gemini exige que cada llamada a función venga justo después de un turno
  // del usuario: por eso el historial que se reenvía arranca siempre con el
  // mensaje del cliente y va sumando los pasos de cada ronda.
  const userTurn = { type: "user_input" as const, content: [{ type: "text" as const, text: transcript(input) }] };
  let turns: unknown[] = [userTurn];
  let interaction = await client.interactions.create({ ...requestConfig, input: transcript(input) });
  let properties: AssistantProperty[] = [];
  let tokens = interaction.usage?.total_tokens ?? 0;

  for (let round = 0; round < 4; round += 1) {
    const calls = (interaction.steps ?? []).filter((step) => step.type === "function_call");
    if (calls.length === 0) {
      return {
        text: interaction.output_text?.trim() || "No pude armar una respuesta. Probá reformulando la consulta.",
        properties,
        tokens,
      };
    }

    const functionResults = await Promise.all(
      calls.map(async (call) => {
        try {
          const result = await executeAssistantTool(tenantId, call.name, call.arguments);
          if (result.properties) properties = result.properties;
          return {
            type: "function_result" as const,
            name: call.name,
            call_id: call.id,
            result: result.output,
          };
        } catch (error) {
          console.error("AI tool failed", call.name, error);
          return {
            type: "function_result" as const,
            name: call.name,
            call_id: call.id,
            is_error: true,
            result: JSON.stringify({ error: "No se pudo consultar esa información" }),
          };
        }
      }),
    );
    turns = [...turns, ...(interaction.steps ?? []), ...functionResults];
    interaction = await client.interactions.create({
      ...requestConfig,
      input: turns as Parameters<typeof client.interactions.create>[0]["input"],
    });
    tokens += interaction.usage?.total_tokens ?? 0;
  }

  return { text: "No pude completar la búsqueda. Probá con una consulta más específica.", properties, tokens };
}
