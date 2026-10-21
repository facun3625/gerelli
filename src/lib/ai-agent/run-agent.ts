import type { AgentMessage, AgentProvider, AgentTool } from "./types";

export type RuntimeTool = AgentTool & {
  execute: (args: Record<string, unknown>) => Promise<unknown>;
};

export type AgentToolOutcome = { name: string; args: Record<string, unknown>; result: unknown };

// Tope de idas y vueltas modelo-tool-modelo en una sola respuesta al
// usuario — evita un loop infinito si el modelo insiste en llamar tools sin
// nunca cerrar con texto.
const MAX_TOOL_ROUNDS = 4;

// Loop agnóstico del motor: no sabe nada de Gemini ni de Claude, solo habla
// el contrato de AgentProvider (types.ts). Cambiar de motor es pasarle otro
// `provider` acá — esta función no cambia.
export async function runAgent(params: {
  provider: AgentProvider;
  tools: RuntimeTool[];
  systemPrompt: string;
  history: AgentMessage[];
}): Promise<{ text: string; toolOutcomes: AgentToolOutcome[] }> {
  const { provider, tools, systemPrompt } = params;
  const history = [...params.history];
  const toolSchemas: AgentTool[] = tools.map(({ name, description, parameters }) => ({
    name,
    description,
    parameters,
  }));
  const toolOutcomes: AgentToolOutcome[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const turn = await provider.respond({ systemPrompt, history, tools: toolSchemas });

    if (turn.type === "text") return { text: turn.text, toolOutcomes };

    for (const call of turn.calls) {
      const tool = tools.find((t) => t.name === call.name);
      history.push({ role: "model", toolCall: call });
      if (!tool) {
        history.push({ role: "tool", name: call.name, result: { error: "Herramienta desconocida" } });
        continue;
      }
      const result = await tool.execute(call.arguments);
      toolOutcomes.push({ name: call.name, args: call.arguments, result });
      history.push({ role: "tool", name: call.name, result });
    }
  }

  throw new Error("El agente no pudo resolver la conversación en el número de pasos permitido");
}
