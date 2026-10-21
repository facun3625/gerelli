"use server";

import { ActionError, toUserError } from "@/lib/action-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireTenantAdmin } from "@/lib/require-admin";
import { seedDefaultStock, toDateAtNoon } from "@/lib/schedule";
import { logGroupStockMovement } from "@/lib/stock-movements";

const deliveryDateSchema = z.object({
  date: z.string().min(1, "Elegí una fecha"),
  orderOpenAt: z.string().optional(),
  cutoffAt: z.string().optional(),
  capacity: z.string().optional(),
  notes: z.string().optional(),
});

// Si alguno de los dos lados es "sin límite" no hay un delta numérico limpio.
function adjustmentDelta(oldValue: number | null, newValue: number | null): number | null {
  if (oldValue == null || newValue == null) return null;
  return newValue - oldValue;
}

// El corte de pedidos nunca puede caer después del propio día de entrega.
function assertCutoffNotAfterDelivery(date: string, cutoffAt: string | undefined) {
  if (!cutoffAt) return;
  const endOfDeliveryDay = new Date(`${date}T23:59:59`);
  if (new Date(cutoffAt) > endOfDeliveryDay) {
    throw new ActionError("El corte no puede ser posterior a la fecha de entrega");
  }
}

export async function createDeliveryDate(formData: FormData) {
  try {
    return await runCreateDeliveryDate(formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la fecha");
  }
}

async function runCreateDeliveryDate(formData: FormData) {
  const { tenant } = await requireTenantAdmin();
  const parsed = deliveryDateSchema.parse({
    date: formData.get("date"),
    orderOpenAt: formData.get("orderOpenAt") || undefined,
    cutoffAt: formData.get("cutoffAt") || undefined,
    capacity: formData.get("capacity") || undefined,
    notes: formData.get("notes") || undefined,
  });
  assertCutoffNotAfterDelivery(parsed.date, parsed.cutoffAt);

  // Arrastra el modo de stock de la fecha anterior más cercana — si la
  // tienda siempre vende "sin límite", no la hace volver a BY_GROUP (el
  // default del schema) en cada fecha nueva.
  const newDate = toDateAtNoon(parsed.date);
  const previous = await prisma.deliveryDate.findFirst({
    where: { tenantId: tenant.id, date: { lt: newDate } },
    orderBy: { date: "desc" },
    select: { stockMode: true },
  });

  const deliveryDate = await prisma.deliveryDate.create({
    data: {
      tenantId: tenant.id,
      date: newDate,
      orderOpenAt: parsed.orderOpenAt ? new Date(parsed.orderOpenAt) : null,
      cutoffAt: parsed.cutoffAt ? new Date(parsed.cutoffAt) : null,
      capacity: parsed.capacity ? Number(parsed.capacity) : null,
      notes: parsed.notes,
      stockMode: previous?.stockMode ?? "BY_GROUP",
    },
  });
  await seedDefaultStock(tenant.id, deliveryDate.id);
  revalidatePath("/admin/fechas");
  redirect(`/admin/fechas/${deliveryDate.id}`);
  return { ok: true as const };
}

// Guarda de una sola vez TODO lo que se tocó en la pantalla de la fecha:
// datos (estado, horarios, capacidad, notas), modalidad de stock, el stock
// cargado por pozo, y las franjas especiales — un solo botón "Guardar
// cambios" para toda la pantalla, nada se persiste antes de eso. A qué pozo
// pertenece cada variante NO se toca acá — es configuración del producto,
// no de una fecha puntual, y se edita desde Productos → Grupos de stock.
const saveDeliveryDateSchema = deliveryDateSchema.extend({
  open: z.string(),
  showCatalogBeforeOpen: z.string(),
  stockMode: z.enum(["BY_GROUP", "UNLIMITED"]),
  // { added: string[] (labels nuevos), removedIds: string[] (franjas existentes a borrar) }
  pickupSlots: z.string().optional(),
});

export async function saveDeliveryDate(id: string, formData: FormData) {
  try {
    return await runSaveDeliveryDate(id, formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la fecha");
  }
}

async function runSaveDeliveryDate(id: string, formData: FormData) {
  const { tenant } = await requireTenantAdmin();

  const deliveryDate = await prisma.deliveryDate.findUnique({ where: { id, tenantId: tenant.id } });
  if (!deliveryDate) throw new ActionError("Fecha no encontrada");

  const parsed = saveDeliveryDateSchema.parse({
    date: formData.get("date"),
    orderOpenAt: formData.get("orderOpenAt") || undefined,
    cutoffAt: formData.get("cutoffAt") || undefined,
    capacity: formData.get("capacity") || undefined,
    notes: formData.get("notes") || undefined,
    open: formData.get("open"),
    showCatalogBeforeOpen: formData.get("showCatalogBeforeOpen"),
    stockMode: formData.get("stockMode"),
    pickupSlots: formData.get("pickupSlots") || undefined,
  });
  assertCutoffNotAfterDelivery(parsed.date, parsed.cutoffAt);

  const groupEntries = Array.from(formData.entries()).filter(([key]) => key.startsWith("stockgroup_"));

  const pickupSlotsPayload: { added: string[]; removedIds: string[] } = parsed.pickupSlots
    ? JSON.parse(parsed.pickupSlots)
    : { added: [], removedIds: [] };

  await prisma.$transaction(async (tx) => {
    await tx.deliveryDate.update({
      where: { id },
      data: {
        date: toDateAtNoon(parsed.date),
        orderOpenAt: parsed.orderOpenAt ? new Date(parsed.orderOpenAt) : null,
        cutoffAt: parsed.cutoffAt ? new Date(parsed.cutoffAt) : null,
        capacity: parsed.capacity ? Number(parsed.capacity) : null,
        notes: parsed.notes || null,
        status: parsed.open === "true" ? "OPEN" : "CLOSED",
        showCatalogBeforeOpen: parsed.showCatalogBeforeOpen === "true",
        stockMode: parsed.stockMode,
      },
    });

    for (const [key, value] of groupEntries) {
      const stockGroupId = key.replace("stockgroup_", "");
      const raw = String(value).trim();
      const quantityAvailable = raw === "" ? null : Math.max(0, Number(raw) || 0);
      const before = await tx.stockGroupStock.findUnique({
        where: { stockGroupId_deliveryDateId: { stockGroupId, deliveryDateId: id } },
      });
      if (before && before.quantityAvailable === quantityAvailable) continue;
      if (quantityAvailable != null && quantityAvailable < (before?.quantitySold ?? 0)) {
        throw new ActionError("El stock disponible no puede quedar por debajo de lo ya vendido");
      }
      await tx.stockGroupStock.upsert({
        where: { stockGroupId_deliveryDateId: { stockGroupId, deliveryDateId: id } },
        update: { quantityAvailable },
        create: { stockGroupId, deliveryDateId: id, quantityAvailable },
      });
      await logGroupStockMovement(tx, {
        tenantId: tenant.id,
        deliveryDateId: id,
        stockGroupId,
        reason: "ADJUSTMENT",
        delta: adjustmentDelta(before?.quantityAvailable ?? null, quantityAvailable),
      });
    }

    if (pickupSlotsPayload.removedIds.length > 0) {
      await tx.pickupSlot.deleteMany({
        where: { id: { in: pickupSlotsPayload.removedIds }, tenantId: tenant.id, deliveryDateId: id },
      });
    }
    if (pickupSlotsPayload.added.length > 0) {
      const last = await tx.pickupSlot.findFirst({
        where: { tenantId: tenant.id, deliveryDateId: id },
        orderBy: { order: "desc" },
      });
      let nextOrder = (last?.order ?? -1) + 1;
      for (const label of pickupSlotsPayload.added) {
        if (!label.trim()) continue;
        await tx.pickupSlot.create({
          data: { tenantId: tenant.id, deliveryDateId: id, label: label.trim(), order: nextOrder },
        });
        nextOrder += 1;
      }
    }
  });

  revalidatePath("/admin/fechas");
  revalidatePath(`/admin/fechas/${id}`);
  return { ok: true as const };
}

export async function deleteDeliveryDate(id: string) {
  try {
    return await runDeleteDeliveryDate(id);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la fecha");
  }
}

async function runDeleteDeliveryDate(id: string) {
  const { tenant } = await requireTenantAdmin();
  const orderCount = await prisma.order.count({ where: { deliveryDateId: id, tenantId: tenant.id } });
  if (orderCount > 0) {
    throw new ActionError("No se puede borrar una fecha con pedidos asociados. Cerrala en su lugar.");
  }
  await prisma.deliveryDate.delete({ where: { id, tenantId: tenant.id } });
  revalidatePath("/admin/fechas");
  // Sin redirect acá a propósito: quien llama (date-editor.tsx) lo envuelve
  // en un try/catch que muestra cualquier error como toast — el throw
  // interno que usa redirect() para funcionar caía en ese catch y se le
  // mostraba al usuario como un error real ("NEXT_REDIRECT..."). La
  // navegación después de borrar se hace del lado del cliente en su lugar.
  return { ok: true as const };
}

// ---------- Modo de disponibilidad ----------

export async function setOrderingMode(mode: "WEEKLY_HOURS" | "SCHEDULED_SALES") {
  try {
    return await runSetOrderingMode(mode);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la fecha");
  }
}

async function runSetOrderingMode(mode: "WEEKLY_HOURS" | "SCHEDULED_SALES") {
  const { tenant } = await requireTenantAdmin();
  await prisma.tenant.update({ where: { id: tenant.id }, data: { orderingMode: mode } });
  revalidatePath("/admin/fechas");
  revalidatePath("/");
  return { ok: true as const };
}

export async function setOrdersManuallyClosed(closed: boolean) {
  try {
    return await runSetOrdersManuallyClosed(closed);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la fecha");
  }
}

async function runSetOrdersManuallyClosed(closed: boolean) {
  const { tenant } = await requireTenantAdmin();
  await prisma.tenant.update({ where: { id: tenant.id }, data: { ordersManuallyClosed: closed } });
  revalidatePath("/admin/fechas");
  revalidatePath("/");
  return { ok: true as const };
}

// ---------- Horario semanal (modo A) ----------

const windowSchema = z.object({
  order: z.number().int().min(0),
  orderOpenTime: z.string().regex(/^\d{2}:\d{2}$/),
  orderCloseTime: z.string().regex(/^\d{2}:\d{2}$/),
  fulfillmentStart: z.string().regex(/^\d{2}:\d{2}$/),
  fulfillmentEnd: z.string().regex(/^\d{2}:\d{2}$/),
});

const daySchema = z.object({
  weekday: z.number().min(0).max(6),
  enabled: z.boolean(),
  windows: z.array(windowSchema),
});

export async function saveWeeklySchedule(formData: FormData) {
  try {
    return await runSaveWeeklySchedule(formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la fecha");
  }
}

async function runSaveWeeklySchedule(formData: FormData) {
  const { tenant } = await requireTenantAdmin();

  const days = JSON.parse(String(formData.get("days") || "[]")).map((d: unknown) => daySchema.parse(d)) as z.infer<
    typeof daySchema
  >[];

  for (const day of days) {
    if (day.enabled && day.windows.length === 0) {
      throw new ActionError("Cada día activo necesita al menos una franja horaria");
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const day of days) {
      const rule = await tx.weeklyScheduleRule.upsert({
        where: { tenantId_weekday: { tenantId: tenant.id, weekday: day.weekday } },
        update: { enabled: day.enabled },
        create: { tenantId: tenant.id, weekday: day.weekday, enabled: day.enabled },
      });
      await tx.weeklyScheduleWindow.deleteMany({ where: { ruleId: rule.id } });
      if (day.windows.length > 0) {
        await tx.weeklyScheduleWindow.createMany({
          data: day.windows.map((w) => ({ ...w, ruleId: rule.id })),
        });
      }
    }
  });

  revalidatePath("/admin/fechas");
  revalidatePath("/");
  return { ok: true as const };
}

// ---------- Cierres (feriados / vacaciones) ----------

const closureSchema = z.object({
  startDate: z.string().min(1, "Elegí una fecha de inicio"),
  endDate: z.string().min(1, "Elegí una fecha de fin"),
  reason: z.string().optional(),
});

export async function createStoreClosure(formData: FormData) {
  try {
    return await runCreateStoreClosure(formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la fecha");
  }
}

async function runCreateStoreClosure(formData: FormData) {
  const { tenant } = await requireTenantAdmin();
  const parsed = closureSchema.parse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    reason: formData.get("reason") || undefined,
  });

  const start = toDateAtNoon(parsed.startDate);
  const end = toDateAtNoon(parsed.endDate);
  if (end < start) throw new ActionError("La fecha de fin no puede ser anterior a la de inicio");

  await prisma.storeClosure.create({
    data: { tenantId: tenant.id, startDate: start, endDate: end, reason: parsed.reason ?? null },
  });
  revalidatePath("/admin/fechas/cierres");
  return { ok: true as const };
}

export async function deleteStoreClosure(id: string) {
  try {
    return await runDeleteStoreClosure(id);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la fecha");
  }
}

async function runDeleteStoreClosure(id: string) {
  const { tenant } = await requireTenantAdmin();
  await prisma.storeClosure.delete({ where: { id, tenantId: tenant.id } });
  revalidatePath("/admin/fechas/cierres");
  return { ok: true as const };
}

// ---------- Costos por fecha ----------

const costSchema = z.object({
  label: z.string().min(1, "Ingresá un nombre para el costo"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
});

export async function addDeliveryDateCost(deliveryDateId: string, formData: FormData) {
  try {
    return await runAddDeliveryDateCost(deliveryDateId, formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la fecha");
  }
}

async function runAddDeliveryDateCost(deliveryDateId: string, formData: FormData) {
  const { tenant } = await requireTenantAdmin();
  const deliveryDate = await prisma.deliveryDate.findUnique({
    where: { id: deliveryDateId, tenantId: tenant.id },
  });
  if (!deliveryDate) throw new ActionError("Fecha no encontrada");

  const parsed = costSchema.parse({
    label: formData.get("label"),
    amount: formData.get("amount"),
  });
  await prisma.deliveryDateCost.create({
    data: { deliveryDateId, label: parsed.label, amount: parsed.amount },
  });
  revalidatePath(`/admin/fechas/${deliveryDateId}`);
  revalidatePath("/admin/estadisticas");
  return { ok: true as const };
}

export async function deleteDeliveryDateCost(id: string) {
  try {
    return await runDeleteDeliveryDateCost(id);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la fecha");
  }
}

async function runDeleteDeliveryDateCost(id: string) {
  const { tenant } = await requireTenantAdmin();
  const cost = await prisma.deliveryDateCost.findUnique({
    where: { id },
    include: { deliveryDate: true },
  });
  if (!cost || cost.deliveryDate.tenantId !== tenant.id) throw new ActionError("Costo no encontrado");

  await prisma.deliveryDateCost.delete({ where: { id } });
  revalidatePath(`/admin/fechas/${cost.deliveryDateId}`);
  revalidatePath("/admin/estadisticas");
  return { ok: true as const };
}
