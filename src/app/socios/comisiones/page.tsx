import { prisma } from "@/lib/prisma";
import { requireReseller } from "@/lib/require-reseller";
import { getResellerTierPercent } from "@/lib/reseller-commission";

export default async function SociosComisionesPage() {
  const { reseller } = await requireReseller();

  const [commissions, tierPercent] = await Promise.all([
    prisma.resellerCommission.findMany({
      where: { resellerId: reseller.id },
      orderBy: { createdAt: "desc" },
    }),
    getResellerTierPercent(reseller.id),
  ]);

  const paidTotal = commissions.filter((c) => c.status === "PAID").reduce((sum, c) => sum + Number(c.amount), 0);
  const pendingTotal = commissions.filter((c) => c.status === "PENDING").reduce((sum, c) => sum + Number(c.amount), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Comisiones</h1>
          <p className="text-sm text-muted-foreground">Historial completo.</p>
        </div>
        <span className="text-xs text-muted-foreground">Tu escalón actual: {tierPercent}%</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Cobrado</p>
          <p className="mt-1 text-2xl font-bold">${paidTotal.toLocaleString("es-AR")}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Pendiente</p>
          <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">${pendingTotal.toLocaleString("es-AR")}</p>
        </div>
      </div>

      <section className="rounded-2xl border bg-card p-6">
        {commissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay nada acá — esta sección se activa cuando se registre el primer cobro de una inmobiliaria que
            trajiste.
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {commissions.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p>{c.type === "ACTIVATION_BONUS" ? "Bono de activación" : `Comisión recurrente (${c.percentApplied}%)`}</p>
                  <p className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("es-AR")}</p>
                </div>
                <span className="flex items-center gap-2">
                  <span className="font-medium">${Number(c.amount).toLocaleString("es-AR")}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      c.status === "PAID" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {c.status === "PAID" ? "Pagada" : "Pendiente"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
