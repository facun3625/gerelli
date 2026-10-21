"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminTheme } from "@/components/admin/admin-theme-root";
import { formatPrice } from "@/lib/format";
import { BILLING_STATUS_LABELS } from "@/lib/billing-status";
import {
  setTenantPlan,
  setBillingStatus,
  registerPayment,
  setTrialEndsAt,
  setBillingNotes,
  applyPlanChangeRequest,
  dismissPlanChangeRequest,
} from "./actions";

type Plan = { id: string; name: string; priceMonthly: number };
type Payment = { id: string; amount: number; periodStart: string; periodEnd: string; paidAt: string; note: string | null };

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

export function BillingPanel({
  tenantId,
  plans,
  currentPlanId,
  billingStatus,
  trialEndsAt,
  nextBillingDate,
  billingNotes,
  payments,
  requestedPlan,
}: {
  tenantId: string;
  plans: Plan[];
  currentPlanId: string | null;
  billingStatus: string;
  trialEndsAt: string | null;
  nextBillingDate: string | null;
  billingNotes: string | null;
  payments: Payment[];
  requestedPlan: { id: string; name: string } | null;
}) {
  const { containerRef } = useAdminTheme();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState(billingNotes ?? "");
  const [trialDate, setTrialDate] = useState(trialEndsAt ? trialEndsAt.slice(0, 10) : "");
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  function handlePlanChange(value: string) {
    startTransition(async () => {
      try {
        const actionResult = await setTenantPlan(tenantId, value === "none" ? null : value);
        if ("error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        toast.success("Plan actualizado");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo cambiar el plan");
      }
    });
  }

  function handleStatusChange(value: string) {
    startTransition(async () => {
      try {
        const actionResult = await setBillingStatus(tenantId, value as never);
        if ("error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        toast.success("Estado de facturación actualizado");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo actualizar");
      }
    });
  }

  function handleTrialSave() {
    startTransition(async () => {
      try {
        const actionResult = await setTrialEndsAt(tenantId, trialDate);
        if ("error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        toast.success("Fin de trial actualizado");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });
  }

  function handleNotesSave() {
    startTransition(async () => {
      try {
        const actionResult = await setBillingNotes(tenantId, notes);
        if ("error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        toast.success("Notas guardadas");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });
  }

  function handleApplyRequest() {
    if (!requestedPlan) return;
    startTransition(async () => {
      try {
        const actionResult = await applyPlanChangeRequest(tenantId, requestedPlan.id);
        if ("error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        toast.success(`Plan cambiado a ${requestedPlan.name}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo aplicar");
      }
    });
  }

  function handleDismissRequest() {
    startTransition(async () => {
      try {
        const actionResult = await dismissPlanChangeRequest(tenantId);
        if ("error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        toast.success("Pedido descartado");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo descartar");
      }
    });
  }

  function handlePayment(formData: FormData) {
    startTransition(async () => {
      try {
        const actionResult = await registerPayment(tenantId, formData);
        if ("error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        toast.success("Pago registrado");
        setShowPaymentForm(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo registrar el pago");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Plan y facturación</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {requestedPlan && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-500/10 px-3 py-2.5 text-sm">
            <span className="text-amber-600 dark:text-amber-400">
              Pidió pasar a <strong>{requestedPlan.name}</strong>
            </span>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={handleApplyRequest} disabled={pending}>
                Aplicar
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={handleDismissRequest} disabled={pending}>
                Descartar
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Plan</Label>
            <Select
              items={[{ value: "none", label: "Sin plan" }, ...plans.map((p) => ({ value: p.id, label: `${p.name} · ${formatPrice(p.priceMonthly)}/mes` }))]}
              value={currentPlanId ?? "none"}
              onValueChange={(v) => handlePlanChange(String(v))}
              disabled={pending}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Elegí un plan" />
              </SelectTrigger>
              <SelectContent container={containerRef}>
                <SelectItem value="none">Sin plan</SelectItem>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · {formatPrice(p.priceMonthly)}/mes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Estado de facturación</Label>
            <Select
              items={Object.entries(BILLING_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
              value={billingStatus}
              onValueChange={(v) => handleStatusChange(String(v))}
              disabled={pending}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent container={containerRef}>
                {Object.entries(BILLING_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="trial-ends">Fin de trial</Label>
            <div className="flex gap-2">
              <Input id="trial-ends" type="date" value={trialDate} onChange={(e) => setTrialDate(e.target.value)} />
              <Button type="button" size="sm" variant="outline" onClick={handleTrialSave} disabled={pending}>
                Guardar
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Próximo vencimiento</Label>
            <p className="flex h-9 items-center text-sm text-muted-foreground">
              {nextBillingDate ? dateFormatter.format(new Date(nextBillingDate)) : "Sin registrar"}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t pt-4">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm font-medium">Historial de pagos</Label>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowPaymentForm((s) => !s)}>
              <PlusIcon className="size-4" />
              Registrar pago
            </Button>
          </div>

          {showPaymentForm && (
            <form action={handlePayment} className="flex flex-col gap-3 rounded-lg border p-3">
              {requestedPlan && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Al registrar este pago también se va a aplicar el plan pedido: <strong>{requestedPlan.name}</strong>.
                </p>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pay-amount" className="text-xs">Monto</Label>
                  <Input id="pay-amount" name="amount" type="number" min="0.01" step="0.01" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pay-start" className="text-xs">Desde</Label>
                  <Input id="pay-start" name="periodStart" type="date" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pay-end" className="text-xs">Hasta</Label>
                  <Input id="pay-end" name="periodEnd" type="date" required />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pay-note" className="text-xs">Nota (opcional)</Label>
                <Input id="pay-note" name="note" placeholder="Ej: transferencia, MP..." />
              </div>
              <Button type="submit" size="sm" disabled={pending} className="self-start">
                {pending ? "Guardando..." : "Confirmar pago"}
              </Button>
            </form>
          )}

          {payments.length === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">Todavía no se registró ningún pago.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium">{formatPrice(p.amount)}</span>
                    <span className="text-xs text-muted-foreground">
                      {dateFormatter.format(new Date(p.periodStart))} — {dateFormatter.format(new Date(p.periodEnd))}
                      {p.note && ` · ${p.note}`}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{dateFormatter.format(new Date(p.paidAt))}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t pt-4">
          <Label htmlFor="billing-notes" className="text-xs">Notas internas</Label>
          <Textarea id="billing-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Ej: acordó pagar el 5 de cada mes..." />
          <Button type="button" size="sm" variant="outline" onClick={handleNotesSave} disabled={pending} className="self-start">
            Guardar notas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
