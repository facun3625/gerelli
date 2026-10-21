import { redirect } from "next/navigation";

import { getPostSaleContact } from "@/lib/require-post-sale-portal";
import { StoreHero } from "@/components/catalog/store-hero";
import { StoreFooter } from "@/components/catalog/store-footer";
import { CompleteDniForm } from "@/components/estate/post-sale-complete-dni-form";
import { linkPostSaleAccountByDni } from "./actions";

export default async function PostSaleCompleteRegistrationPage() {
  const { tenant, session, contact } = await getPostSaleContact();
  if (!tenant) return null;
  if (!session) redirect("/login?callbackUrl=/posventa");
  if (contact) redirect("/posventa");

  return (
    <div className="public-inner-page public-form-page flex flex-1 flex-col">
      <StoreHero />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Un último paso</h1>
        <p className="text-sm text-muted-foreground">
          Ingresá tu DNI para vincular tu cuenta con la unidad que te corresponde.
        </p>
        <CompleteDniForm action={linkPostSaleAccountByDni} />
      </main>
      <StoreFooter />
    </div>
  );
}
