import { Suspense } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Check } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RegistroForm } from "./registro-form";
import { AlreadyLoggedInBanner } from "./already-logged-in-banner";
import { OnboardingCredit } from "./onboarding-brand";
import { trackSiteVisit } from "@/lib/site-visit";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "admin de una inmobiliaria",
  SUPER_ADMIN: "super admin de la plataforma",
};

const TITLE = "Creá tu inmobiliaria · Urbi";
const DESCRIPTION = "Creá tu cuenta en Urbi y organizá propiedades, contactos, visitas y contratos. Consultá los planes y sus condiciones de prueba.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/registro" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/registro",
    siteName: "Urbi",
    locale: "es_AR",
    type: "website",
    images: [{ url: "/brand/social-card.png", width: 1200, height: 630, alt: "Urbi, tu inmobiliaria online" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/brand/social-card.png"],
  },
};

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  await trackSiteVisit("/registro");
  const session = await auth();

  // El mínimo entre los planes activos: lo que se le puede prometer acá
  // (antes de elegir plan) sin arriesgarse a que un plan con menos días
  // deje la promesa incumplida.
  const activePlans = await prisma.plan.findMany({ where: { active: true }, select: { trialDays: true } });
  const trialDaysList = activePlans.map((p) => p.trialDays).filter((d) => d > 0);
  const minTrialDays = trialDaysList.length > 0 ? Math.min(...trialDaysList) : null;

  // La sesión es JWT y no se refresca sola — si el token es viejo puede
  // seguir diciendo "sin tienda" aunque en la base ya tenga una (ver
  // lib/require-onboarding.ts), así que acá también se manda a buscar el
  // estado real en vez de confiar en session.user.tenantId directo.
  const user = session?.user ? await prisma.user.findUnique({ where: { id: session.user.id } }) : null;

  // Una cuenta dueña ya tiene su única tienda. Si vuelve a /registro (por
  // un botón viejo, un marcador o una sesión JWT anterior), no le mostramos
  // nuevamente el alta ni le pedimos cerrar sesión: resolvemos su panel.
  if (user?.role === "ADMIN" && user.tenantId) redirect("/mi-cuenta");
  if (user?.role === "SUPER_ADMIN") redirect("/platform");

  // Volviendo de Google con un código de revendedor en la URL (ver
  // registro-form.tsx) — se guarda acá, antes de decidir a dónde seguir.
  if (ref && user && user.role === "CUSTOMER" && !user.tenantId && !user.pendingReferralCode) {
    await prisma.user.update({ where: { id: user.id }, data: { pendingReferralCode: ref } });
  }

  if (user && user.role === "CUSTOMER" && !user.tenantId) {
    // Se registró antes pero no terminó — lo mandamos directo a donde
    // quedó, en vez de hacerlo pasar por "Crear cuenta" de nuevo.
    if (user.pendingPlanId) redirect("/registro/datos");
    // Ya tener código de socio NO lo manda directo a /socios: esa cuenta
    // puede llegar acá porque su tienda anterior se borró (ver deleteTenant
    // en platform/tiendas/[tenantId]/actions.ts, que la baja a CUSTOMER sin
    // tocar el código) y justamente quiere crear una nueva — forzarlo a
    // /socios lo dejaba sin forma de volver a elegir. /registro/elegir ya
    // contempla el caso "ya es socio" mostrando ambas opciones por igual.
    redirect("/registro/elegir");
  }

  const alreadyLoggedIn = user && (user.role !== "CUSTOMER" || user.tenantId)
    ? { email: user.email, label: ROLE_LABELS[user.role] ?? "cliente de una inmobiliaria" }
    : null;

  return (
    <main className="min-h-screen bg-[#030712] text-white lg:grid lg:grid-cols-2">
      {/* Panel de marca — solo desktop. En mobile alcanza con el logo del
          card del form, no hace falta duplicar la propuesta de valor. */}
      <section className="relative hidden overflow-hidden border-r border-white/10 lg:flex lg:flex-col lg:items-center lg:justify-center lg:px-14 lg:py-12 xl:px-20">
        <div className="relative w-full max-w-md">
          <Image src="/logo_blanco.svg" alt="Urbi" width={595} height={180} className="h-11 w-auto object-contain" />

          <h1 className="mt-6 text-3xl font-extrabold leading-tight tracking-tight xl:text-4xl">
            Tu página inmobiliaria empieza acá.
          </h1>
          <p className="mt-3 leading-relaxed text-white/60">
            Elegí tu plan mensual, personalizá tu página y publicá tus propiedades desde un panel fácil de usar.
          </p>

          <ul className="mt-5 flex flex-col gap-2 text-sm text-white/70">
            <li className="flex items-center gap-2"><Check className="size-4 shrink-0 text-[#51c2ec]" />Tu marca, tus propiedades y tus clientes</li>
            <li className="flex items-center gap-2"><Check className="size-4 shrink-0 text-[#51c2ec]" />Condiciones claras antes de elegir</li>
            {minTrialDays && (
              <li className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-[#51c2ec]" />
                {minTrialDays} días de prueba gratis, sin tarjeta
              </li>
            )}
          </ul>

          <div className="hero-preview-float relative mt-10 aspect-[4/3] w-full max-w-[420px]">
            <Image src="/imac.png" alt="Vista previa de una página web hecha con Urbi" fill sizes="420px" className="object-contain drop-shadow-[0_35px_60px_rgba(0,0,0,.5)]" />
          </div>
        </div>
      </section>

      {/* Panel del formulario */}
      <section className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="flex w-full max-w-sm flex-col gap-0 overflow-hidden rounded-2xl bg-[#0b1220] shadow-2xl ring-1 ring-white/10">
          <div className="flex flex-col items-center gap-3 px-6 py-7 text-center">
            <Image src="/logo_blanco.svg" alt="Urbi" width={595} height={180} className="h-8 w-auto object-contain lg:hidden" />
            <div className="flex flex-col items-center gap-0.5">
              <h2 className="text-xl font-semibold">Creá tu inmobiliaria</h2>
              <p className="text-sm text-white/50">Creá tu cuenta, sin instalaciones.</p>
            </div>
            {minTrialDays && (
              <p className="text-xs font-medium text-[#51c2ec]">
                {minTrialDays} días de prueba gratis — no pedimos tarjeta.
              </p>
            )}
          </div>

          <div className="h-px bg-white/10" />

          <div className="px-6 py-6">
            {alreadyLoggedIn && <AlreadyLoggedInBanner email={alreadyLoggedIn.email} label={alreadyLoggedIn.label} />}
            <Suspense>
              <RegistroForm />
            </Suspense>
          </div>
        </div>
        <div className="mt-7"><OnboardingCredit /></div>
      </section>
    </main>
  );
}
