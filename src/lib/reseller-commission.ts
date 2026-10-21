import { prisma } from "@/lib/prisma";

// Fila fija — ver comentario en el modelo ResellerSettings.
const SETTINGS_ID = "global";

export async function getResellerSettings() {
  const settings = await prisma.resellerSettings.findUnique({ where: { id: SETTINGS_ID } });
  // No debería faltar (el seed la crea), pero si alguien la borró a mano no
  // queremos que la app explote — arrancamos en 0 antes que romper.
  return (
    settings ?? {
      id: SETTINGS_ID,
      activationBonusAmount: 0,
      activationBonusDays: 60,
      commissionPayoutDays: 30,
      updatedAt: new Date(),
    }
  );
}

// Fecha en la que una comisión pendiente pasa a estar vencida — el plazo
// corre desde que se generó la fila, no desde el hecho que la originó (un
// cobro, o que se cumplieron los días del bono de activación).
export function commissionDueAt(createdAt: Date, payoutDays: number): Date {
  return new Date(createdAt.getTime() + payoutDays * 24 * 60 * 60 * 1000);
}

export async function getCommissionTiers() {
  return prisma.resellerCommissionTier.findMany({ orderBy: { minActiveStores: "asc" } });
}

// El escalón vigente para un revendedor es el de mayor umbral que no supere
// su cantidad actual de tiendas activas (billingStatus ACTIVE). Sin
// escalones configurados, no hay comisión — 0%, no un error.
export async function getResellerTierPercent(resellerId: string): Promise<number> {
  const [activeCount, tiers] = await Promise.all([
    prisma.tenant.count({ where: { referredByResellerId: resellerId, billingStatus: "ACTIVE" } }),
    getCommissionTiers(),
  ]);

  let percent = 0;
  for (const tier of tiers) {
    if (tier.minActiveStores <= activeCount) percent = Number(tier.percent);
  }
  return percent;
}

// Se llama cada vez que se registra un cobro de una tienda (ver
// platform/(protected)/tiendas/[tenantId]/actions.ts, registerPayment). Si
// esa tienda tiene un revendedor asociado, genera:
//   1. La comisión recurrente sobre ESTE cobro puntual, al escalón vigente
//      en este momento (no se recalcula después si el escalón cambia).
//   2. El bono de activación, la primera vez que corresponda — se detecta
//      acá porque este es el único lugar donde de verdad "entra dinero" a
//      una tienda en toda la app (no hay pasarela de pago automática, todo
//      cobro lo carga el super admin a mano). No hay nada corriendo en
//      segundo plano todavía: el bono aparece recién la próxima vez que se
//      registre un cobro después de cumplirse el plazo, no exactamente el
//      día que se cumple.
export async function generateCommissionsForPayment(tenantId: string, billingPaymentId: string, amount: number) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant?.referredByResellerId) return;

  const resellerId = tenant.referredByResellerId;
  const percent = await getResellerTierPercent(resellerId);

  if (percent > 0) {
    await prisma.resellerCommission.create({
      data: {
        resellerId,
        tenantId,
        type: "RECURRING",
        amount: (amount * percent) / 100,
        percentApplied: percent,
        billingPaymentId,
      },
    });
  }

  await maybeGrantActivationBonus(resellerId, tenant.id, tenant.createdAt);
}

async function maybeGrantActivationBonus(resellerId: string, tenantId: string, tenantCreatedAt: Date) {
  const alreadyGranted = await prisma.resellerCommission.findFirst({
    where: { resellerId, tenantId, type: "ACTIVATION_BONUS" },
  });
  if (alreadyGranted) return;

  const settings = await getResellerSettings();
  const daysSinceReferral = (Date.now() - tenantCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceReferral < settings.activationBonusDays) return;
  if (Number(settings.activationBonusAmount) <= 0) return;

  await prisma.resellerCommission.create({
    data: {
      resellerId,
      tenantId,
      type: "ACTIVATION_BONUS",
      amount: settings.activationBonusAmount,
    },
  });
}
