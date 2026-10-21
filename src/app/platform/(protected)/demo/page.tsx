import { prisma } from "@/lib/prisma";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function DemoVisitsPage() {
  const visits = await prisma.demoVisit.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">Visitas a la demo</h1>
        <p className="text-sm text-muted-foreground">
          Emails de quienes entraron a probar Urbi por /demo, más recientes primero.
        </p>
      </div>

      {visits.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Todavía nadie probó la demo.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Copia</th>
                <th className="px-4 py-2.5">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visits.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-2.5 font-medium">{v.email}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{v.subdomain}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{dateFormatter.format(v.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
