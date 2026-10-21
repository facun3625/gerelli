import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { notifyPlatformBotLead } from "@/lib/telegram";
import { clientIp, isRateLimited, recordFailure, type RateLimitRule } from "@/lib/rate-limit";

const SALES_BOT_CONTACT_RULE: RateLimitRule = { limit: 10, windowMinutes: 10 };

const contactSchema = z.object({
  conversationId: z.string().min(1).max(100),
  name: z.string().trim().min(1, "Ingresá tu nombre").max(100),
  phone: z.string().trim().min(6, "Ingresá un WhatsApp válido").max(30),
});

// Deja el nombre/WhatsApp de quien pidió (o necesitó) hablar con un
// humano — ver needsHuman en askSalesBot. El equipo hace el seguimiento
// a mano desde /platform/chats, no hay ninguna automatización de contacto.
export async function POST(req: NextRequest) {
  const ipKey = `sales-bot-contact:${clientIp(req.headers)}`;
  if (await isRateLimited(ipKey, SALES_BOT_CONTACT_RULE)) {
    return NextResponse.json({ error: "Demasiados intentos — esperá un toque." }, { status: 429 });
  }
  await recordFailure(ipKey);

  const body = await req.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const conversation = await prisma.salesBotConversation.findUnique({ where: { id: parsed.data.conversationId } });
  if (!conversation) {
    return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  }

  await prisma.salesBotConversation.update({
    where: { id: parsed.data.conversationId },
    data: { contactName: parsed.data.name, contactPhone: parsed.data.phone, needsHuman: true },
  });

  // Solo la primera vez — si ya había dejado sus datos antes, reenviarlos
  // (o mandarlos de nuevo a propósito) no debe volver a avisar por Telegram.
  if (!conversation.contactPhone) {
    notifyPlatformBotLead({
      name: parsed.data.name,
      phone: parsed.data.phone,
      topic: conversation.topic,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
