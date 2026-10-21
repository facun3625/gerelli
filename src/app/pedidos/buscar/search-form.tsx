"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/order-status";
import { findGuestOrders, type FindGuestOrdersState } from "./actions";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

export function SearchForm() {
  const [state, formAction, pending] = useActionState(findGuestOrders, { orders: null, error: "" } as FindGuestOrdersState);

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" name="phone" required placeholder="El que usaste al pedir" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required placeholder="El que usaste al pedir" />
        </div>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <Button type="submit" disabled={pending} className="mt-1">
          {pending ? "Buscando…" : "Buscar mi pedido"}
        </Button>
      </form>

      {state.orders && (
        <div className="flex flex-col gap-2">
          {state.orders.map((o) => (
            <Link
              key={o.id}
              href={`/pedidos/${o.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm hover:bg-accent"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Pedido del {dateFormatter.format(new Date(o.createdAt))}</span>
                <span className="text-sm text-muted-foreground">{formatPrice(o.total)}</span>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ORDER_STATUS_COLORS[o.status as keyof typeof ORDER_STATUS_COLORS]}`}>
                {ORDER_STATUS_LABELS[o.status as keyof typeof ORDER_STATUS_LABELS]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
