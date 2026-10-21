import { prisma } from "@/lib/prisma";
import { requireTenantAdmin } from "@/lib/require-admin";
import { toPublicConfig, type MercadoPagoStoredConfig } from "@/lib/mercadopago-config";
import { PaymentMethodRow } from "./payment-method-row";
import { TransferConfigForm } from "./transfer-config-form";
import { CashRestrictionForm } from "./cash-restriction-form";
import { MercadoPagoConfigForm } from "./mercadopago-config-form";

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "localhost:3010";

const METHOD_LABELS: Record<string, { title: string; description: string }> = {
  CASH_ON_DELIVERY: {
    title: "Efectivo",
    description: "El comprador paga al recibir el pedido.",
  },
  TRANSFER: {
    title: "Transferencia",
    description: "El comprador transfiere y sube un comprobante para que lo revises.",
  },
  MERCADOPAGO: {
    title: "MercadoPago",
    description: "El comprador paga con tarjeta o dinero en cuenta. El cobro va directo a tu cuenta de MercadoPago.",
  },
};

const METHOD_ORDER = ["CASH_ON_DELIVERY", "TRANSFER", "MERCADOPAGO"] as const;

export type TransferConfig = {
  bankName?: string;
  accountHolder?: string;
  cbuOrAlias?: string;
};

export default async function PaymentMethodsPage() {
  const { tenant } = await requireTenantAdmin();

  const rows = await prisma.paymentMethodConfig.findMany({ where: { tenantId: tenant.id } });
  const byType = new Map(rows.map((r) => [r.type, r]));

  const transferConfig = (byType.get("TRANSFER")?.config as TransferConfig | null) ?? {};

  // toPublicConfig descifra y enmascara — al navegador nunca le llega el
  // access token real, solo si está cargado y sus últimos 4 caracteres.
  const mpConfig = toPublicConfig((byType.get("MERCADOPAGO")?.config as MercadoPagoStoredConfig | null) ?? null);
  const protocol = ROOT_DOMAIN.startsWith("localhost") ? "http" : "https";
  const webhookUrl = `${protocol}://${tenant.subdomain}.${ROOT_DOMAIN}/api/webhooks/mercadopago`;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Medios de pago</h1>

      <div className="flex flex-col gap-3">
        {METHOD_ORDER.map((type) => {
          const row = byType.get(type);
          const { title: defaultTitle, description } = METHOD_LABELS[type];
          return (
            <div key={type} className="flex flex-col gap-3 rounded-lg border p-4">
              <PaymentMethodRow
                type={type}
                title={row?.label ?? defaultTitle}
                defaultTitle={defaultTitle}
                description={description}
                enabled={row?.enabled ?? false}
              />
              {type === "TRANSFER" && (row?.enabled ?? false) && (
                <TransferConfigForm key={JSON.stringify(transferConfig)} config={transferConfig} />
              )}
              {type === "MERCADOPAGO" && (row?.enabled ?? false) && (
                <MercadoPagoConfigForm key={JSON.stringify(mpConfig)} config={mpConfig} webhookUrl={webhookUrl} />
              )}
              {type === "CASH_ON_DELIVERY" && (row?.enabled ?? false) && (
                <CashRestrictionForm minPreviousOrders={row?.minPreviousOrders ?? null} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
