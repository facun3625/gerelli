import { NextRequest, NextResponse } from "next/server";

import { getPlatformBillingSettings } from "@/lib/platform-billing";
import { prisma } from "@/lib/prisma";
import { purgeOldRateLimitAttempts } from "@/lib/rate-limit";
import { secretMatches } from "@/lib/cron-auth";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || !secretMatches(req.headers.get("authorization"), cronSecret)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const settings = await getPlatformBillingSettings();
  const now = new Date();
  const graceCutoff = new Date(now.getTime() - settings.graceDays * 24 * 60 * 60 * 1000);

  const [expiredTrials, expiredBonuses, suspendedPastDue, endedSubscriptions] = await prisma.$transaction([
    prisma.tenant.updateMany({
      where: {
        billingStatus: "TRIAL",
        trialEndsAt: { lt: now },
        // Si ya autorizó el cobro en Mercado Pago durante la prueba, la
        // suscripción se factura sola en su fecha — suspenderla acá sería
        // preventivo e innecesario, y puede ir por delante del webhook de
        // pago que la reactivaría minutos después.
        NOT: { providerSubscriptionStatus: "authorized" },
      },
      data: { billingStatus: "SUSPENDED" },
    }),
    prisma.tenant.updateMany({
      where: {
        billingStatus: "ACTIVE",
        providerSubscriptionId: null,
        nextBillingDate: { lt: now },
      },
      data: { billingStatus: "SUSPENDED" },
    }),
    prisma.tenant.updateMany({
      where: { billingStatus: "PAST_DUE", nextBillingDate: { lt: graceCutoff } },
      data: { billingStatus: "SUSPENDED" },
    }),
    prisma.tenant.updateMany({
      where: {
        billingStatus: "ACTIVE",
        providerSubscriptionStatus: { in: ["canceled", "cancelled"] },
        nextBillingDate: { lt: now },
      },
      data: { billingStatus: "SUSPENDED" },
    }),
  ]);

  // Aprovecha la corrida diaria para limpiar los intentos fallidos viejos
  // (ver lib/rate-limit.ts) — si no, esa tabla solo crece.
  const purgedRateLimits = await purgeOldRateLimitAttempts();

  return NextResponse.json({
    ok: true,
    expiredTrials: expiredTrials.count,
    expiredBonuses: expiredBonuses.count,
    suspendedPastDue: suspendedPastDue.count,
    endedSubscriptions: endedSubscriptions.count,
    purgedRateLimits,
  });
}
