export type AssistantHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantProperty = {
  id: string;
  title: string;
  operation: string;
  price: number | null;
  currency: string;
  showPrice: boolean;
  city: string;
  neighborhood: string;
  bedrooms: number;
  image: string | null;
  href: string;
};

export type AssistantReply = {
  text: string;
  properties: AssistantProperty[];
  // Tokens que consumió la respuesta (todas las vueltas con el proveedor)
  tokens: number;
};

export type AssistantProviderInput = {
  apiKey: string;
  model: string;
  instructions: string;
  history: AssistantHistoryMessage[];
};

export const DEFAULT_AI_MODELS = {
  openai: "gpt-4.1-mini",
  gemini: "gemini-2.5-flash",
} as const;
