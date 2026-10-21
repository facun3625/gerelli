import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { canTenantReceiveOrders } from "@/lib/billing-status";
import { getTenantAiAgentAccess } from "@/lib/require-admin";
import { clientIp, isRateLimited, recordFailure } from "@/lib/rate-limit";
import { buildAgentSystemPrompt } from "@/lib/ai-agent/system-prompt";
import { buildAgentTools } from "@/lib/ai-agent/tools";
import { runAgent } from "@/lib/ai-agent/run-agent";
import { GeminiAgentProvider } from "@/lib/ai-agent/provider-gemini";
import type { AgentMessage } from "@/lib/ai-agent/types";

const provider = new GeminiAgentProvider();

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Ruta pública del sitio de un tenant (sin sesión) — a diferencia de
// /api/sales-bot (que es de la landing de Urbi, sin datos por tenant), acá
// el tenantId se resuelve server-side vía getCurrentTenant() y es lo único
// que las tools usan — nunca confiar en un tenantId que venga del body.
export async function POST(req: NextRequest) {
  const tenant = await getCurrentTenant();
  if (!tenant || !canTenantReceiveOrders(tenant)) {
    return NextResponse.json({ error: "El sitio no está disponible" }, { status: 404 });
  }

  const access = await getTenantAiAgentAccess(tenant.id);
  if (!access.allowed) {
    return NextResponse.json({ error: "Este sitio no tiene el agente activado" }, { status: 403 });
  }

  const ipKey = `estate-ai:${tenant.id}:${clientIp(req.headers)}`;
  if (await isRateLimited(ipKey, { limit: 20, windowMinutes: 10 })) {
    return NextResponse.json(
      { error: "Recibí muchos mensajes seguidos — esperá un toque y volvé a escribirme." },
      { status: 429 },
    );
  }
  await recordFailure(ipKey);

  if (access.maxMessagesPerMonth != null) {
    const used = await prisma.estateAiMessage.count({
      where: { role: "user", conversation: { tenantId: tenant.id }, createdAt: { gte: startOfMonth() } },
    });
    if (used >= access.maxMessagesPerMonth) {
      return NextResponse.json(
        { error: "Por ahora no puedo seguir charlando — dejanos tu consulta desde el formulario de contacto y te respondemos a la brevedad." },
        { status: 429 },
      );
    }
  }

  const body = await req.json().catch(() => null);
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId : null;
  const rawMessages = Array.isArray(body?.messages) ? body.messages : null;
  if (!rawMessages || rawMessages.length === 0) {
    return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
  }

  // Recorta historial y largo de cada mensaje, mismo criterio que
  // /api/sales-bot — ni la charla crece sin límite ni alguien manda un
  // texto gigante para gastar tokens.
  const history: AgentMessage[] = rawMessages
    .slice(-16)
    .map((m: { role?: unknown; text?: unknown }): AgentMessage => {
      const text = String(m.text ?? "").slice(0, 1500);
      return m.role === "model" ? { role: "model", text } : { role: "user", text };
    });
  const lastUserMessage = [...history].reverse().find((m) => m.role === "user");

  try {
    const conversation = conversationId
      ? await prisma.estateAiConversation.findFirst({ where: { id: conversationId, tenantId: tenant.id } })
      : null;
    const conv = conversation ?? (await prisma.estateAiConversation.create({ data: { tenantId: tenant.id } }));

    const systemPrompt = await buildAgentSystemPrompt(tenant.id);
    const tools = buildAgentTools(tenant.id, conv.id);
    const { text } = await runAgent({ provider, tools, systemPrompt, history });

    await prisma.$transaction([
      ...(lastUserMessage
        ? [prisma.estateAiMessage.create({ data: { conversationId: conv.id, role: "user", text: lastUserMessage.text } })]
        : []),
      prisma.estateAiMessage.create({ data: { conversationId: conv.id, role: "model", text } }),
    ]);

    return NextResponse.json({ conversationId: conv.id, reply: text });
  } catch (err) {
    console.error("estate-ai error:", err);
    return NextResponse.json(
      { error: "No pudimos responder ahora mismo. Volvé a intentarlo en unos minutos." },
      { status: 500 },
    );
  }
}
