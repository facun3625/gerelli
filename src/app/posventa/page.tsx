import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRoundIcon, ArrowRightIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getPostSaleContact } from "@/lib/require-post-sale-portal";
import { StoreHero } from "@/components/catalog/store-hero";
import { StoreFooter } from "@/components/catalog/store-footer";

export default async function PostSalePortalPage() {
  const { tenant, session, contact } = await getPostSaleContact();
  if (!tenant) return null;

  if (!session) {
    return (
      <div className="public-inner-page public-account-page flex flex-1 flex-col">
        <StoreHero />
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center gap-4 px-4 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <KeyRoundIcon className="size-6 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold">Posventa</h1>
          <p className="text-sm text-muted-foreground">
            Ingresá con Google para ver tu unidad y hacer un reclamo de posventa.
          </p>
          <Link
            href="/login?callbackUrl=/posventa"
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Ingresar
          </Link>
        </main>
        <StoreFooter />
      </div>
    );
  }

  if (!contact) redirect("/posventa/completar-registro");

  const memberships = await prisma.postSaleUnitMember.findMany({
    where: { tenantId: tenant.id, contactId: contact.id },
    include: { unit: { include: { development: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="public-inner-page public-account-page flex flex-1 flex-col">
      <StoreHero />
      <main className="mx-auto w-full max-w-[1440px] flex-1 bg-background">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold sm:text-3xl">Posventa</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {contact.name ? `Hola, ${contact.name}.` : "Bienvenido."}
          </p>

          {memberships.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              Todavía no tenés ninguna unidad vinculada.
            </p>
          ) : (
            <div className="mt-8 flex flex-col gap-3">
              {memberships.map((m) => (
                <Link
                  key={m.id}
                  href={`/posventa/unidades/${m.unit.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-5 transition hover:border-primary/40"
                >
                  <div>
                    <p className="font-medium">{m.unit.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {m.unit.development.name} · {m.unit.development.address}
                    </p>
                  </div>
                  <ArrowRightIcon className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
