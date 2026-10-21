import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { clientIp, isRateLimited, recordFailure, type RateLimitRule } from "@/lib/rate-limit";

const SALES_BOT_START_RULE: RateLimitRule = { limit: 15, windowMinutes: 10 };

// Crea una conversación "vacía" con un tema ya definido, sin pasar por
// Gemini — usado por botones de la landing (ej. "Armamos tu tienda por
// vos") que llevan directo a pedir nombre/WhatsApp, sin necesitar
// preguntas y respuestas antes.
export async function POST(req: NextRequest) {
  const ipKey = `sales-bot-start:${clientIp(req.headers)}`;
  if (await isRateLimited(ipKey, SALES_BOT_START_RULE)) {
    return NextResponse.json({ error: "Demasiados intentos — esperá un toque." }, { status: 429 });
  }
  await recordFailure(ipKey);

  const body = await req.json().catch(() => null);
  const topic = typeof body?.topic === "string" ? body.topic.slice(0, 60) : null;
  const greeting = typeof body?.greeting === "string" ? body.greeting.slice(0, 500) : null;

  const conversation = await prisma.salesBotConversation.create({
    data: {
      topic,
      needsHuman: true,
      ...(greeting ? { messages: { create: { role: "model", text: greeting } } } : {}),
    },
  });
  return NextResponse.json({ conversationId: conversation.id });
}
