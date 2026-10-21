import { ShieldCheckIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireOnboardingUser } from "@/lib/require-onboarding";
import { OnboardingSteps } from "../onboarding-steps";
import { OnboardingCredit } from "../onboarding-brand";
import { PlanCards } from "./plan-cards";

export default async function ChoosePlanPage() {
  await requireOnboardingUser();
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { order: "asc" } });
  const hasTrial = plans.some((p) => p.trialDays > 0);

  return (
    <main className="min-h-screen bg-[#030712] px-4 py-12 text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <OnboardingSteps current={2} />

        <div className="text-center">
          <h1 className="text-2xl font-bold">Elegí tu plan</h1>
          <p className="mt-2 text-sm text-white/50">Podés cambiarlo más adelante desde tu panel.</p>
        </div>

        {hasTrial && (
          <div className="mx-auto flex max-w-xl items-start gap-2.5 rounded-xl border border-[#51c2ec]/25 bg-[#51c2ec]/10 px-4 py-3 text-sm text-white/80">
            <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-[#51c2ec]" />
            <span>
              Empezás a probar sin pagar nada — la suscripción se cobra recién cuando termine tu período de prueba,
              no antes.
            </span>
          </div>
        )}

        {plans.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 p-10 text-center text-sm text-white/50">
            Todavía no hay planes disponibles — volvé más tarde.
          </p>
        ) : (
          <PlanCards
            plans={plans.map((p) => ({
              id: p.id,
              name: p.name,
              priceMonthly: Number(p.priceMonthly),
              priceAnnual: p.priceAnnual === null ? null : Number(p.priceAnnual),
              trialDays: p.trialDays,
              description: p.description,
              maxPublishedProperties: p.maxPublishedProperties,
              maxProducts: p.maxProducts,
              allowCustomDomain: p.allowCustomDomain,
            }))}
          />
        )}
        <OnboardingCredit />
      </div>
    </main>
  );
}
