"use server";

import { ActionError, toUserError } from "@/lib/action-error";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-super-admin";

const promotionSchema = z.object({
  code: z.string().trim().min(4, "El código debe tener al menos 4 caracteres").max(30),
  description: z.string().trim().max(160).optional(),
  durationMonths: z.coerce.number().int().min(1).max(60),
  maxUses: z.coerce.number().int().positive().optional(),
  validUntil: z.string().optional(),
});

function normalizeCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

export async function createPromotionCode(formData: FormData) {
  try {
    return await runCreatePromotionCode(formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la promoción");
  }
}

async function runCreatePromotionCode(formData: FormData) {
  await requireSuperAdmin();
  const parsed = promotionSchema.safeParse({
    code: normalizeCode(String(formData.get("code") ?? "")),
    description: formData.get("description") || undefined,
    durationMonths: formData.get("durationMonths"),
    maxUses: formData.get("maxUses") || undefined,
    validUntil: formData.get("validUntil") || undefined,
  });
  if (!parsed.success) throw new ActionError(parsed.error.issues[0]?.message ?? "Datos inválidos");
  const { data: parsedData } = parsed;

  const existing = await prisma.promotionCode.findUnique({ where: { code: parsedData.code } });
  if (existing) throw new ActionError("Ya existe un código con ese nombre");

  await prisma.promotionCode.create({
    data: {
      code: parsedData.code,
      description: parsedData.description || null,
      durationMonths: parsedData.durationMonths,
      maxUses: parsedData.maxUses ?? null,
      validUntil: parsedData.validUntil ? new Date(`${parsedData.validUntil}T23:59:59.999-03:00`) : null,
    },
  });
  revalidatePath("/platform/promociones");
  return { ok: true as const };
}

export async function togglePromotionCode(id: string, active: boolean) {
  try {
    return await runTogglePromotionCode(id, active);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la promoción");
  }
}

async function runTogglePromotionCode(id: string, active: boolean) {
  await requireSuperAdmin();
  await prisma.promotionCode.update({ where: { id }, data: { active } });
  revalidatePath("/platform/promociones");
  return { ok: true as const };
}

// Solo se puede borrar un código que nunca se usó — si ya tiene canjes, la
// FK a PromotionRedemption lo impide (sin cascade a propósito, se pierde el
// historial de qué tienda usó qué código). Para un código gastado, la
// acción correcta es pausarlo, no borrarlo.
export async function deletePromotionCode(id: string) {
  try {
    return await runDeletePromotionCode(id);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la promoción");
  }
}

async function runDeletePromotionCode(id: string) {
  await requireSuperAdmin();
  const promotion = await prisma.promotionCode.findUnique({ where: { id }, select: { usedCount: true } });
  if (!promotion) return;
  if (promotion.usedCount > 0) {
    throw new ActionError("Este código ya se usó, no se puede borrar — pausalo en cambio");
  }
  await prisma.promotionCode.delete({ where: { id } });
  revalidatePath("/platform/promociones");
  return { ok: true as const };
}
