import { BadgeCheckIcon, CircleAlertIcon, WebhookIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getPlatformBillingSettings, getPlatformCredentialSummary, getRootUrl } from "@/lib/platform-billing";
import { prisma } from "@/lib/prisma";
import { BillingSettingsForm } from "./billing-settings-form";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

export default async function PlatformBillingPage() {
  const [settings, events, paymentCount] = await Promise.all([
    getPlatformBillingSettings(),
    prisma.billingWebhookEvent.findMany({ orderBy: { receivedAt: "desc" }, take: 12 }),
    prisma.billingPayment.count({ where: { provider: "MERCADOPAGO" } }),
  ]);
  const credentials = await getPlatformCredentialSummary();
  const webhookUrl = `${getRootUrl()}/api/webhooks/mercadopago/subscriptions`;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">Facturación de Urbi</h1>
        <p className="text-sm text-muted-foreground">Suscripciones, renovaciones y estados de cobro de las tiendas.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border p-4">
          <p className="text-xs font-medium text-muted-foreground">Credencial</p>
          <div className="mt-2 flex items-center gap-2 font-semibold">
            {credentials.accessTokenMask ? <BadgeCheckIcon className="size-4 text-emerald-600" /> : <CircleAlertIcon className="size-4 text-amber-600" />}
            {credentials.accessTokenMask ?? "Falta configurar"}
          </div>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs font-medium text-muted-foreground">Ambiente detectado</p>
          <p className="mt-2 font-semibold">{credentials.environment === "test" ? "Pruebas" : credentials.environment === "production" ? "Producción" : "Sin credencial"}</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-xs font-medium text-muted-foreground">Cobros automáticos registrados</p>
          <p className="mt-2 font-semibold">{paymentCount}</p>
        </div>
      </div>

      <BillingSettingsForm enabled={settings.enabled} graceDays={settings.graceDays} hasToken={Boolean(credentials.accessTokenMask)} accessTokenMask={credentials.accessTokenMask} webhookSecretMask={credentials.webhookSecretMask} />

      <section className="rounded-xl border p-5">
        <div className="flex items-center gap-2">
          <WebhookIcon className="size-4 text-primary" />
          <h2 className="font-semibold">Webhook</h2>
        </div>
        <p className="mt-2 break-all rounded-lg bg-muted px-3 py-2 font-mono text-xs">{webhookUrl}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Configurá esta URL en Mercado Pago y activá: Suscripciones, Pagos autorizados de suscripciones y Pagos.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Clave de firma: {credentials.webhookSecretMask ?? "todavía no configurada"}.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Mantenimiento de vencimientos: <code>{`${getRootUrl()}/api/cron/billing`}</code> (protegido con CRON_SECRET).
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Últimos eventos</h2>
        <div className="overflow-hidden rounded-xl border">
          {events.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Todavía no llegaron notificaciones.</p>
          ) : events.map((event) => (
            <div key={event.id} className="flex flex-col gap-1 border-b px-4 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{event.topic}</p>
                <p className="truncate text-xs text-muted-foreground">{event.resourceId}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={event.status === "PROCESSED" ? "secondary" : event.status === "FAILED" ? "destructive" : "outline"}>{event.status}</Badge>
                <span className="text-xs text-muted-foreground">{dateFormatter.format(event.receivedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
