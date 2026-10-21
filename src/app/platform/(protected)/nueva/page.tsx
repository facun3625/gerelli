import { ActionForm } from "@/components/ui/action-form";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/format";
import { createTenant } from "./actions";

export default async function NewTenantPage() {
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { order: "asc" } });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Nueva inmobiliaria</h1>

      <ActionForm action={createTenant} className="flex max-w-md flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="subdomain">Subdominio</Label>
          <Input id="subdomain" name="subdomain" placeholder="mi-tienda" required />
          <p className="text-xs text-muted-foreground">
            Va a quedar accesible en <code>mi-tienda.localhost:3000</code>
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="storeName">Nombre del negocio</Label>
          <Input id="storeName" name="storeName" required />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="planId">Plan inicial (opcional)</Label>
          <select
            id="planId"
            name="planId"
            defaultValue=""
            className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            <option value="">Sin plan (no recibe pedidos hasta asignarle uno)</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {formatPrice(Number(p.priceMonthly))}/mes · {p.trialDays > 0 ? `${p.trialDays} días de prueba` : "sin prueba"}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2 border-t pt-4">
          <Label htmlFor="adminName">Nombre del admin</Label>
          <Input id="adminName" name="adminName" required />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="adminEmail">Email del admin</Label>
          <Input id="adminEmail" name="adminEmail" type="email" required />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="adminPassword">Contraseña</Label>
          <Input id="adminPassword" name="adminPassword" type="password" minLength={6} required />
        </div>

        <Button type="submit" className="mt-2">
          Crear inmobiliaria
        </Button>
      </ActionForm>
    </div>
  );
}
