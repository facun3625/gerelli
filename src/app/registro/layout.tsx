import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getCurrentTenant } from "@/lib/tenant";
import { Toaster } from "@/components/ui/sonner";

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "localhost:3010";

export default async function RegistroLayout({ children }: { children: React.ReactNode }) {
  // /registro solo tiene sentido en el dominio raíz (urbi.com.ar) — si
  // alguien lo abre desde el subdominio de una inmobiliaria (por ej. quedó
  // navegando ahí después de crear una y probó entrar nuevo a /registro),
  // esta misma página igual renderiza, pero el login con Google que arranca
  // ahí queda atado al subdominio en vez de al dominio raíz — mismo lío de
  // cookies entre dominios que ya resolvimos para el login normal. Más
  // simple: nunca dejar que /registro corra dentro de un tenant.
  const tenant = await getCurrentTenant();
  if (tenant) {
    const pathname = (await headers()).get("x-pathname") ?? "/registro";
    const protocol = ROOT_DOMAIN.startsWith("localhost") ? "http" : "https";
    redirect(`${protocol}://${ROOT_DOMAIN}${pathname}`);
  }

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
