import { ActionForm } from "@/components/ui/action-form";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireOnboardingUser } from "@/lib/require-onboarding";
import { ARGENTINA_PROVINCES, BUSINESS_CATEGORIES, REFERRAL_SOURCES } from "@/lib/argentina";
import { OnboardingSteps } from "../onboarding-steps";
import { OnboardingCredit } from "../onboarding-brand";
import { createTenantFromOnboarding } from "./actions";
import { SubdomainField } from "./subdomain-field";
import { OnboardingSelect } from "./onboarding-select";

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-[#208ab1] focus:ring-2 focus:ring-[#208ab1]/20";
const fieldClass = "grid gap-1.5 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-start sm:gap-3 [&>label]:sm:pt-3 [&>label]:sm:text-right";

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "localhost:3010";

export default async function DatosPage() {
  const session = await requireOnboardingUser();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { pendingPlan: true },
  });
  if (!user?.pendingPlan) redirect("/registro/plan");

  return (
    <main className="min-h-screen bg-[#030712] px-4 py-12 text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <OnboardingSteps current={3} />

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-7">
          <h1 className="text-xl font-bold">Ya casi — armemos tu inmobiliaria</h1>
          <p className="mt-1 text-sm text-white/50">
            Plan {user.pendingPlan.name}.{" "}
            {user.pendingPlan.trialDays > 0
              ? `Incluye ${user.pendingPlan.trialDays} días de prueba desde que creás la inmobiliaria. La fecha exacta del primer pago quedará registrada en tu panel.`
              : "Este plan no incluye período de prueba; para publicar propiedades deberás activar la suscripción desde tu panel."}
          </p>

          <ActionForm action={createTenantFromOnboarding} className="mt-5 grid gap-x-5 gap-y-3 md:grid-cols-2">
            <div className={fieldClass}>
              <label htmlFor="storeName" className="text-xs font-medium text-white/60">Nombre de la inmobiliaria</label>
              <input
                id="storeName"
                name="storeName"
                required
                className={inputClass}
              />
            </div>

            <div className={fieldClass}>
              <label htmlFor="subdomain" className="text-xs font-medium text-white/60">Subdominio</label>
              <SubdomainField rootDomain={ROOT_DOMAIN} />
            </div>

            <div className="mt-1 flex flex-col gap-3 border-t border-white/10 pt-3 md:col-span-2">
              <p className="text-xs font-medium text-white/40">Datos opcionales — los podés completar después</p>

              <div className="grid gap-x-5 gap-y-3 md:grid-cols-2">
                <div className={fieldClass}>
                  <label htmlFor="phone" className="text-xs font-medium text-white/60">Tu teléfono</label>
                  <input id="phone" name="phone" type="tel" placeholder="+54 9 11 ..." className={inputClass} />
                </div>
                <div className={fieldClass}>
                  <label htmlFor="city" className="text-xs font-medium text-white/60">Ciudad</label>
                  <input id="city" name="city" className={inputClass} />
                </div>

                <div className={fieldClass}>
                  <label htmlFor="province" className="text-xs font-medium text-white/60">Provincia</label>
                  <OnboardingSelect id="province" name="province" options={ARGENTINA_PROVINCES} />
                </div>

                <div className={fieldClass}>
                  <label htmlFor="businessCategory" className="text-xs font-medium text-white/60">Actividad principal</label>
                  <OnboardingSelect id="businessCategory" name="businessCategory" options={BUSINESS_CATEGORIES} />
                </div>

                <div className={`${fieldClass} md:col-span-2 md:grid-cols-[120px_minmax(0,1fr)]`}>
                  <label htmlFor="referralSource" className="text-xs font-medium text-white/60">¿Cómo nos conociste?</label>
                  <OnboardingSelect id="referralSource" name="referralSource" options={REFERRAL_SOURCES} />
                </div>

                <div className={`${fieldClass} md:col-span-2 md:grid-cols-[120px_minmax(0,1fr)]`}>
                  <label htmlFor="promotionCode" className="text-xs font-medium text-white/60">Código promocional</label>
                  <div>
                    <input id="promotionCode" name="promotionCode" maxLength={30} placeholder="Opcional" className={`${inputClass} uppercase`} />
                    <p className="mt-1 text-xs text-white/35">Si tenés uno, reemplaza los días de prueba por el período bonificado.</p>
                  </div>
                </div>
              </div>
            </div>

            {!user.passwordHash && (
              <div className={`${fieldClass} md:col-span-2 md:grid-cols-[120px_minmax(0,1fr)]`}>
                <label htmlFor="password" className="text-xs font-medium text-white/60">
                  Definí una contraseña <span className="font-normal text-white/40">(opcional)</span>
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  minLength={6}
                  placeholder="Mínimo 6 caracteres — dejalo vacío para entrar solo con Google"
                  className={inputClass}
                />
                <p className="text-xs text-white/40 sm:col-start-2">
                  Te registraste con Google — con eso alcanza para entrar a tu panel. Si además querés poder entrar
                  con contraseña, definila acá.
                </p>
              </div>
            )}

            <button type="submit" className="urbi-btn urbi-btn-primary mt-2 w-full justify-center md:col-span-2">
              Crear mi inmobiliaria
            </button>
          </ActionForm>
        </div>
        <OnboardingCredit />
      </div>
    </main>
  );
}
