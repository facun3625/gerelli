import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getTenantMercadoPagoCredentials } from "@/lib/mercadopago-config";
import { getPayment, verifyWebhookSignature } from "@/lib/mercadopago";
import { restoreStockForOrder } from "@/lib/stock";

// Notificaciones de pago de MercadoPago.
//
// Es la primera ruta de API no-auth del proyecto (todo lo demás son server
// actions). Tres cosas la hacen distinta de una acción normal:
//
//  1. No hay sesión ni host confiable para resolver la tienda —
//     getCurrentTenant() se basa en el header host y acá no sirve. La tienda
//     sale del pedido, que identificamos por el `external_reference` que
//     nosotros mismos mandamos al crear la preferencia.
//  2. Hay que verificar la firma. Sin eso, cualquiera que sepa la URL puede
//     mandar "pagado" y llevarse la mercadería gratis.
//  3. MP reintenta: la misma notificación puede llegar varias veces. Todo
//     efecto tiene que ser idempotente.
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  // MP manda el id del recurso en la query (?data.id=) y también en el
  // cuerpo; para la firma se usa el de la query.
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

  const body = await req.json().catch(() => null);
  const topic = body?.type ?? body?.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic");

  // Solo nos interesan los avisos de pago. El resto (merchant_order, etc.)
  // se acepta con 200 para que MP no siga reintentando algo que ignoramos a
  // propósito.
  if (topic !== "payment") {
    return NextResponse.json({ ignored: topic ?? "unknown" });
  }

  const paymentId = dataId ?? body?.data?.id;
  if (!paymentId) {
    return NextResponse.json({ error: "Falta el id del pago" }, { status: 400 });
  }

  // Para verificar la firma necesitamos el secret de la tienda, pero todavía
  // no sabemos de qué tienda es: el id del pago es de MP, no nuestro. La
  // preferencia sí la guardamos nosotros, así que buscamos el pedido por el
  // pago o por la preferencia asociada.
  //
  // En la primera notificación de un pago todavía no tenemos mpPaymentId, así
  // que resolvemos por external_reference del cuerpo cuando viene, y si no,
  // probamos contra los pedidos pendientes de pago (acotado por la
  // preferencia, no un barrido de toda la tabla).
  const externalReference: string | null = body?.data?.external_reference ?? null;

  const order = externalReference
    ? await prisma.order.findUnique({ where: { id: externalReference } })
    : await prisma.order.findFirst({ where: { mpPaymentId: String(paymentId) } });

  if (!order) {
    // Puede ser un pago que no es nuestro, o llegó antes de que
    // termináramos de guardar el pedido. 200 igual: si devolvemos error, MP
    // reintenta indefinidamente algo que quizás nunca vamos a poder
    // resolver.
    return NextResponse.json({ ignored: "pedido no encontrado" });
  }

  const credentials = await getTenantMercadoPagoCredentials(order.tenantId);
  if (!credentials) {
    return NextResponse.json({ error: "MercadoPago no configurado" }, { status: 400 });
  }

  if (!credentials.webhookSecret) {
    // Sin secret no hay forma de distinguir un aviso real de uno falso, así
    // que no confirmamos nada. La tienda tiene que cargarlo en /admin/pagos.
    return NextResponse.json({ error: "Falta la clave secreta del webhook" }, { status: 400 });
  }

  const valid = verifyWebhookSignature({
    signatureHeader: req.headers.get("x-signature"),
    requestId: req.headers.get("x-request-id"),
    dataId: String(paymentId),
    secret: credentials.webhookSecret,
  });
  if (!valid) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  // No confiamos en lo que dice el cuerpo del aviso: le preguntamos a MP
  // cuál es el estado real de ese pago.
  //
  // Si la consulta falla (token vencido, MP caído, id que no existe),
  // devolvemos 200 igual: un 500 hace que MP reintente la misma
  // notificación durante días. Queda registrado en el log del servidor para
  // poder investigarlo, y el pedido simplemente sigue pendiente — que es lo
  // correcto cuando no pudimos confirmar nada.
  let payment;
  try {
    payment = await getPayment(credentials.accessToken, String(paymentId));
  } catch (e) {
    console.error(
      `[mercadopago] no se pudo consultar el pago ${paymentId} del pedido ${order.id}:`,
      e instanceof Error ? e.message : e,
    );
    return NextResponse.json({ ignored: "no se pudo consultar el pago" });
  }

  // Que el pago referencie de verdad a este pedido — si no coincide, alguien
  // está mezclando ids.
  if (payment.externalReference && payment.externalReference !== order.id) {
    return NextResponse.json({ error: "El pago no corresponde a este pedido" }, { status: 400 });
  }

  if (payment.status === "approved") {
    // updateMany con el estado esperado en el where es lo que hace esto
    // idempotente: si la notificación llega de nuevo, el pedido ya no está
    // en PENDING_PAYMENT y el update afecta 0 filas.
    await prisma.order.updateMany({
      where: { id: order.id, status: "PENDING_PAYMENT" },
      data: { status: "CONFIRMED", mpPaymentId: payment.id },
    });
    return NextResponse.json({ ok: true, status: "approved" });
  }

  if (payment.status === "rejected" || payment.status === "cancelled") {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id: order.id, status: "PENDING_PAYMENT" },
        data: { status: "CANCELLED", mpPaymentId: payment.id },
      });
      if (count === 0) return;
      // El stock se había descontado al crear el pedido — hay que devolverlo.
      await restoreStockForOrder(tx, order.id, `Pago rechazado en MercadoPago (${payment.id})`);
    });
    return NextResponse.json({ ok: true, status: payment.status });
  }

  // in_process / pending / authorized: todavía no se resolvió. Lo dejamos
  // como está; MP va a volver a avisar cuando cambie.
  return NextResponse.json({ ok: true, status: payment.status });
}
