// Contrato neutral entre el loop del agente (run-agent.ts) y el motor que
// realmente conversa (provider-gemini.ts hoy, provider-claude.ts el día que
// se migre). Nada acá sabe qué motor hay del otro lado — cambiar de motor es
// agregar un archivo que implemente AgentProvider, no tocar el resto.

export type AgentTool = {
  name: string;
  description: string;
  // JSON Schema de los parámetros (tipo "object" con "properties"/"required").
  parameters: Record<string, unknown>;
};

export type AgentToolCall = {
  name: string;
  arguments: Record<string, unknown>;
  // Dato opaco específico del proveedor (ej: thoughtSignature de Gemini)
  // que hay que devolver sin tocar en el siguiente turno — run-agent.ts no
  // sabe ni le importa qué hay adentro, solo lo hace ida y vuelta.
  raw?: unknown;
};

export type AgentMessage =
  | { role: "user"; text: string }
  | { role: "model"; text: string }
  | { role: "model"; toolCall: AgentToolCall }
  | { role: "tool"; name: string; result: unknown };

export type AgentTurn =
  | { type: "text"; text: string }
  | { type: "tool_calls"; calls: AgentToolCall[] };

export interface AgentProvider {
  respond(params: {
    systemPrompt: string;
    history: AgentMessage[];
    tools: AgentTool[];
  }): Promise<AgentTurn>;
}
