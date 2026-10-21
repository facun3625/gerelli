"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { clientIp, isRateLimited, recordFailure, type RateLimitRule } from "@/lib/rate-limit";

const BUSCAR_PEDIDO_RULE: RateLimitRule = { limit: 15, windowMinutes: 10 };

export type GuestOrderSummary = {
  id: string;
  createdAt: string;
  status: string;
  total: number;
};

export type FindGuestOrdersState = { orders: GuestOrderSummary[] | null; error: string };

const searchSchema = z.object({
  phone: z.string().trim().min(1, "Ingresá el teléfono que usaste al pedir."),
  email: z.string().trim().toLowerCase().email("Ingresá el email que usaste al pedir."),
});

// Búsqueda para quien compró sin cuenta y perdió el link de confirmación —
// pide los dos datos de contacto que cargó en el checkout (no alcanza con
// uno solo) para no dejar que cualquiera vea el pedido de otra persona
// probando teléfonos al voleo. Solo mira pedidos de invitado (userId null):
// una cuenta registrada ya tiene /pedidos con login.
export async function findGuestOrders(_prev: FindGuestOrdersState, formData: FormData): Promise<FindGuestOrdersState> {
  const ipKey = `buscar-pedido:${clientIp(await headers())}`;
  if (await isRateLimited(ipKey, BUSCAR_PEDIDO_RULE)) {
    return { orders: null, error: "Demasiados intentos — esperá un toque y volvé a probar." };
  }
  await recordFailure(ipKey);

  const parsed = searchSchema.safeParse({
    phone: formData.get("phone"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { orders: null, error: parsed.error.issues[0]?.message ?? "Revisá los datos." };

  const tenant = await getCurrentTenant();
  if (!tenant) return { orders: null, error: "Tienda no encontrada." };

  const orders = await prisma.order.findMany({
    where: {
      tenantId: tenant.id,
      userId: null,
      deliveryPhone: parsed.data.phone,
      guestEmail: { equals: parsed.data.email, mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, createdAt: true, status: true, total: true },
  });

  if (orders.length === 0) {
    return { orders: null, error: "No encontramos ningún pedido con esos datos. Revisá que estén escritos igual que en el checkout." };
  }

  return {
    orders: orders.map((o) => ({ id: o.id, createdAt: o.createdAt.toISOString(), status: o.status, total: Number(o.total) })),
    error: "",
  };
}
