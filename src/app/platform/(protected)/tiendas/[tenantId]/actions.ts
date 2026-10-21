"use server";

import { ActionError, toUserError } from "@/lib/action-error";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { generateCommissionsForPayment } from "@/lib/reseller-commission";
import { getPlatformMercadoPagoCredentials } from "@/lib/platform-billing";
import { updateSubscriptionBilling } from "@/lib/mercadopago";
import { generateDomainToken } from "@/lib/custom-domain";

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "localhost:3010";

function revalidateTenant(tenantId: string) {
  revalidatePath(`/platform/tiendas/${tenantId}`);
  revalidatePath("/platform/tiendas");
  revalidatePath("/platform");
}

export async function setTenantStatus(tenantId: string, status: "ACTIVE" | "SUSPENDED") {
  try {
    return await runSetTenantStatus(tenantId, status);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar la tienda");
  }
}

async function runSetTenantStatus(tenantId: string, status: "ACTIVE" | "SUSPENDED") {
  await requireSuperAdmin();
  await prisma.tenant.update({ where: { id: tenantId }, data: { status } });
  revalidateTenant(tenantId);
  return { ok: true as const };
}

export async function setTenantCategory(tenantId: string, category: "CLIENTE" | "DEMO" | "PROMOCION") {
  try {
    return await runSetTenantCategory(tenantId, category);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar la tienda");
  }
}

async function runSetTenantCategory(tenantId: string, category: "CLIENTE" | "DEMO" | "PROMOCION") {
  await requireSuperAdmin();
  await prisma.tenant.update({ where: { id: tenantId }, data: { category } });
  revalidateTenant(tenantId);
  return { ok: true as const };
}

export async function setTenantPlan(tenantId: string, planId: string | null) {
  try {
    return await runSetTenantPlan(tenantId, planId);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar la tienda");
  }
}

async function runSetTenantPlan(tenantId: string, planId: string | null) {
  await requireSuperAdmin();
  await applyTenantPlan(tenantId, planId, false);
  revalidateTenant(tenantId);
  return { ok: true as const };
}

async function applyTenantPlan(tenantId: string, planId: string | null, clearRequest: boolean) {
  const [tenant, plan] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { providerSubscriptionId: true, providerSubscriptionStatus: true, billingCycle: true },
    }),
    planId ? prisma.plan.findUnique({ where: { id: planId, active: true } }) : null,
  ]);
  if (planId && !plan) throw new ActionError("Ese plan ya no está disponible");
  if (!planId && tenant.providerSubscriptionId) {
    throw new ActionError("No se puede quitar el plan mientras exista una suscripción de Mercado Pago");
  }

  if (plan && tenant.providerSubscriptionId && ["authorized", "pending"].includes(tenant.providerSubscriptionStatus ?? "")) {
    const amount = tenant.billingCycle === "ANNUAL" ? Number(plan.priceAnnual) : Number(plan.priceMonthly);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ActionError(tenant.billingCycle === "ANNUAL" ? "El nuevo plan no ofrece pago anual" : "El nuevo plan no tiene un precio válido");
    }
    const credentials = await getPlatformMercadoPagoCredentials();
    if (!credentials.accessToken) throw new ActionError("Falta configurar Mercado Pago para actualizar la suscripción");
    const updated = await updateSubscriptionBilling(credentials.accessToken, tenant.providerSubscriptionId, {
      reason: `Urbi · ${plan.name} · ${tenant.billingCycle === "ANNUAL" ? "Anual" : "Mensual"}`,
      amount,
    });
    if (Math.abs(updated.amount - amount) > 0.01) {
      throw new ActionError("Mercado Pago no confirmó el nuevo importe; el plan no fue modificado");
    }
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      planId,
      ...(clearRequest ? { requestedPlanId: null, requestedPlanAt: null } : {}),
      subscriptionSyncedAt: tenant.providerSubscriptionId ? new Date() : undefined,
    },
  });
}

// El dueño de la tienda pide un plan desde /admin/configuracion (ver
// requestedPlanId en el schema) — esto lo confirma: aplica el plan pedido
// y limpia el pedido, en un solo paso.
export async function applyPlanChangeRequest(tenantId: string, planId: string) {
  try {
    return await runApplyPlanChangeRequest(tenantId, planId);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar la tienda");
  }
}

async function runApplyPlanChangeRequest(tenantId: string, planId: string) {
  await requireSuperAdmin();
  await applyTenantPlan(tenantId, planId, true);
  revalidateTenant(tenantId);
  return { ok: true as const };
}

export async function dismissPlanChangeRequest(tenantId: string) {
  try {
    return await runDismissPlanChangeRequest(tenantId);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar la tienda");
  }
}

async function runDismissPlanChangeRequest(tenantId: string) {
  await requireSuperAdmin();
  await prisma.tenant.update({ where: { id: tenantId }, data: { requestedPlanId: null, requestedPlanAt: null } });
  revalidateTenant(tenantId);
  return { ok: true as const };
}

type BillingStatusValue = "TRIAL" | "ACTIVE" | "PAST_DUE" | "SUSPENDED";

export async function setBillingStatus(tenantId: string, status: BillingStatusValue) {
  try {
    return await runSetBillingStatus(tenantId, status);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar la tienda");
  }
}

async function runSetBillingStatus(tenantId: string, status: BillingStatusValue) {
  await requireSuperAdmin();
  await prisma.tenant.update({ where: { id: tenantId }, data: { billingStatus: status } });
  revalidateTenant(tenantId);
  return { ok: true as const };
}

const paymentSchema = z.object({
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  note: z.string().optional(),
});

// Registrar un pago a mano: deja constancia en el historial, mueve el
// próximo vencimiento al fin del período pagado, y si la tienda estaba
// vencida o en trial la vuelve a poner "al día" — todo en un solo paso.
export async function registerPayment(tenantId: string, formData: FormData) {
  try {
    return await runRegisterPayment(tenantId, formData);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar la tienda");
  }
}

async function runRegisterPayment(tenantId: string, formData: FormData) {
  await requireSuperAdmin();
  const parsed = paymentSchema.parse({
    amount: formData.get("amount"),
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
    note: formData.get("note") || undefined,
  });

  if (parsed.periodEnd <= parsed.periodStart) {
    throw new ActionError("El fin del período debe ser posterior al inicio");
  }

  // Si había un pedido de cambio de plan pendiente, registrar el cobro es
  // justo el momento en que confirmás que la plata entró — se aplica acá
  // mismo, en el mismo click, en vez de hacerte volver a esta pantalla a
  // tocar "Aplicar" aparte.
  const pending = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { requestedPlanId: true, providerSubscriptionId: true },
  });

  // Si existe débito automático, el cambio debe pasar por "Aplicar cambio"
  // para actualizar primero el importe en Mercado Pago. Un pago manual no
  // puede cambiar a escondidas el producto que la pasarela sigue cobrando.
  const applyPendingPlan = pending?.requestedPlanId && !pending.providerSubscriptionId;

  const [payment] = await prisma.$transaction([
    prisma.billingPayment.create({
      data: {
        tenantId,
        amount: parsed.amount,
        periodStart: parsed.periodStart,
        periodEnd: parsed.periodEnd,
        note: parsed.note?.trim() || null,
      },
    }),
    prisma.tenant.update({
      where: { id: tenantId },
      data: {
        nextBillingDate: parsed.periodEnd,
        billingStatus: "ACTIVE",
        ...(applyPendingPlan
          ? { planId: pending.requestedPlanId, requestedPlanId: null, requestedPlanAt: null }
          : {}),
      },
    }),
  ]);

  // Fuera de la transacción a propósito: lee el billingStatus recién
  // actualizado arriba para calcular el escalón del revendedor, así que
  // necesita que ese update ya haya confirmado.
  await generateCommissionsForPayment(tenantId, payment.id, parsed.amount);

  revalidateTenant(tenantId);
  return { ok: true as const };
}

export async function setTrialEndsAt(tenantId: string, value: string) {
  try {
    return await runSetTrialEndsAt(tenantId, value);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar la tienda");
  }
}

async function runSetTrialEndsAt(tenantId: string, value: string) {
  await requireSuperAdmin();
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { trialEndsAt: value ? new Date(value) : null },
  });
  revalidateTenant(tenantId);
  return { ok: true as const };
}

export async function setBillingNotes(tenantId: string, notes: string) {
  try {
    return await runSetBillingNotes(tenantId, notes);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar la tienda");
  }
}

async function runSetBillingNotes(tenantId: string, notes: string) {
  await requireSuperAdmin();
  await prisma.tenant.update({ where: { id: tenantId }, data: { billingNotes: notes.trim() || null } });
  revalidateTenant(tenantId);
  return { ok: true as const };
}

// Borra la tienda y absolutamente todo lo que le pertenece — catálogo,
// pedidos, historial de pagos, comisiones generadas por sus cobros.
// Irreversible. El orden importa: hay que vaciar las tablas que referencian
// a la tienda (o a sus pedidos/productos) antes de poder borrar las que
// referencian, y por último la tienda misma.
export async function deleteTenant(tenantId: string) {
  try {
    return await runDeleteTenant(tenantId);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar la tienda");
  }
}

async function runDeleteTenant(tenantId: string) {
  await requireSuperAdmin();

  await prisma.$transaction(async (tx) => {
    await tx.order.deleteMany({ where: { tenantId } });
    await tx.stockMovement.deleteMany({ where: { tenantId } });
    await tx.pickupSlot.deleteMany({ where: { tenantId } });
    await tx.fulfillmentMethodConfig.deleteMany({ where: { tenantId } });
    await tx.paymentMethodConfig.deleteMany({ where: { tenantId } });
    await tx.weeklyScheduleRule.deleteMany({ where: { tenantId } });
    await tx.storeClosure.deleteMany({ where: { tenantId } });
    await tx.deliveryDate.deleteMany({ where: { tenantId } });
    await tx.serviceInquiry.deleteMany({ where: { tenantId } });
    await tx.service.deleteMany({ where: { tenantId } });
    await tx.product.deleteMany({ where: { tenantId } });
    await tx.productCategory.deleteMany({ where: { tenantId } });
    await tx.stockGroup.deleteMany({ where: { tenantId } });
    await tx.emailLog.deleteMany({ where: { tenantId } });
    await tx.whatsappLog.deleteMany({ where: { tenantId } });
    await tx.aboutMedia.deleteMany({ where: { tenantId } });
    await tx.settings.deleteMany({ where: { tenantId } });
    await tx.resellerCommission.deleteMany({ where: { tenantId } });
    await tx.billingPayment.deleteMany({ where: { tenantId } });
    await tx.promotionRedemption.deleteMany({ where: { tenantId } });

    // Un usuario de esta tienda que además es revendedor (tiene código
    // propio) no se borra — pierde la tienda pero conserva su cuenta y su
    // historial de comisiones de otras tiendas, igual que alguien que nunca
    // llegó a tener tienda propia.
    await tx.user.updateMany({
      where: { tenantId, referralCode: { not: null } },
      data: { tenantId: null, role: "CUSTOMER" },
    });
    await tx.user.deleteMany({ where: { tenantId } });

    await tx.tenant.delete({ where: { id: tenantId } });
  });

  revalidatePath("/platform/tiendas");
  return { ok: true as const };
}

// "Entrar como admin" — deja al super admin logueado como el dueño real de
// la tienda, para poder ayudarlo sin pedirle la contraseña. Reusa el mismo
// pase efímero de un solo uso que ya existe para cruzar de dominio (ver
// admin/cuenta-urbi/page.tsx); auth.ts reconoce el prefijo "impersonate:" y
// marca la sesión resultante con impersonatedBy, que es lo que hace
// aparecer el cartel de "modo soporte" en el panel de la tienda.
export async function impersonateTenant(tenantId: string) {
  try {
    return await runImpersonateTenant(tenantId);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar la tienda");
  }
}

async function runImpersonateTenant(tenantId: string) {
  const session = await requireSuperAdmin();

  const [tenant, admin] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { subdomain: true } }),
    prisma.user.findFirst({ where: { tenantId, role: "ADMIN" }, orderBy: { createdAt: "asc" } }),
  ]);
  if (!admin) throw new ActionError("Esta tienda no tiene ningún admin todavía");

  const token = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: {
      identifier: `impersonate:${session.user.id}:${admin.id}`,
      token,
      expires: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  const protocol = ROOT_DOMAIN.startsWith("localhost") ? "http" : "https";
  redirect(`${protocol}://${tenant.subdomain}.${ROOT_DOMAIN}/login?token=${token}&callbackUrl=%2Fadmin`);
  return { ok: true as const };
}

const platformDomainSchema = z
  .string()
  .min(3, "Ingresá un dominio válido")
  .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/, "Formato de dominio inválido (ej: pedidos.mimarca.com)");

// Edición manual del dominio propio desde soporte: mismas reglas de formato
// y unicidad que el alta que hace el dueño de la tienda desde
// /admin/configuracion (ver runSetCustomDomain), pero acá el super admin
// puede además marcar "Verificado" a mano — para destrabar casos donde el
// TXT ya se confirmó por otra vía (DNS lento, dominio con proxy tipo
// Cloudflare que oculta el registro, etc.) sin esperar al próximo chequeo.
// Dejar el campo vacío quita el dominio propio de la tienda.
export async function overrideCustomDomain(tenantId: string, formData: FormData) {
  try {
    return await runOverrideCustomDomain(tenantId, formData);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar el dominio");
  }
}

async function runOverrideCustomDomain(tenantId: string, formData: FormData) {
  await requireSuperAdmin();
  const raw = String(formData.get("customDomain") ?? "").trim().toLowerCase();
  const verified = formData.get("verified") === "on";

  if (!raw) {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { customDomain: null, customDomainToken: null, customDomainVerified: false },
    });
    revalidateTenant(tenantId);
    return { ok: true as const };
  }

  const parsed = platformDomainSchema.safeParse(raw);
  if (!parsed.success) throw new ActionError(parsed.error.issues[0]?.message ?? "Dominio inválido");
  const domain = parsed.data;

  const existing = await prisma.tenant.findUnique({ where: { customDomain: domain } });
  if (existing && existing.id !== tenantId) {
    throw new ActionError("Ese dominio ya está en uso por otra tienda");
  }

  const current = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { customDomain: true, customDomainToken: true },
  });
  const domainChanged = current?.customDomain !== domain;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      customDomain: domain,
      customDomainToken: domainChanged || !current?.customDomainToken ? generateDomainToken() : current.customDomainToken,
      customDomainVerified: verified,
    },
  });
  revalidateTenant(tenantId);
  return { ok: true as const };
}

// Aplicar un código a mano, a una tienda que ya existe — para cuando el
// canje no pasó por el alta (código pactado después, por ejemplo). Mismas
// validaciones que el canje automático de registro/datos/actions.ts
// (activo, no vencido, no agotado). PromotionRedemption.tenantId es único:
// si la tienda ya tenía un código aplicado, éste lo reemplaza y le devuelve
// el uso al código anterior, todo en la misma transacción.
export async function applyPromotionToTenant(tenantId: string, code: string) {
  try {
    return await runApplyPromotionToTenant(tenantId, code);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar la tienda");
  }
}

async function runApplyPromotionToTenant(tenantId: string, code: string) {
  await requireSuperAdmin();
  const normalized = code.trim().toUpperCase();
  if (!normalized) throw new ActionError("Ingresá un código");

  await prisma.$transaction(async (tx) => {
    const promotion = await tx.promotionCode.findUnique({ where: { code: normalized } });
    if (!promotion || !promotion.active) throw new ActionError("El código promocional ya no está activo");
    if (promotion.validUntil && promotion.validUntil < new Date()) throw new ActionError("El código promocional venció");
    if (promotion.maxUses !== null && promotion.usedCount >= promotion.maxUses) {
      throw new ActionError("El código promocional alcanzó su límite de usos");
    }

    const previous = await tx.promotionRedemption.findUnique({ where: { tenantId } });
    if (previous) {
      await tx.promotionRedemption.delete({ where: { tenantId } });
      await tx.promotionCode.update({ where: { id: previous.promotionCodeId }, data: { usedCount: { decrement: 1 } } });
    }

    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setMonth(endsAt.getMonth() + promotion.durationMonths);

    await tx.promotionRedemption.create({
      data: { promotionCodeId: promotion.id, tenantId, startsAt: now, endsAt },
    });
    await tx.promotionCode.update({ where: { id: promotion.id }, data: { usedCount: { increment: 1 } } });
    await tx.tenant.update({
      where: { id: tenantId },
      data: {
        nextBillingDate: endsAt,
        billingStatus: "ACTIVE",
        trialEndsAt: null,
        billingNotes: `Bonificada ${promotion.durationMonths} meses con código ${promotion.code}`,
      },
    });
  });

  revalidateTenant(tenantId);
  return { ok: true as const };
}
