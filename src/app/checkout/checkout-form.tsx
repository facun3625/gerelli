"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { cn } from "@/lib/utils";
import type { FulfillmentType, PaymentMethodType } from "@/generated/prisma/client";
import type { TransferConfig } from "@/app/admin/pagos/page";
import { FULFILLMENT_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/order-status";
import { checkDeliveryDate, getPickupSlotsForCheckout, placeOrder } from "./actions";

type Profile = {
  name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
};

type PickupSlot = { id: string; label: string };

// Clave estable por intento de compra: sobrevive a que el comprador recargue
// el checkout, así el servidor reconoce el reintento y devuelve el pedido que
// ya creó en vez de duplicarlo. Se descarta recién cuando el pedido entró.
const IDEMPOTENCY_KEY_STORAGE = "urbi:checkout-idempotency-key";

function randomKey() {
  try {
    return crypto.randomUUID();
  } catch {
    // randomUUID no existe en webviews viejos o fuera de contexto seguro.
    return `${Date.now()}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  }
}

function getCheckoutIdempotencyKey() {
  try {
    const stored = sessionStorage.getItem(IDEMPOTENCY_KEY_STORAGE);
    if (stored) return stored;
    const key = randomKey();
    sessionStorage.setItem(IDEMPOTENCY_KEY_STORAGE, key);
    return key;
  } catch {
    return randomKey();
  }
}

function clearCheckoutIdempotencyKey() {
  try {
    sessionStorage.removeItem(IDEMPOTENCY_KEY_STORAGE);
  } catch {
    // sessionStorage bloqueado (modo privado): no pasa nada, la clave muere con la pestaña.
  }
}

function StepCard({
  stepNumber,
  title,
  active,
  reached,
  summary,
  onEdit,
  children,
}: {
  stepNumber: number;
  title: string;
  active: boolean;
  reached: boolean;
  summary?: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  const clickable = reached && !active;

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition-colors",
        active ? "border-primary" : "border-border",
        clickable && "cursor-pointer hover:border-primary/50 hover:bg-accent/40",
      )}
      onClick={clickable ? onEdit : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => (e.key === "Enter" || e.key === " ") && onEdit()
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
              clickable || active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
            )}
          >
            {clickable ? <CheckIcon className="size-3.5" /> : stepNumber}
          </span>
          <span className="font-medium">{title}</span>
        </div>
        {clickable && <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />}
      </div>

      {clickable && summary && (
        <p className="mt-1 pl-9 text-sm text-muted-foreground">{summary}</p>
      )}

      <div className={cn("flex-col gap-4", active ? "mt-4 flex" : "hidden")}>{children}</div>
    </div>
  );
}

type PaymentMethodOption = {
  type: PaymentMethodType;
  label: string | null;
  minPreviousOrders: number | null;
};

export function CheckoutForm({
  paymentMethods,
  previousOrderCount,
  transferConfig,
  availableFulfillmentTypes,
  deliveryFee,
  storeAddress,
  profile,
}: {
  paymentMethods: PaymentMethodOption[];
  previousOrderCount: number;
  transferConfig: TransferConfig | null;
  availableFulfillmentTypes: FulfillmentType[];
  deliveryFee: number;
  storeAddress: string | null;
  profile: Profile | null;
}) {
  const { cart, itemCount, subtotal, clearCart } = useCart();
  const [step, setStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);

  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType | null>(null);
  const [pickupSlots, setPickupSlots] = useState<PickupSlot[]>([]);
  const [pickupSlotId, setPickupSlotId] = useState<string | null>(null);

  const [method, setMethod] = useState<PaymentMethodType | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);
  const [proofFileName, setProofFileName] = useState<string | null>(null);

  const [pending, startTransition] = useTransition();
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);
  const [dateProblem, setDateProblem] = useState<string | null>(null);

  useEffect(() => {
    if (fulfillmentType !== "PICKUP" || !cart.deliveryDateId) return;
    let cancelled = false;
    getPickupSlotsForCheckout(cart.deliveryDateId).then((slots) => {
      if (cancelled) return;
      setPickupSlots(slots);
      setPickupSlotId(slots.length === 1 ? slots[0].id : null);
    });
    return () => {
      cancelled = true;
    };
  }, [fulfillmentType, cart.deliveryDateId]);

  // Chequeo al abrir el checkout, no al confirmar: si la fecha del carrito ya
  // venció queremos decírselo antes de que cargue dirección y teléfono.
  useEffect(() => {
    if (!cart.deliveryDateId || itemCount === 0) return;
    let cancelled = false;
    checkDeliveryDate(cart.deliveryDateId).then((result) => {
      if (cancelled) return;
      setDateProblem("error" in result ? result.error : null);
    });
    return () => {
      cancelled = true;
    };
  }, [cart.deliveryDateId, itemCount]);

  if (confirmedOrderId) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          <CheckIcon className="size-8" strokeWidth={3} />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold text-emerald-700 dark:text-emerald-400">
            ¡Pedido confirmado!
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Ya lo recibimos y te mandamos el detalle por email. No hace falta que vuelvas a
            confirmarlo.
          </p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-2">
          <Button render={<Link href={`/pedidos/${confirmedOrderId}`} />} size="lg">
            Ver mi pedido
          </Button>
          <Button render={<Link href="/" />} variant="outline">
            Volver al catálogo
          </Button>
        </div>
      </main>
    );
  }

  if (itemCount === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">Tu carrito está vacío</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Agregá productos al pedido antes de pasar por caja.
        </p>
        <Button render={<Link href="/" />} variant="outline">
          Ver catálogo
        </Button>
      </main>
    );
  }

  if (dateProblem) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">{dateProblem}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Armaste el pedido para una fecha que ya no está tomando pedidos. Vaciá el carrito y
          elegí una fecha nueva desde el catálogo.
        </p>
        <Button size="lg" render={<Link href="/" />} onClick={clearCart}>
          Vaciar carrito y elegir otra fecha
        </Button>
      </main>
    );
  }

  if (paymentMethods.length === 0 || availableFulfillmentTypes.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">El checkout no está disponible todavía</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Todavía no configuramos medios de pago o de entrega. Contactanos directamente para
          coordinar tu pedido.
        </p>
        <Button render={<Link href="/carrito" />} variant="outline">
          Volver al pedido
        </Button>
      </main>
    );
  }

  function goToStep2() {
    if (!fulfillmentType) {
      toast.error("Elegí un tipo de entrega");
      return;
    }
    if (fulfillmentType === "PICKUP" && pickupSlots.length > 0 && !pickupSlotId) {
      toast.error("Elegí un horario de retiro");
      return;
    }
    setStep(2);
    setMaxStepReached((m) => Math.max(m, 2));
  }

  function goToStep3() {
    if (!method) {
      toast.error("Elegí un medio de pago");
      return;
    }
    if (method === "TRANSFER" && !proofFileName) {
      toast.error("Subí el comprobante de la transferencia");
      return;
    }
    setStep(3);
    setMaxStepReached((m) => Math.max(m, 3));
  }

  const step1Summary = fulfillmentType
    ? [
        FULFILLMENT_TYPE_LABELS[fulfillmentType],
        fulfillmentType === "PICKUP" && pickupSlotId
          ? pickupSlots.find((s) => s.id === pickupSlotId)?.label
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  const step2Summary = method ? PAYMENT_METHOD_LABELS[method] ?? method : "";

  const appliedDeliveryFee = fulfillmentType === "DELIVERY" ? deliveryFee : 0;
  const total = Math.max(0, subtotal + appliedDeliveryFee);

  function handleSubmit(formData: FormData) {
    if (!method || !fulfillmentType) return;
    formData.set("idempotencyKey", getCheckoutIdempotencyKey());
    formData.set("deliveryDateId", cart.deliveryDateId ?? "");
    formData.set("paymentMethod", method);
    formData.set("fulfillmentType", fulfillmentType);
    if (pickupSlotId) formData.set("pickupSlotId", pickupSlotId);
    formData.set(
      "items",
      JSON.stringify(
        cart.items.map((i) => ({ productVariantId: i.productVariantId, quantity: i.quantity })),
      ),
    );

    startTransition(async () => {
      try {
        const result = await placeOrder(formData);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        const { orderId, paymentUrl } = result;
        clearCheckoutIdempotencyKey();
        clearCart();
        if (paymentUrl) {
          // MercadoPago: el pedido queda pendiente hasta que pague. Salimos
          // del sitio, así que window.location y no router.push.
          window.location.href = paymentUrl;
          return;
        }
        // La confirmación es estado local y se pinta al instante. Antes esto
        // era un router.push y nada más: dentro del webview de Instagram esa
        // navegación puede tardar o morirse, y el comprador se quedaba mirando
        // el checkout con el carrito ya vacío sin saber si el pedido entró.
        setConfirmedOrderId(orderId);
        toast.success("¡Listo! Tu pedido quedó confirmado");
      } catch {
        // Acá ya no llegan los errores del pedido (vuelven como valor): esto es
        // que la respuesta nunca llegó — se cortó la conexión o el webview la
        // mató. El pedido puede haber entrado igual, y si entró el reintento
        // devuelve ese mismo en vez de duplicarlo.
        toast.error("Se cortó la conexión al confirmar. Revisá tus pedidos antes de volver a intentar.");
      }
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 pb-20 lg:flex-row lg:items-start lg:pb-6">
      <div className="flex flex-col gap-4 lg:sticky lg:top-4 lg:w-80 lg:shrink-0">
        <h1 className="text-xl font-semibold">Confirmar pedido</h1>
        <div className="flex flex-col gap-2 rounded-2xl border p-4">
          {cart.items.map((item) => (
            <div key={item.productVariantId} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">
                {item.quantity}× {item.productName}
              </span>
              <span className="shrink-0 font-medium">{formatPrice(item.unitPrice * item.quantity)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t pt-2 text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {appliedDeliveryFee > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Envío</span>
              <span>{formatPrice(appliedDeliveryFee)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      <form action={handleSubmit} className="flex flex-1 flex-col gap-4">
        <StepCard
          stepNumber={1}
          title="Tipo de entrega"
          active={step === 1}
          reached={maxStepReached >= 1}
          summary={step1Summary}
          onEdit={() => setStep(1)}
        >
          <div className="flex flex-col gap-2">
            {availableFulfillmentTypes.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFulfillmentType(t)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left font-medium transition-colors",
                  fulfillmentType === t ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}
              >
                {FULFILLMENT_TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {fulfillmentType === "PICKUP" && (
            <div className="flex flex-col gap-3 rounded-xl border bg-muted/50 p-4 text-sm">
              <div className="flex flex-col gap-1">
                <span className="font-medium">Retirás en</span>
                <span className="text-muted-foreground">
                  {storeAddress ?? "Consultá la dirección del local con la tienda."}
                </span>
              </div>

              {pickupSlots.length === 1 && (
                <div className="flex flex-col gap-1">
                  <span className="font-medium">Horario de retiro</span>
                  <span className="text-muted-foreground">{pickupSlots[0].label}</span>
                </div>
              )}

              {pickupSlots.length > 1 && (
                <div className="flex flex-col gap-2">
                  <span className="font-medium">Elegí un horario de retiro</span>
                  <div className="flex flex-col gap-2">
                    {pickupSlots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setPickupSlotId(slot.id)}
                        className={cn(
                          "rounded-xl border px-4 py-2.5 text-left transition-colors",
                          pickupSlotId === slot.id ? "border-primary bg-primary text-primary-foreground" : "border-border",
                        )}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Button type="button" onClick={goToStep2} className="bg-foreground text-background hover:bg-foreground/80">
            Continuar
          </Button>
        </StepCard>

        <StepCard
          stepNumber={2}
          title="Medio de pago"
          active={step === 2}
          reached={maxStepReached >= 2}
          summary={step2Summary}
          onEdit={() => setStep(2)}
        >
          <div className="flex flex-col gap-2">
            {paymentMethods.map((m) => {
              const locked = m.minPreviousOrders != null && previousOrderCount < m.minPreviousOrders;
              return (
                <div key={m.type} className="flex flex-col gap-1">
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => setMethod(m.type)}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                      method === m.type ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}
                  >
                    {m.label ?? PAYMENT_METHOD_LABELS[m.type] ?? m.type}
                  </button>
                  {locked && (
                    <p className="pl-1 text-xs text-muted-foreground">
                      Disponible después de tu primera compra — probá con otro medio de pago.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {method === "TRANSFER" && (
            <div className="flex flex-col gap-3 rounded-xl border bg-muted/50 p-4 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
                <span className="font-medium">Transferí</span>
                <span className="text-base font-semibold">{formatPrice(total)}</span>
              </div>
              {appliedDeliveryFee > 0 && (
                <p className="text-xs text-muted-foreground">
                  Incluye {formatPrice(appliedDeliveryFee)} de envío — el total ya lo tiene en cuenta.
                </p>
              )}
              <p className="font-medium">Datos para transferir</p>
              <div className="flex flex-col gap-1 text-muted-foreground">
                {transferConfig?.bankName && <span>Banco: {transferConfig.bankName}</span>}
                {transferConfig?.accountHolder && <span>Titular: {transferConfig.accountHolder}</span>}
                {transferConfig?.cbuOrAlias && <span>CBU/Alias: {transferConfig.cbuOrAlias}</span>}
                {!transferConfig?.bankName && !transferConfig?.accountHolder && !transferConfig?.cbuOrAlias && (
                  <span>Consultá los datos bancarios con la tienda.</span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label>Comprobante de pago</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => proofInputRef.current?.click()}
                  >
                    {proofFileName ? "Cambiar archivo" : "Elegir archivo"}
                  </Button>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {proofFileName ?? "Ningún archivo seleccionado"}
                  </span>
                </div>
                <input
                  ref={proofInputRef}
                  id="proof"
                  name="proof"
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setProofFileName(e.target.files?.[0]?.name ?? null)}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Atrás
            </Button>
            <Button
              type="button"
              onClick={goToStep3}
              className="flex-1 bg-foreground text-background hover:bg-foreground/80"
            >
              Continuar
            </Button>
          </div>
        </StepCard>

        <StepCard
          stepNumber={3}
          title="Datos de contacto"
          active={step === 3}
          reached={maxStepReached >= 3}
          onEdit={() => setStep(3)}
        >
          {!profile && (
            <p className="text-sm text-muted-foreground">
              No hace falta crear una cuenta para pedir.{" "}
              <Link
                href={`/login?callbackUrl=/checkout`}
                className="font-medium text-primary underline"
              >
                ¿Ya tenés cuenta? Iniciá sesión
              </Link>
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="guestName">Nombre</Label>
              <Input
                id="guestName"
                name="guestName"
                required={!profile}
                disabled={!!profile}
                defaultValue={profile?.name ?? ""}
                placeholder="Nombre y apellido"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="guestEmail">Email de contacto</Label>
              <Input
                id="guestEmail"
                name="guestEmail"
                type="email"
                required={!profile}
                disabled={!!profile}
                defaultValue={profile?.email ?? ""}
                placeholder="tu@email.com"
              />
            </div>

            <div className={cn("flex flex-col gap-2", fulfillmentType !== "DELIVERY" && "sm:col-span-2")}>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                required
                defaultValue={profile?.phone ?? ""}
                placeholder="Ej: 3425 340000"
              />
            </div>

            {fulfillmentType === "DELIVERY" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="address">Dirección de entrega</Label>
                <Textarea
                  id="address"
                  name="address"
                  required
                  rows={2}
                  defaultValue={profile?.address ?? ""}
                  placeholder="Calle, número, piso/depto, referencias"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              Atrás
            </Button>
            <Button type="submit" size="lg" disabled={pending} className="flex-1">
              {pending
                ? "Confirmando…"
                : method === "MERCADOPAGO"
                  ? `Pagar con MercadoPago · ${formatPrice(total)}`
                  : `Confirmar pedido · ${formatPrice(total)}`}
            </Button>
          </div>
        </StepCard>
      </form>

      {/* En mobile el resumen de arriba no queda fijo (se apila, no es
          sticky) — esta barra lo compensa: el total siempre visible,
          incluso con el teclado abierto completando datos de contacto. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between border-t bg-background px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] lg:hidden">
        <div className="text-sm">
          <span className="text-muted-foreground">Total</span>
          {appliedDeliveryFee > 0 && <span className="ml-1.5 text-xs text-muted-foreground">(incluye envío)</span>}
        </div>
        <span className="text-lg font-semibold">{formatPrice(total)}</span>
      </div>
    </main>
  );
}
