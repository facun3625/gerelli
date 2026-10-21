"use server";

import { ActionError, toUserError } from "@/lib/action-error";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireOnboardingUser } from "@/lib/require-onboarding";
import { notifyPlatformNewTenant } from "@/lib/telegram";
import { seedEstateCatalogDefaults } from "@/lib/estate/catalog-defaults";

const RESERVED_SUBDOMAINS = new Set(["www", "app", "admin", "api", "platform", "mail", "ftp", "login", "registro"]);

const subdomainSchema = z
  .string()
  .min(4, "Mínimo 4 caracteres")
  .max(40, "Máximo 40 caracteres")
  .regex(/^[a-z]+$/, "Usá solamente letras, sin espacios, números ni guiones")
  .refine((v) => !RESERVED_SUBDOMAINS.has(v), "Ese subdominio no está disponible");

const datosSchema = z.object({
  subdomain: subdomainSchema,
  storeName: z.string().min(1, "Ingresá el nombre del negocio"),
  // Solo obligatorio si el usuario no tiene contraseña todavía (se registró
  // con Google) — ver comentario más abajo sobre por qué hace falta.
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional(),
  // Todo esto es opcional a propósito — no queremos sumarle fricción al
  // alta pidiendo datos que se pueden completar después. Teléfono es del
  // dueño (User.phone); ciudad/provincia son de la tienda, de cara al
  // público (Settings, igual que la dirección); rubro y "cómo nos
  // conociste" son para la plataforma, no se le muestran a nadie más.
  phone: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  businessCategory: z.string().optional(),
  referralSource: z.string().optional(),
  promotionCode: z.string().trim().max(30).optional(),
});

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "localhost:3010";

export async function checkSubdomainAvailability(value: string) {
  try {
    return await runCheckSubdomainAvailability(value);
  } catch (err) {
    return toUserError(err, "No se pudieron guardar los datos");
  }
}

async function runCheckSubdomainAvailability(value: string) {
  await requireOnboardingUser();

  const parsed = subdomainSchema.safeParse(value.trim().toLowerCase());
  if (!parsed.success) {
    return { available: false, message: parsed.error.issues[0]?.message ?? "Subdominio inválido" };
  }

  const existing = await prisma.tenant.findUnique({
    where: { subdomain: parsed.data },
    select: { id: true },
  });

  return existing
    ? { available: false, message: "Ese subdominio ya está ocupado" }
    : { available: true, message: "Subdominio disponible" };
}

export async function createTenantFromOnboarding(formData: FormData) {
  try {
    return await runCreateTenantFromOnboarding(formData);
  } catch (err) {
    return toUserError(err, "No se pudieron guardar los datos");
  }
}

async function runCreateTenantFromOnboarding(formData: FormData) {
  const session = await requireOnboardingUser();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      pendingPlanId: true,
      pendingReferralCode: true,
      pendingPromotionCodeId: true,
      pendingBillingCycle: true,
      pendingSubscriptionId: true,
      pendingSubscriptionStatus: true,
      pendingPlan: { select: { trialDays: true, name: true } },
    },
  });
  if (!user?.pendingPlanId || !user.pendingPlan) {
    redirect("/registro/plan");
  }

  const parsed = datosSchema.parse({
    subdomain: (formData.get("subdomain") as string)?.trim().toLowerCase(),
    storeName: formData.get("storeName"),
    password: formData.get("password") || undefined,
    phone: formData.get("phone") || undefined,
    city: formData.get("city") || undefined,
    province: formData.get("province") || undefined,
    businessCategory: formData.get("businessCategory") || undefined,
    referralSource: formData.get("referralSource") || undefined,
    promotionCode: String(formData.get("promotionCode") ?? "").trim().toUpperCase() || undefined,
  });

  const existing = await prisma.tenant.findUnique({ where: { subdomain: parsed.subdomain } });
  if (existing) throw new ActionError("Ya existe una tienda con ese subdominio");

  const passwordHash = parsed.password ? await bcrypt.hash(parsed.password, 10) : undefined;
  const planTrialDays = user.pendingPlan.trialDays;

  // Si llegó con el código de un revendedor (por /registro?ref=CODIGO o
  // tipeado a mano), acá es donde se fija de verdad la atribución — recién
  // cuando la tienda se crea de verdad, no antes. Un código inválido o de
  // un revendedor dado de baja simplemente no asocia nada, no bloquea el
  // alta.
  // Sin filtro de role a propósito: ser revendedor es tener un código, no
  // un rol — puede ser alguien sin tienda todavía (CUSTOMER) o admin de su
  // propia tienda que ADEMÁS reparte su código (ver lib/require-reseller.ts).
  const reseller = user.pendingReferralCode
    ? await prisma.user.findFirst({
        where: { referralCode: user.pendingReferralCode, resellerDeactivatedAt: null },
      })
    : null;

  const tenant = await prisma.$transaction(async (tx) => {
    const promotion = parsed.promotionCode
      ? await tx.promotionCode.findUnique({ where: { code: parsed.promotionCode } })
      : user.pendingPromotionCodeId
        ? await tx.promotionCode.findUnique({ where: { id: user.pendingPromotionCodeId } })
        : null;
    if ((parsed.promotionCode || user.pendingPromotionCodeId) && (!promotion || !promotion.active)) {
      throw new ActionError("El código promocional ya no está activo");
    }
    if (promotion?.validUntil && promotion.validUntil < new Date()) {
      throw new ActionError("El código promocional venció");
    }
    if (promotion?.maxUses !== null && promotion && promotion.usedCount >= promotion.maxUses) {
      throw new ActionError("El código promocional alcanzó su límite de usos");
    }

    const now = new Date();
    const billingCycle = user.pendingBillingCycle ?? "MONTHLY";
    let nextBillingDate: Date;
    let trialEndsAt: Date | null = null;
    if (promotion) {
      nextBillingDate = new Date(now);
      nextBillingDate.setMonth(nextBillingDate.getMonth() + promotion.durationMonths);
    } else if (planTrialDays > 0) {
      trialEndsAt = new Date(now.getTime() + planTrialDays * 24 * 60 * 60 * 1000);
      nextBillingDate = trialEndsAt;
    } else {
      nextBillingDate = now;
    }

    const tenant = await tx.tenant.create({
      data: {
        subdomain: parsed.subdomain,
        planId: user.pendingPlanId,
        billingStatus: promotion ? "ACTIVE" : trialEndsAt ? "TRIAL" : "SUSPENDED",
        trialEndsAt,
        nextBillingDate,
        billingCycle,
        // Compatibilidad con registros que alcanzaron a usar el recorrido
        // viejo de pago antes de crear la tienda. Nunca descartamos una
        // autorización recurrente: queda vinculada al tenant nuevo.
        providerSubscriptionId: user.pendingSubscriptionId,
        providerSubscriptionStatus: user.pendingSubscriptionStatus,
        subscriptionStartedAt: user.pendingSubscriptionId ? now : null,
        subscriptionSyncedAt: user.pendingSubscriptionId ? now : null,
        billingNotes: promotion ? `Bonificada ${promotion.durationMonths} meses con código ${promotion.code}` : null,
        referredByResellerId: reseller?.id,
        businessCategory: parsed.businessCategory,
        referralSource: parsed.referralSource,
      },
    });
    await tx.settings.create({
      data: { tenantId: tenant.id, key: "store_name", value: parsed.storeName },
    });
    const extraSettings = [
      parsed.city ? { key: "store_city", value: parsed.city } : null,
      parsed.province ? { key: "store_province", value: parsed.province } : null,
    ].filter((s) => s !== null);
    if (extraSettings.length > 0) {
      await tx.settings.createMany({
        data: extraSettings.map((s) => ({ tenantId: tenant.id, key: s.key, value: s.value })),
      });
    }
    await tx.paymentMethodConfig.createMany({
      data: [
        { tenantId: tenant.id, type: "CASH_ON_DELIVERY", enabled: true },
        { tenantId: tenant.id, type: "TRANSFER", enabled: false },
        { tenantId: tenant.id, type: "MERCADOPAGO", enabled: false },
      ],
    });
    await tx.fulfillmentMethodConfig.createMany({
      data: [
        { tenantId: tenant.id, type: "DELIVERY", enabled: true },
        { tenantId: tenant.id, type: "PICKUP", enabled: false },
      ],
    });
    await seedEstateCatalogDefaults(tx, tenant.id);

    // El usuario que se registró en urbi.com.ar pasa a ser el admin de esta
    // tienda — mismo User, ya no "pendiente" (tenantId null). Sus cuentas de
    // Google (si entró por ahí) se re-scopean a este tenant para que el
    // login funcione igual en el subdominio nuevo.
    await tx.user.update({
      where: { id: user.id },
      data: {
        tenantId: tenant.id,
        role: "ADMIN",
        pendingPlanId: null,
        onboardingPaidAt: null,
        pendingReferralCode: null,
        pendingPromotionCodeId: null,
        pendingBillingCycle: null,
        pendingSubscriptionId: null,
        pendingSubscriptionStatus: null,
        ...(passwordHash ? { passwordHash } : {}),
        ...(parsed.phone ? { phone: parsed.phone } : {}),
      },
    });
    await tx.account.updateMany({
      where: { userId: user.id, tenantId: null },
      data: { tenantId: tenant.id },
    });

    if (promotion) {
      await tx.promotionRedemption.create({
        data: {
          promotionCodeId: promotion.id,
          tenantId: tenant.id,
          startsAt: tenant.createdAt,
          endsAt: nextBillingDate,
        },
      });
      await tx.promotionCode.update({
        where: { id: promotion.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    return tenant;
  }, { isolationLevel: "Serializable" });

  // Fire-and-forget: aviso al equipo de Urbi de que hay una tienda nueva —
  // no debe demorar ni romper el alta si Telegram falla o no está configurado.
  notifyPlatformNewTenant({
    storeName: parsed.storeName,
    subdomain: tenant.subdomain,
    planName: user.pendingPlan.name,
    ownerName: session.user.name ?? null,
    ownerEmail: session.user.email ?? "",
  }).catch(() => {});

  // Token de un solo uso para entrar directo al panel de la tienda nueva
  // sin pedirle de nuevo el email/contraseña que recién escribió — el
  // cookie de sesión de urbi.com.ar no puede viajar solo al subdominio
  // nuevo (dominios distintos para el navegador), así que esto reemplaza
  // ese re-login manual por un solo click. Vive 5 minutos, se usa una vez
  // (ver auth.ts, scope "magic-token").
  const token = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: { identifier: `onboarding:${user.id}`, token, expires: new Date(Date.now() + 5 * 60 * 1000) },
  });

  const protocol = ROOT_DOMAIN.startsWith("localhost") ? "http" : "https";
  redirect(`${protocol}://${tenant.subdomain}.${ROOT_DOMAIN}/login?onboarded=1&callbackUrl=%2Fadmin&token=${token}`);
  return { ok: true as const };
}
