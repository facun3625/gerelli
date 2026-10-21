import { NextRequest, NextResponse } from "next/server";

import { verifyWebhookSignature } from "@/lib/mercadopago";
import { getPlatformMercadoPagoCredentials } from "@/lib/platform-billing";
import { syncPlatformAuthorizedPayment, syncPlatformSubscription } from "@/lib/platform-subscription-sync";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const credentials = await getPlatformMercadoPagoCredentials();
  if (!credentials.accessToken || !credentials.webhookSecret) {
    return NextResponse.json({ error: "Facturación de plataforma no configurada" }, { status: 503 });
  }

  const url = new URL(req.url);
  const body = await req.json().catch(() => null);
  const topic = String(body?.type ?? body?.topic ?? url.searchParams.get("type") ?? "unknown");
  const resourceId = String(url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? body?.data?.id ?? "");
  if (!resourceId) return NextResponse.json({ error: "Falta el id del recurso" }, { status: 400 });

  const valid = verifyWebhookSignature({
    signatureHeader: req.headers.get("x-signature"),
    requestId: req.headers.get("x-request-id"),
    dataId: resourceId,
    secret: credentials.webhookSecret,
  });
  if (!valid) return NextResponse.json({ error: "Firma inválida" }, { status: 401 });

  const notificationId = String(body?.id ?? req.headers.get("x-request-id") ?? `${topic}:${resourceId}:${body?.action ?? "update"}`);
  const eventKey = `${topic}:${notificationId}`;
  const existing = await prisma.billingWebhookEvent.findUnique({ where: { eventKey } });
  if (existing?.status === "PROCESSED") return NextResponse.json({ ok: true, duplicate: true });
  await prisma.billingWebhookEvent.upsert({
    where: { eventKey },
    create: { eventKey, topic, resourceId, status: "PROCESSING" },
    update: { status: "PROCESSING", error: null },
  });

  try {
    if (topic === "subscription_preapproval") {
      await syncPlatformSubscription(credentials.accessToken, resourceId);
    } else if (topic === "subscription_authorized_payment") {
      await syncPlatformAuthorizedPayment(credentials.accessToken, resourceId);
    }
    await prisma.billingWebhookEvent.update({
      where: { eventKey },
      data: { status: "PROCESSED", processedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    await prisma.billingWebhookEvent.update({ where: { eventKey }, data: { status: "FAILED", error: message.slice(0, 500) } });
    console.error(`[platform-billing] webhook ${eventKey}:`, message);
    return NextResponse.json({ error: "No se pudo procesar" }, { status: 500 });
  }
}
