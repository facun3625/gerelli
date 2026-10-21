"use client";

import { useState, useTransition } from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { toast } from "sonner";

import { formatPrice } from "@/lib/format";
import { estatePlanFeatureLines } from "@/lib/plan-features";
import { choosePlan } from "./actions";

type Plan = {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number | null;
  trialDays: number;
  description: string | null;
  maxPublishedProperties: number | null;
  maxProducts: number | null;
  allowCustomDomain: boolean;
};

const PREVIEW_FEATURE_COUNT = 5;

// Mismo patrón (y mismo motivo) que FeaturesList en urbi-plans.tsx: con la
// lista completa siempre abierta, el botón de elegir quedaba varias
// pantallas más abajo — acá se ve un adelanto y se expande a pedido, todos
// los planes juntos para que sigan alineados entre sí.
function PlanFeaturesList({
  planId,
  features,
  expanded,
  onToggleExpanded,
}: {
  planId: string;
  features: string[];
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const visible = features.slice(0, PREVIEW_FEATURE_COUNT);
  const rest = features.slice(PREVIEW_FEATURE_COUNT);

  return (
    <div className="mt-6 flex flex-col gap-2 border-t border-white/5 pt-5 text-xs text-white/70">
      <ul className="flex flex-col gap-2">
        {visible.map((feature, index) => (
          <li key={`${planId}-${index}`} className="flex items-start gap-2">
            <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-[#51c2ec]" />
            {feature}
          </li>
        ))}
      </ul>
      {rest.length > 0 && (
        <>
          <div className={`grid transition-all duration-300 ease-out ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <div className="overflow-hidden">
              <ul className="flex flex-col gap-2 pt-2">
                {rest.map((feature, index) => (
                  <li key={`${planId}-rest-${index}`} className="flex items-start gap-2">
                    <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-[#51c2ec]" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleExpanded}
            className="mt-1 flex items-center gap-1 self-start text-xs font-bold text-[#51c2ec] hover:underline"
          >
            {expanded ? "Ver menos" : `Ver ${rest.length} más`}
            <ChevronDownIcon className={`size-3.5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
          </button>
        </>
      )}
    </div>
  );
}

export function PlanCards({ plans }: { plans: Plan[] }) {
  const [featuresExpanded, setFeaturesExpanded] = useState(false);
  const [pending, startTransition] = useTransition();

  // Botones y no <form action={...}>: la action puede devolver un motivo por
  // el que ese plan no sirve, y un form action no tiene dónde mostrarlo.
  function pickPlan(planId: string, billingCycle: "MONTHLY" | "ANNUAL") {
    startTransition(async () => {
      try {
        const result = await choosePlan(planId, billingCycle);
        if (result && "error" in result) toast.error(result.error);
      } catch {
        toast.error("Se cortó la conexión. Probá de nuevo.");
      }
    });
  }

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {plans.map((plan) => {
        const features = estatePlanFeatureLines(plan);
        return (
          <div
            key={plan.id}
            className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6"
          >
            <h3 className="text-lg font-bold">{plan.name}</h3>
            <div className="mt-5 flex items-end gap-1">
              <span className="text-3xl font-black tracking-tight">{formatPrice(plan.priceMonthly)}</span>
              <span className="pb-1 text-xs text-white/45">/mes</span>
            </div>
            {plan.priceAnnual !== null && (
              <p className="mt-1 text-sm font-bold text-[#51c2ec]">o {formatPrice(plan.priceAnnual)} por año</p>
            )}

            <PlanFeaturesList
              planId={plan.id}
              features={[
                plan.trialDays > 0 ? `${plan.trialDays} días de prueba incluidos` : "Sin período de prueba",
                ...features,
              ]}
              expanded={featuresExpanded}
              onToggleExpanded={() => setFeaturesExpanded((e) => !e)}
            />

            <div className="flex-1" />

            <div className="mt-6 grid gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => pickPlan(plan.id, "MONTHLY")}
                className="urbi-btn urbi-btn-primary w-full justify-center"
              >
                Elegir mensual
              </button>
              {plan.priceAnnual !== null && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => pickPlan(plan.id, "ANNUAL")}
                  className="urbi-btn urbi-btn-secondary w-full justify-center"
                >
                  Elegir anual
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
