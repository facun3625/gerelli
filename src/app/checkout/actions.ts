"use server";

import { after } from "next/server";
import { z } from "zod";

import { ActionError, toUserError } from "@/lib/action-error";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { getPickupSlotsForDate } from "@/lib/pickup-slots";
import { saveUploadedFile } from "@/lib/storage";
import { resolveWeeklyAvailability } from "@/lib/availability";
import { logGroupStockMovement } from "@/lib/stock-movements";
import { getTenantMercadoPagoCredentials } from "@/lib/mercadopago-config";
import { createPreference } from "@/lib/mercadopago";
import { canTenantReceiveOrders } from "@/lib/billing-status";
import { getStoreSettings, getOrderEmailMessage } from "@/lib/settings";
import { orderConfirmationEmail } from "@/lib/email-templates";
import { sendMail } from "@/lib/mailer";
import { toWhatsAppLink, toInstagramLink } from "@/lib/social-links";
import { FULFILLMENT_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/order-status";

const deliveryDateFormatter = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "2-digit", month: "long" });
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "localhost:3010";

const itemSchema = z.object({
  productVariantId: z.string(),
  quantity: z.number().int().positive(),
});

const placeOrderSchema = z
  .object({
    deliveryDateId: z.string().min(1),
    fulfillmentType: z.enum(["DELIVERY", "PICKUP"]),
    paymentMethod: z.enum(["CASH_ON_DELIVERY", "TRANSFER", "MERCADOPAGO"]),
    items: z.array(itemSchema).min(1, "El carrito está vacío"),
    phone: z.string().trim().min(1, "Ingresá un teléfono de contacto"),
    address: z.string().trim().optional(),
    pickupSlotId: z.string().optional(),
    guestName: z.string().trim().optional(),
    guestEmail: z.string().trim().email("Ingresá un email válido").optional().or(z.literal("")),
  })
  .refine((data) => data.fulfillmentType !== "DELIVERY" || !!data.address, {
    message: "Ingresá la dirección de entrega",
    path: ["address"],
  });

export async function getPickupSlotsForCheckout(deliveryDateId: string) {
  const tenant = await getCurrentTenant();
  if (!tenant) return [];
  if (!canTenantReceiveOrders(tenant)) return [];

  const deliveryDate = await prisma.deliveryDate.findUnique({
    where: { id: deliveryDateId, tenantId: tenant.id },
  });
  if (!deliveryDate) return [];

  return getPickupSlotsForDate(tenant.id, deliveryDateId);
}

async function createMercadoPagoPaymentUrl(
  tenant: { id: string; subdomain: string },
  order: { id: string; total: unknown },
  payerEmail: string | null,
) {
  const credentials = await getTenantMercadoPagoCredentials(tenant.id);
  if (!credentials) {
    throw new ActionError("MercadoPago no está configurado en esta tienda. Elegí otro medio de pago.");
  }

  const protocol = ROOT_DOMAIN.startsWith("localhost") ? "http" : "https";
  const base = `${protocol}://${tenant.subdomain}.${ROOT_DOMAIN}`;

  const preference = await createPreference(credentials.accessToken, {
    // Un solo ítem con el total: el detalle real ya está en el pedido, y así
    // el importe que ve en MP coincide exacto con el total (con envío y
    // descuentos ya aplicados) en vez de tener que reconstruirlo.
    items: [{ title: `Pedido en ${tenant.subdomain}`, quantity: 1, unitPrice: Number(order.total) }],
    externalReference: order.id,
    notificationUrl: `${base}/api/webhooks/mercadopago`,
    backUrl: `${base}/pedidos/${order.id}`,
    payerEmail,
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { mpPreferenceId: preference.id },
  });

  return preference.initPoint;
}

// Respuesta para un reintento de un checkout que ya creó su pedido. Si quedó
// esperando pago en MP le damos un link nuevo (el anterior se perdió junto con
// la respuesta que nunca llegó); si ya está pagado o es otro medio, lo
// mandamos derecho al pedido.
async function resumeExistingOrder(
  tenant: { id: string; subdomain: string },
  order: { id: string; total: unknown; paymentMethod: string; status: string; guestEmail: string | null },
  sessionEmail: string | null,
) {
  if (order.paymentMethod !== "MERCADOPAGO" || order.status !== "PENDING_PAYMENT") {
    return { orderId: order.id, paymentUrl: null };
  }
  const paymentUrl = await createMercadoPagoPaymentUrl(
    tenant,
    order,
    sessionEmail ?? order.guestEmail,
  );
  return { orderId: order.id, paymentUrl };
}

function isDuplicateKeyError(err: unknown) {
  return typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
}

// Todo lo que tiene que cumplirse para poder pedir en una fecha. Vive en un
// solo lugar porque lo consultan dos momentos distintos: al confirmar el
// pedido y al abrir el checkout — y si se separan, el checkout te deja
// avanzar con una fecha que después el confirmar rechaza.
async function assertDeliveryDateUsable(
  tenant: { id: string; orderingMode: string },
  deliveryDateId: string,
) {
  const deliveryDate = await prisma.deliveryDate.findUnique({
    where: { id: deliveryDateId, tenantId: tenant.id },
  });
  if (!deliveryDate || deliveryDate.status !== "OPEN") {
    throw new ActionError("Esta fecha de entrega ya no está disponible");
  }
  if (deliveryDate.orderOpenAt && deliveryDate.orderOpenAt > new Date()) {
    throw new ActionError("Todavía no empezamos a tomar pedidos para esta fecha");
  }
  if (deliveryDate.cutoffAt && deliveryDate.cutoffAt < new Date()) {
    throw new ActionError("Se venció el horario de corte para esta fecha");
  }
  // En modo turno, la franja activa (ej. "20:00 a 23:00") la determina la
  // hora del pedido, no el comprador — se resuelve acá una sola vez para
  // no volver a preguntarle a resolveWeeklyAvailability más abajo, cuando
  // el delivery necesita saber a qué turno quedó asignado.
  let activeShiftLabel: string | null = null;
  if (tenant.orderingMode === "WEEKLY_HOURS") {
    const availability = await resolveWeeklyAvailability(tenant.id);
    if (!availability.open || availability.deliveryDateId !== deliveryDateId) {
      throw new ActionError("Ya no estamos tomando pedidos en este horario");
    }
    activeShiftLabel = availability.fulfillmentLabel;
  }
  if (deliveryDate.capacity != null) {
    const orderCount = await prisma.order.count({
      where: { deliveryDateId: deliveryDate.id, status: { not: "CANCELLED" } },
    });
    if (orderCount >= deliveryDate.capacity) {
      throw new ActionError("Esta fecha ya alcanzó el máximo de pedidos");
    }
  }
  return { deliveryDate, activeShiftLabel };
}

// El carrito vive en localStorage y puede apuntar a una fecha que venció
// mientras el comprador no estaba. El checkout pregunta al abrirse para
// avisarle ahí mismo, en vez de dejarlo llenar todo el formulario y que se
// entere recién al confirmar.
export async function checkDeliveryDate(deliveryDateId: string) {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant) throw new ActionError("Tienda no encontrada");
    await assertDeliveryDateUsable(tenant, deliveryDateId);
    return { ok: true as const };
  } catch (err) {
    return toUserError(err, "No pudimos verificar la fecha de entrega");
  }
}

export async function placeOrder(formData: FormData) {
  try {
    return await createOrder(formData);
  } catch (err) {
    return toUserError(err, "No pudimos confirmar tu pedido. Probá de nuevo en un momento.");
  }
}

async function createOrder(formData: FormData) {
  const session = await auth();

  const tenant = await getCurrentTenant();
  if (!tenant) throw new ActionError("Tienda no encontrada");
  if (!canTenantReceiveOrders(tenant)) {
    throw new ActionError("La tienda no está recibiendo pedidos hasta regularizar su suscripción");
  }
  if (session?.user && session.user.tenantId !== tenant.id) throw new ActionError("No autorizado");

  // Reintento del mismo checkout: el webview de Instagram corta la respuesta,
  // el comprador recarga y vuelve a confirmar. Devolvemos el pedido que ya se
  // creó en vez de duplicarlo. Va antes de validar a propósito — el pedido ya
  // existe, y revalidar stock o corte de horario acá daría un error falso.
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "").trim() || null;
  if (idempotencyKey) {
    const existing = await prisma.order.findFirst({
      where: { idempotencyKey, tenantId: tenant.id },
    });
    if (existing) return resumeExistingOrder(tenant, existing, session?.user?.email ?? null);
  }

  let items: unknown;
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    throw new ActionError("Carrito inválido");
  }

  const parsed = placeOrderSchema.parse({
    deliveryDateId: formData.get("deliveryDateId"),
    fulfillmentType: formData.get("fulfillmentType"),
    paymentMethod: formData.get("paymentMethod"),
    items,
    phone: formData.get("phone"),
    address: formData.get("address") || undefined,
    pickupSlotId: formData.get("pickupSlotId") || undefined,
    guestName: formData.get("guestName") || undefined,
    guestEmail: formData.get("guestEmail") || undefined,
  });

  if (!session?.user && (!parsed.guestName || !parsed.guestEmail)) {
    throw new ActionError("Ingresá tu nombre y email de contacto");
  }

  const [paymentConfig, fulfillmentConfig] = await Promise.all([
    prisma.paymentMethodConfig.findUnique({
      where: { tenantId_type: { tenantId: tenant.id, type: parsed.paymentMethod } },
    }),
    prisma.fulfillmentMethodConfig.findUnique({
      where: { tenantId_type: { tenantId: tenant.id, type: parsed.fulfillmentType } },
    }),
  ]);
  if (!paymentConfig?.enabled) throw new ActionError("Ese medio de pago no está disponible");
  if (!fulfillmentConfig?.enabled) throw new ActionError("Ese tipo de entrega no está disponible");

  if (parsed.paymentMethod === "CASH_ON_DELIVERY" && paymentConfig.minPreviousOrders != null) {
    const previousOrders = session?.user
      ? await prisma.order.count({
          where: { tenantId: tenant.id, userId: session.user.id, status: { not: "CANCELLED" } },
        })
      : 0;
    if (previousOrders < paymentConfig.minPreviousOrders) {
      throw new ActionError("Ese medio de pago no está disponible para tu cuenta todavía — probá con otro.");
    }
  }

  const { deliveryDate, activeShiftLabel } = await assertDeliveryDateUsable(tenant, parsed.deliveryDateId);

  const deliveryFee =
    parsed.fulfillmentType === "DELIVERY"
      ? Number((fulfillmentConfig.config as { fee?: number } | null)?.fee ?? 0)
      : 0;

  // Retiro: el comprador elige a qué hora pasa a buscarlo. Delivery en modo
  // turno: NO elige nada — el turno lo determina la hora en la que hace el
  // pedido (activeShiftLabel, resuelto arriba); si ahora está abierto
  // "20:00 a 23:00", el pedido entra en ese turno. En SCHEDULED_SALES
  // activeShiftLabel siempre es null: ahí la fecha ya alcanza.
  let pickupSlotId: string | null = null;
  let pickupSlotLabel: string | null = null;
  if (parsed.fulfillmentType === "PICKUP") {
    const validSlots = await getPickupSlotsForDate(tenant.id, parsed.deliveryDateId);
    if (validSlots.length > 0) {
      if (!parsed.pickupSlotId || !validSlots.some((s) => s.id === parsed.pickupSlotId)) {
        throw new ActionError("Elegí un horario de retiro");
      }
      pickupSlotId = parsed.pickupSlotId;
      pickupSlotLabel = validSlots.find((s) => s.id === parsed.pickupSlotId)?.label ?? null;
    }
  } else if (parsed.fulfillmentType === "DELIVERY" && activeShiftLabel) {
    const validSlots = await getPickupSlotsForDate(tenant.id, parsed.deliveryDateId);
    const activeSlot = validSlots.find((s) => s.label === activeShiftLabel);
    if (!activeSlot) throw new ActionError("Ya no estamos tomando pedidos en este horario");
    pickupSlotId = activeSlot.id;
    pickupSlotLabel = activeSlot.label;
  }

  let proofUrl: string | null = null;
  if (parsed.paymentMethod === "TRANSFER") {
    const file = formData.get("proof") as File | null;
    if (!file || file.size === 0) throw new ActionError("Subí el comprobante de la transferencia");
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      throw new ActionError("El comprobante debe ser una imagen o un PDF");
    }
    proofUrl = await saveUploadedFile(file, "payment-proofs");
  }

  // MERCADOPAGO arranca en PENDING_PAYMENT (todavía no pagó, lo estamos por
  // mandar a MP) y lo confirma el webhook. PAYMENT_REVIEW es otra cosa: es
  // "pagó y hay un comprobante esperando que alguien lo mire a mano".
  const status =
    parsed.paymentMethod === "CASH_ON_DELIVERY"
      ? "CONFIRMED"
      : parsed.paymentMethod === "MERCADOPAGO"
        ? "PENDING_PAYMENT"
        : "PAYMENT_REVIEW";

  const runOrderTransaction = () => prisma.$transaction(async (tx) => {
    // Revalidamos dentro de la misma transacción que crea el pedido. Así un
    // checkout que quedó abierto no puede confirmar una compra si la prueba
    // venció entre la carga de la página y el click final.
    const currentBilling = await tx.tenant.findUnique({
      where: { id: tenant.id },
      select: { status: true, billingStatus: true, trialEndsAt: true },
    });
    if (!currentBilling || !canTenantReceiveOrders(currentBilling)) {
      throw new ActionError("La tienda no está recibiendo pedidos hasta regularizar su suscripción");
    }

    if (deliveryDate.capacity != null) {
      const orderCount = await tx.order.count({
        where: { deliveryDateId: deliveryDate.id, status: { not: "CANCELLED" } },
      });
      if (orderCount >= deliveryDate.capacity) {
        throw new ActionError("Esta fecha ya alcanzó el máximo de pedidos");
      }
    }

    const variantIds = parsed.items.map((i) => i.productVariantId);
    const variants = await tx.productVariant.findMany({
      where: {
        id: { in: variantIds },
        active: true,
        product: { tenantId: tenant.id, active: true, category: { active: true } },
      },
      include: {
        product: true,
        stockGroup: { include: { stock: { where: { deliveryDateId: parsed.deliveryDateId } } } },
      },
    });

    if (variants.length !== variantIds.length) {
      throw new ActionError("Alguno de los productos ya no está disponible");
    }
    if (variants.some((v) => v.product.contactToBuy)) {
      throw new ActionError("Alguno de los productos es a consulta — coordinalo por WhatsApp, no se puede pedir online");
    }
    if (tenant.orderingMode === "WEEKLY_HOURS" && variants.some((v) => v.product.soldOutToday)) {
      throw new ActionError("Alguno de los productos se marcó como agotado hoy");
    }

    let subtotal = 0;
    const orderItemsData = parsed.items.map((item) => {
      const variant = variants.find((v) => v.id === item.productVariantId)!;
      const unitPrice = Number(variant.price);
      subtotal += unitPrice * item.quantity;
      return { productVariantId: variant.id, quantity: item.quantity, unitPrice };
    });

    // El modo de stock de la fecha decide cómo se valida y descuenta: por
    // grupo (pozo compartido entre variantes) o sin límite (no se trackea
    // nada).
    const requestedByGroup = new Map<string, number>();

    if (deliveryDate.stockMode === "BY_GROUP") {
      for (const item of orderItemsData) {
        const variant = variants.find((v) => v.id === item.productVariantId)!;
        const groupId = variant.stockGroupId;
        requestedByGroup.set(groupId, (requestedByGroup.get(groupId) ?? 0) + item.quantity);
      }
      for (const [groupId, requested] of requestedByGroup) {
        const group = variants.find((v) => v.stockGroupId === groupId)!.stockGroup;
        const pool = group.stock[0];
        if (pool && pool.quantityAvailable != null) {
          const remaining = Math.max(0, pool.quantityAvailable - pool.quantitySold);
          if (remaining < requested) {
            throw new ActionError(
              remaining > 0
                ? `Solo quedan ${remaining} unidades disponibles de "${group.name}" (pediste ${requested}). Ajustá la cantidad en el carrito.`
                : `Se agotó el stock de "${group.name}". Sacalo del carrito para poder confirmar.`,
            );
          }
        }
      }
    }

    const total = Math.max(0, subtotal + deliveryFee);

    const created = await tx.order.create({
      data: {
        tenantId: tenant.id,
        userId: session?.user?.id ?? null,
        guestName: session?.user ? null : parsed.guestName,
        guestEmail: session?.user ? null : parsed.guestEmail,
        deliveryDateId: parsed.deliveryDateId,
        fulfillmentType: parsed.fulfillmentType,
        pickupSlotId,
        deliveryAddress: parsed.fulfillmentType === "DELIVERY" ? (parsed.address ?? null) : null,
        deliveryPhone: parsed.phone,
        status,
        paymentMethod: parsed.paymentMethod,
        subtotal,
        deliveryFee,
        total,
        idempotencyKey,
        items: { create: orderItemsData },
      },
    });

    // Guardamos el teléfono/dirección en el perfil para prellenar el próximo pedido
    // — solo aplica a cuentas logueadas, un invitado no tiene perfil.
    if (session?.user) {
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          phone: parsed.phone,
          ...(parsed.fulfillmentType === "DELIVERY" ? { address: parsed.address } : {}),
        },
      });
    }

    for (const [groupId, quantity] of requestedByGroup) {
      await tx.stockGroupStock.upsert({
        where: { stockGroupId_deliveryDateId: { stockGroupId: groupId, deliveryDateId: parsed.deliveryDateId } },
        update: { quantitySold: { increment: quantity } },
        create: {
          stockGroupId: groupId,
          deliveryDateId: parsed.deliveryDateId,
          quantityAvailable: null,
          quantitySold: quantity,
        },
      });
      await logGroupStockMovement(tx, {
        tenantId: tenant.id,
        deliveryDateId: parsed.deliveryDateId,
        stockGroupId: groupId,
        reason: "SALE",
        delta: -quantity,
        note: `Pedido ${created.id}`,
      });
    }

    if (proofUrl) {
      await tx.paymentProof.create({ data: { orderId: created.id, url: proofUrl } });
    }

    return created;
  });

  let order;
  try {
    order = await runOrderTransaction();
  } catch (err) {
    // Dos submits en paralelo con la misma clave: uno ganó la carrera y el
    // otro chocó contra el índice único. Devolvemos el que sí se creó.
    if (idempotencyKey && isDuplicateKeyError(err)) {
      const existing = await prisma.order.findFirst({
        where: { idempotencyKey, tenantId: tenant.id },
      });
      if (existing) return resumeExistingOrder(tenant, existing, session?.user?.email ?? null);
    }
    throw err;
  }

  // El mail sale DESPUÉS de contestarle al comprador. Antes iba
  // con await antes del return: el checkout quedaba esperando a un SMTP que
  // puede tardar segundos (nodemailer no tiene timeout acá), y dentro del
  // webview de Instagram esa demora alcanza para que mate la respuesta — el
  // pedido entraba igual pero el comprador se quedaba en "Confirmando…".
  after(async () => {
    // Mail de "recibimos tu pedido" con el link para revisar el estado
    // después (útil sobre todo para invitados: sin cuenta, esta es la única
    // forma de volver a encontrar su pedido si pierden la pestaña).
    const recipientEmail = session?.user?.email ?? (parsed.guestEmail || null);
    if (recipientEmail) {
      try {
        const [storeSettings, customMessage, orderWithItems] = await Promise.all([
          getStoreSettings(tenant.id),
          getOrderEmailMessage(tenant.id),
          prisma.order.findUniqueOrThrow({
            where: { id: order.id },
            include: { items: { include: { productVariant: { include: { product: true } } } } },
          }),
        ]);
        const protocol = ROOT_DOMAIN.startsWith("localhost") ? "http" : "https";
        const base = `${protocol}://${tenant.subdomain}.${ROOT_DOMAIN}`;
        await sendMail({
          tenantId: tenant.id,
          to: recipientEmail,
          subject: `Recibimos tu pedido — ${storeSettings.storeName}`,
          html: orderConfirmationEmail({
            storeName: storeSettings.storeName,
            logoUrl: storeSettings.logoUrl,
            customMessage,
            customerName: session?.user?.name ?? parsed.guestName ?? null,
            orderId: order.id,
            orderUrl: `${base}/pedidos/${order.id}`,
            items: orderWithItems.items.map((it) => ({
              name: it.productVariant.product.name,
              quantity: it.quantity,
              unitPrice: Number(it.unitPrice),
            })),
            subtotal: Number(order.subtotal),
            deliveryFee: Number(order.deliveryFee),
            total: Number(order.total),
            fulfillmentLabel: FULFILLMENT_TYPE_LABELS[order.fulfillmentType],
            deliveryDateLabel: capitalize(deliveryDateFormatter.format(deliveryDate.date)),
            deliveryAddress: order.deliveryAddress,
            pickupSlotLabel,
            pickupSlotHeading: order.fulfillmentType === "PICKUP" ? "Horario de retiro" : "Turno",
            phone: order.deliveryPhone,
            paymentMethodLabel: PAYMENT_METHOD_LABELS[order.paymentMethod],
            storeAddress: storeSettings.address,
            storePhone: storeSettings.phone,
            storeEmail: storeSettings.email,
            whatsappUrl: storeSettings.whatsapp ? toWhatsAppLink(storeSettings.whatsapp) : null,
            instagramUrl: storeSettings.instagram ? toInstagramLink(storeSettings.instagram) : null,
            appUrl: base,
          }),
          type: "ORDER_CONFIRMATION",
        });
      } catch (err) {
        console.error("No se pudo enviar el mail de confirmación de pedido", err);
      }
    }
  });

  if (parsed.paymentMethod !== "MERCADOPAGO") {
    return { orderId: order.id, paymentUrl: null };
  }

  // Recién acá, con el pedido ya creado y el total definitivo calculado
  // dentro de la transacción, le pedimos a MP el link de pago. Si esto
  // falla, el pedido queda en PENDING_PAYMENT y el comprador ve el error —
  // no lo dejamos con un pedido "confirmado" que nadie pagó.
  const paymentUrl = await createMercadoPagoPaymentUrl(
    tenant,
    order,
    session?.user?.email ?? parsed.guestEmail ?? null,
  );

  return { orderId: order.id, paymentUrl };
}
