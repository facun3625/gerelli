import { prisma } from "@/lib/prisma";
import { PromotionCodeForm } from "./promotion-code-form";
import { PromotionCodeRow } from "./promotion-code-row";

export default async function PromotionsPage() {
  const promotions = await prisma.promotionCode.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">Códigos promocionales</h1>
        <p className="text-sm text-muted-foreground">Definí cuánto dura cada bonificación, hasta cuándo puede canjearse y cuántas veces se puede usar.</p>
      </div>
      <PromotionCodeForm />
      <div className="flex flex-col gap-3">
        {promotions.map((promotion) => <PromotionCodeRow key={promotion.id} promotion={{ ...promotion, validUntil: promotion.validUntil?.toISOString() ?? null }} />)}
        {promotions.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Todavía no creaste códigos promocionales.</p>}
      </div>
    </div>
  );
}
