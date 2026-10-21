import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { askSalesBot, type ChatMessage } from "@/lib/sales-bot";
import { clientIp, isRateLimited, recordFailure, type RateLimitRule } from "@/lib/rate-limit";

// Ruta pública sin sesión (el chat vive en la landing, para quien todavía
// no tiene cuenta) — el rate limit por IP es lo único que evita que alguien
// abuse el cupo gratis de Gemini o, el día de mañana con un plan pago,
// genere costo mandando miles de mensajes.
const SALES_BOT_RULE: RateLimitRule = { limit: 20, windowMinutes: 10 };

export async function POST(req: NextRequest) {
  const ipKey = `sales-bot:${clientIp(req.headers)}`;
  if (await isRateLimited(ipKey, SALES_BOT_RULE)) {
    return NextResponse.json({ error: "Demasiados mensajes seguidos — esperá un toque y volvé a intentar." }, { status: 429 });
  }
  await recordFailure(ipKey);

  const body = await req.json().catch(() => null);
  const rawMessages = Array.isArray(body?.messages) ? body.messages : null;
  if (!rawMessages || rawMessages.length === 0) {
    return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
  }
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId : null;

  // Recorta historial y largo de cada mensaje — ni la conversación crece sin
  // límite ni alguien puede mandar un texto gigante para gastar tokens.
  const history: ChatMessage[] = rawMessages.slice(-12).map((m: { role?: unknown; text?: unknown }) => ({
    role: m.role === "model" ? "model" : "user",
    text: String(m.text ?? "").slice(0, 1000),
  }));
  const lastUserMessage = [...history].reverse().find((m) => m.role === "user");

  try {
    const [conversation, result] = await Promise.all([
      conversationId
        ? prisma.salesBotConversation.findUnique({ where: { id: conversationId } })
        : prisma.salesBotConversation.create({ data: {} }),
      askSalesBot(history),
    ]);
    const conv = conversation ?? (await prisma.salesBotConversation.create({ data: {} }));

    await prisma.$transaction([
      ...(lastUserMessage
        ? [
            prisma.salesBotMessage.create({
              data: { conversationId: conv.id, role: "user", text: lastUserMessage.text },
            }),
          ]
        : []),
      prisma.salesBotMessage.create({
        data: { conversationId: conv.id, role: "model", text: result.reply },
      }),
      ...(result.needsHuman && !conv.needsHuman
        ? [prisma.salesBotConversation.update({ where: { id: conv.id }, data: { needsHuman: true } })]
        : []),
    ]);

    return NextResponse.json({ conversationId: conv.id, reply: result.reply, needsHuman: result.needsHuman });
  } catch (err) {
    console.error("sales-bot error:", err);
    return NextResponse.json(
      { error: "No pudimos responder ahora mismo. Volvé a intentarlo en unos minutos." },
      { status: 500 },
    );
  }
}
