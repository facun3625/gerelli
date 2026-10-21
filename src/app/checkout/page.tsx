import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { getStoreSettings } from "@/lib/settings";
import { StoreHero } from "@/components/catalog/store-hero";
import { StoreFooter } from "@/components/catalog/store-footer";
import { CheckoutForm } from "./checkout-form";
import type { TransferConfig } from "@/app/admin/pagos/page";
import type { DeliveryFeeConfig } from "@/app/admin/entrega/page";

export default async function CheckoutPage() {
  const session = await auth();

  const tenant = await getCurrentTenant();
  if (!tenant) notFound();

  const [
    paymentMethods,
    fulfillmentMethods,
    user,
    storeSettings,
    previousOrderCount,
  ] = await Promise.all([
    prisma.paymentMethodConfig.findMany({
      where: { tenantId: tenant.id, enabled: true },
    }),
    prisma.fulfillmentMethodConfig.findMany({
      where: { tenantId: tenant.id, enabled: true },
    }),
    session?.user
      ? prisma.user.findUniqueOrThrow({ where: { id: session.user.id } })
      : null,
    getStoreSettings(tenant.id),
    session?.user
      ? prisma.order.count({
          where: {
            tenantId: tenant.id,
            userId: session.user.id,
            status: { not: "CANCELLED" },
          },
        })
      : 0,
  ]);

  const transferConfig =
    (paymentMethods.find((m) => m.type === "TRANSFER")
      ?.config as TransferConfig | null) ?? null;
  const deliveryFee =
    (
      fulfillmentMethods.find((m) => m.type === "DELIVERY")
        ?.config as DeliveryFeeConfig | null
    )?.fee ?? 0;

  return (
    <div className="public-inner-page public-form-page flex flex-1 flex-col">
      <StoreHero />
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col bg-background">
        <CheckoutForm
          paymentMethods={paymentMethods.map((m) => ({
            type: m.type,
            label: m.label,
            minPreviousOrders: m.minPreviousOrders,
          }))}
          previousOrderCount={previousOrderCount}
          transferConfig={transferConfig}
          availableFulfillmentTypes={fulfillmentMethods.map((m) => m.type)}
          deliveryFee={deliveryFee}
          storeAddress={storeSettings.address}
          profile={
            user
              ? {
                  name: user.name,
                  email: user.email,
                  phone: user.phone,
                  address: user.address,
                }
              : null
          }
        />
      </div>
      <StoreFooter />
    </div>
  );
}
