import { notFound } from "next/navigation";

import { getCurrentTenant } from "@/lib/tenant";
import { StoreHero } from "@/components/catalog/store-hero";
import { StoreFooter } from "@/components/catalog/store-footer";
import { SearchForm } from "./search-form";

// Página pública, sin login — para quien compró como invitado y perdió el
// link de confirmación de su pedido (o el mail nunca le llegó).
export default async function BuscarPedidoPage() {
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();

  return (
    <div className="public-inner-page public-form-page flex flex-1 flex-col">
      <StoreHero />
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col bg-background">
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold">Buscar mi pedido</h1>
            <p className="text-sm text-muted-foreground">
              Si pediste sin crear una cuenta, buscalo acá con el teléfono y el
              email que usaste al pedir.
            </p>
          </div>
          <SearchForm />
        </main>
      </div>
      <StoreFooter />
    </div>
  );
}
