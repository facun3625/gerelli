"use server";

import { ActionError, toUserError } from "@/lib/action-error";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-super-admin";

const planSchema = z.object({
  name: z.string().min(1, "Ingresá un nombre"),
  priceMonthly: z.coerce.number().nonnegative("El precio no puede ser negativo"),
  priceAnnual: z.coerce.number().nonnegative("El precio anual no puede ser negativo").optional(),
  trialDays: z.coerce.number().int().min(0).max(365),
  maxPublishedProperties: z.coerce.number().int().nonnegative().optional(),
  maxProducts: z.coerce.number().int().positive().optional(),
  maxAiMessagesPerMonth: z.coerce.number().int().positive().optional(),
  allowRealEstate: z.boolean(),
  allowConsortium: z.boolean(),
  allowPostSale: z.boolean(),
  allowCustomDomain: z.boolean(),
  allowServices: z.boolean(),
  allowStats: z.boolean(),
  allowAiAgent: z.boolean(),
  description: z.string().optional(),
}).refine(
  (plan) => plan.allowRealEstate || plan.allowConsortium || plan.allowPostSale,
  { message: "El plan debe incluir al menos un módulo" },
);

function parsePlanForm(formData: FormData) {
  return planSchema.parse({
    name: formData.get("name"),
    priceMonthly: formData.get("priceMonthly"),
    priceAnnual: formData.get("priceAnnual") || undefined,
    trialDays: formData.get("trialDays"),
    maxPublishedProperties: formData.get("maxPublishedProperties") || undefined,
    maxProducts: formData.get("maxProducts") || undefined,
    maxAiMessagesPerMonth: formData.get("maxAiMessagesPerMonth") || undefined,
    allowRealEstate: formData.get("allowRealEstate") === "true",
    allowConsortium: formData.get("allowConsortium") === "true",
    allowPostSale: formData.get("allowPostSale") === "true",
    allowCustomDomain: formData.get("allowCustomDomain") === "true",
    allowServices: formData.get("allowServices") === "true",
    allowStats: formData.get("allowStats") === "true",
    allowAiAgent: formData.get("allowAiAgent") === "true",
    description: formData.get("description") || undefined,
  });
}

export async function createPlan(formData: FormData) {
  try {
    return await runCreatePlan(formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el plan");
  }
}

async function runCreatePlan(formData: FormData) {
  await requireSuperAdmin();
  const parsed = parsePlanForm(formData);

  const last = await prisma.plan.findFirst({ orderBy: { order: "desc" } });

  await prisma.plan.create({
    data: {
      name: parsed.name,
      priceMonthly: parsed.priceMonthly,
      priceAnnual: parsed.priceAnnual ?? null,
      trialDays: parsed.trialDays,
      maxPublishedProperties: parsed.maxPublishedProperties ?? null,
      maxProducts: parsed.maxProducts ?? null,
      maxAiMessagesPerMonth: parsed.maxAiMessagesPerMonth ?? null,
      allowRealEstate: parsed.allowRealEstate,
      allowConsortium: parsed.allowConsortium,
      allowPostSale: parsed.allowPostSale,
      allowCustomDomain: parsed.allowCustomDomain,
      allowServices: parsed.allowServices,
      allowStats: parsed.allowStats,
      allowAiAgent: parsed.allowAiAgent,
      description: parsed.description?.trim() || null,
      order: (last?.order ?? -1) + 1,
    },
  });
  revalidatePath("/platform/planes");
  revalidatePath("/");
  return { ok: true as const };
}

export async function updatePlan(id: string, formData: FormData) {
  try {
    return await runUpdatePlan(id, formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el plan");
  }
}

async function runUpdatePlan(id: string, formData: FormData) {
  await requireSuperAdmin();
  const parsed = parsePlanForm(formData);

  await prisma.plan.update({
    where: { id },
    data: {
      name: parsed.name,
      priceMonthly: parsed.priceMonthly,
      priceAnnual: parsed.priceAnnual ?? null,
      trialDays: parsed.trialDays,
      maxPublishedProperties: parsed.maxPublishedProperties ?? null,
      maxProducts: formData.has("maxProducts") ? parsed.maxProducts ?? null : undefined,
      maxAiMessagesPerMonth: formData.has("maxAiMessagesPerMonth") ? parsed.maxAiMessagesPerMonth ?? null : undefined,
      allowRealEstate: parsed.allowRealEstate,
      allowConsortium: parsed.allowConsortium,
      allowPostSale: parsed.allowPostSale,
      allowCustomDomain: parsed.allowCustomDomain,
      allowServices: parsed.allowServices,
      allowStats: parsed.allowStats,
      allowAiAgent: parsed.allowAiAgent,
      description: parsed.description?.trim() || null,
    },
  });
  revalidatePath("/platform/planes");
  revalidatePath("/platform/tiendas");
  revalidatePath("/");
  return { ok: true as const };
}

export async function togglePlanActive(id: string, active: boolean) {
  try {
    return await runTogglePlanActive(id, active);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el plan");
  }
}

async function runTogglePlanActive(id: string, active: boolean) {
  await requireSuperAdmin();
  await prisma.plan.update({ where: { id }, data: { active } });
  revalidatePath("/platform/planes");
  revalidatePath("/");
  return { ok: true as const };
}

export async function deletePlan(id: string) {
  try {
    return await runDeletePlan(id);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el plan");
  }
}

async function runDeletePlan(id: string) {
  await requireSuperAdmin();
  const tenantCount = await prisma.tenant.count({ where: { planId: id } });
  if (tenantCount > 0) {
    throw new ActionError("No se puede borrar un plan con tiendas asignadas. Cambiales el plan primero.");
  }
  await prisma.plan.delete({ where: { id } });
  revalidatePath("/platform/planes");
  revalidatePath("/");
  return { ok: true as const };
}

// Solo un plan lleva el badge "Más elegido" en la landing — marcar uno
// desmarca a los demás en el mismo paso.
export async function setFeaturedPlan(id: string) {
  try {
    return await runSetFeaturedPlan(id);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el plan");
  }
}

async function runSetFeaturedPlan(id: string) {
  await requireSuperAdmin();
  await prisma.$transaction([
    prisma.plan.updateMany({ where: { featured: true }, data: { featured: false } }),
    prisma.plan.update({ where: { id }, data: { featured: true } }),
  ]);
  revalidatePath("/platform/planes");
  revalidatePath("/");
  return { ok: true as const };
}

export async function unfeaturePlan(id: string) {
  try {
    return await runUnfeaturePlan(id);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el plan");
  }
}

async function runUnfeaturePlan(id: string) {
  await requireSuperAdmin();
  await prisma.plan.update({ where: { id }, data: { featured: false } });
  revalidatePath("/platform/planes");
  revalidatePath("/");
  return { ok: true as const };
}

// Reordena intercambiando el `order` con el plan vecino — así el orden
// siempre queda como una secuencia consistente, sin huecos que arrastrar.
export async function movePlan(id: string, direction: "up" | "down") {
  try {
    return await runMovePlan(id, direction);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el plan");
  }
}

async function runMovePlan(id: string, direction: "up" | "down") {
  await requireSuperAdmin();
  const plans = await prisma.plan.findMany({ orderBy: { order: "asc" }, select: { id: true, order: true } });
  const index = plans.findIndex((p) => p.id === id);
  if (index === -1) return;
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= plans.length) return;

  const current = plans[index];
  const neighbor = plans[swapIndex];
  await prisma.$transaction([
    prisma.plan.update({ where: { id: current.id }, data: { order: neighbor.order } }),
    prisma.plan.update({ where: { id: neighbor.id }, data: { order: current.order } }),
  ]);
  revalidatePath("/platform/planes");
  revalidatePath("/");
  return { ok: true as const };
}
