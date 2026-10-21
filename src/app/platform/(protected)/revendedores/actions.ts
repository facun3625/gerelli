"use server";

import { ActionError, toUserError } from "@/lib/action-error";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-super-admin";

function revalidateRevendedores() {
  revalidatePath("/platform/revendedores");
  revalidatePath("/socios");
  revalidatePath("/revendedores");
}

const settingsSchema = z.object({
  activationBonusAmount: z.coerce.number().nonnegative("No puede ser negativo"),
  activationBonusDays: z.coerce.number().int().positive("Tiene que ser mayor a 0"),
  commissionPayoutDays: z.coerce.number().int().positive("Tiene que ser mayor a 0"),
});

export async function updateResellerSettings(formData: FormData) {
  try {
    return await runUpdateResellerSettings(formData);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar el socio");
  }
}

async function runUpdateResellerSettings(formData: FormData) {
  await requireSuperAdmin();
  const parsed = settingsSchema.parse({
    activationBonusAmount: formData.get("activationBonusAmount"),
    activationBonusDays: formData.get("activationBonusDays"),
    commissionPayoutDays: formData.get("commissionPayoutDays"),
  });

  await prisma.resellerSettings.upsert({
    where: { id: "global" },
    update: parsed,
    create: { id: "global", ...parsed },
  });
  revalidateRevendedores();
  return { ok: true as const };
}

const tierSchema = z.object({
  minActiveStores: z.coerce.number().int().nonnegative("No puede ser negativo"),
  percent: z.coerce.number().positive("Tiene que ser mayor a 0").max(100, "No puede superar 100"),
});

export async function createTier(formData: FormData) {
  try {
    return await runCreateTier(formData);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar el socio");
  }
}

async function runCreateTier(formData: FormData) {
  await requireSuperAdmin();
  const parsed = tierSchema.parse({
    minActiveStores: formData.get("minActiveStores"),
    percent: formData.get("percent"),
  });

  const existing = await prisma.resellerCommissionTier.findUnique({
    where: { minActiveStores: parsed.minActiveStores },
  });
  if (existing) throw new ActionError("Ya existe un escalón con esa cantidad de tiendas");

  await prisma.resellerCommissionTier.create({ data: parsed });
  revalidateRevendedores();
  return { ok: true as const };
}

export async function updateTier(id: string, formData: FormData) {
  try {
    return await runUpdateTier(id, formData);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar el socio");
  }
}

async function runUpdateTier(id: string, formData: FormData) {
  await requireSuperAdmin();
  const parsed = tierSchema.parse({
    minActiveStores: formData.get("minActiveStores"),
    percent: formData.get("percent"),
  });

  await prisma.resellerCommissionTier.update({ where: { id }, data: parsed });
  revalidateRevendedores();
  return { ok: true as const };
}

export async function deleteTier(id: string) {
  try {
    return await runDeleteTier(id);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar el socio");
  }
}

async function runDeleteTier(id: string) {
  await requireSuperAdmin();
  await prisma.resellerCommissionTier.delete({ where: { id } });
  revalidateRevendedores();
  return { ok: true as const };
}

export async function markCommissionPaid(id: string) {
  try {
    return await runMarkCommissionPaid(id);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar el socio");
  }
}

async function runMarkCommissionPaid(id: string) {
  await requireSuperAdmin();
  await prisma.resellerCommission.update({
    where: { id },
    data: { status: "PAID", paidAt: new Date() },
  });
  revalidateRevendedores();
  return { ok: true as const };
}

// Para cuando efectivamente le transferís a un revendedor: salda de una
// todo lo que tenga pendiente, no solo lo ya vencido — si le estás pagando
// ahora, no tiene sentido dejar afuera lo que vence en unos días más.
export async function markAllCommissionsPaid(resellerId: string) {
  try {
    return await runMarkAllCommissionsPaid(resellerId);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar el socio");
  }
}

async function runMarkAllCommissionsPaid(resellerId: string) {
  await requireSuperAdmin();
  await prisma.resellerCommission.updateMany({
    where: { resellerId, status: "PENDING" },
    data: { status: "PAID", paidAt: new Date() },
  });
  revalidateRevendedores();
  return { ok: true as const };
}

// El revendedor sigue existiendo (no se borra su historial), pero deja de
// poder repartir su código con efecto — cualquiera que lo use de ahora en
// más simplemente no queda asociado a nadie.
export async function deactivateReseller(userId: string) {
  try {
    return await runDeactivateReseller(userId);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar el socio");
  }
}

async function runDeactivateReseller(userId: string) {
  await requireSuperAdmin();
  await prisma.user.update({ where: { id: userId }, data: { resellerDeactivatedAt: new Date() } });
  revalidateRevendedores();
  return { ok: true as const };
}

export async function reactivateReseller(userId: string) {
  try {
    return await runReactivateReseller(userId);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar el socio");
  }
}

async function runReactivateReseller(userId: string) {
  await requireSuperAdmin();
  await prisma.user.update({ where: { id: userId }, data: { resellerDeactivatedAt: null } });
  revalidateRevendedores();
  return { ok: true as const };
}
