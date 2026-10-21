"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { estatePlanFeatureLines } from "@/lib/plan-features";

export type PublicPlan = {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number | null;
  trialDays: number;
  description: string | null;
  maxPublishedProperties: number | null;
  maxProducts: number | null;
  allowCustomDomain: boolean;
  allowAiAgent: boolean;
  featured: boolean;
};

type BillingCycle = "MONTHLY" | "ANNUAL";

const priceFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

function planFeatures(plan: PublicPlan) {
  return estatePlanFeatureLines(plan);
}

const PREVIEW_FEATURE_COUNT = 5;

function FeaturesList({
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
    <div className="mt-6 flex flex-col gap-3 border-t border-black/10 pt-5">
      <ul className="flex flex-col gap-3">
        {visible.map((feature, index) => (
          <li key={`${planId}-${index}`} className="flex items-start gap-2 text-sm leading-relaxed text-black/60">
            <Check className="mt-0.5 size-4 shrink-0 text-[#1e658c]" />
            {feature}
          </li>
        ))}
      </ul>
      {rest.length > 0 && (
        <>
          <div className={`grid transition-all duration-300 ease-out ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <div className="overflow-hidden">
              <ul className="flex flex-col gap-3 pt-3">
                {rest.map((feature, index) => (
                  <li key={`${planId}-rest-${index}`} className="flex items-start gap-2 text-sm leading-relaxed text-black/60">
                    <Check className="mt-0.5 size-4 shrink-0 text-[#1e658c]" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleExpanded}
            className="flex items-center gap-1 self-start text-xs font-bold text-[#1e658c] hover:underline"
          >
            {expanded ? "Ver menos" : `Ver ${rest.length} más`}
            <ChevronDown className={`size-3.5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
          </button>
        </>
      )}
    </div>
  );
}

function BillingToggle({ cycle, onChange }: { cycle: BillingCycle; onChange: (cycle: BillingCycle) => void }) {
  return (
    <div className="mb-8 flex justify-center">
      <div className="inline-flex items-center rounded-full border border-black/10 bg-white p-1 shadow-[0_4px_14px_rgba(29,23,19,.05)]">
        <button
          type="button"
          onClick={() => onChange("MONTHLY")}
          className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${cycle === "MONTHLY" ? "bg-[#133453] text-white" : "text-black/50 hover:text-black/80"}`}
        >
          Mensual
        </button>
        <button
          type="button"
          onClick={() => onChange("ANNUAL")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold leading-none transition-colors ${cycle === "ANNUAL" ? "bg-[#208ab1] text-white" : "text-black/50 hover:text-black/80"}`}
        >
          <span className="leading-none">Anual</span>
          <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase leading-none tracking-wide ${cycle === "ANNUAL" ? "bg-white/20 text-white" : "bg-[#208ab1]/10 text-[#1e658c]"}`}>
            Pago anual
          </span>
        </button>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  featured,
  cycle,
  featuresExpanded,
  onToggleFeatures,
}: {
  plan: PublicPlan;
  featured: boolean;
  cycle: BillingCycle;
  featuresExpanded: boolean;
  onToggleFeatures: () => void;
}) {
  const features = planFeatures(plan);
  const showAnnual = cycle === "ANNUAL" && plan.priceAnnual !== null;
  const monthlyEquivalent = showAnnual ? plan.priceAnnual! / 12 : null;
  const savingsPercent =
    showAnnual && plan.priceMonthly > 0 ? Math.round((1 - monthlyEquivalent! / plan.priceMonthly) * 100) : null;

  return (
    <article className={`relative flex h-full min-h-[520px] flex-col rounded-2xl border bg-white p-6 shadow-[0_14px_40px_rgba(29,23,19,.06)] ${featured ? "border-[#208ab1]" : "border-black/10"}`}>
      {featured && <span className="absolute -top-3 left-6 rounded-full bg-[#208ab1] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(32,138,177,.4)]">Más elegido</span>}
      <h3 className="text-xl font-bold">{plan.name}</h3>
      {plan.trialDays > 0 && <p className="mt-2 text-xs font-bold text-[#1e658c]">Incluye {plan.trialDays} {plan.trialDays === 1 ? "día" : "días"} de prueba</p>}

      {showAnnual ? (
        <>
          <div className="mt-6 flex items-end gap-1">
            <span className="text-3xl font-black tracking-tight">{priceFormatter.format(plan.priceAnnual!)}</span>
            <span className="pb-1 text-xs text-black/45">/año</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-xs font-semibold text-black/50">equivale a {priceFormatter.format(monthlyEquivalent!)}/mes</p>
            {savingsPercent !== null && savingsPercent > 0 && (
              <span className="rounded-full bg-[#208ab1]/10 px-2 py-0.5 text-[10px] font-black uppercase text-[#1e658c]">Ahorrás {savingsPercent}%</span>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="mt-6 flex items-end gap-1">
            <span className="text-3xl font-black tracking-tight">{priceFormatter.format(plan.priceMonthly)}</span>
            <span className="pb-1 text-xs text-black/45">/mes</span>
          </div>
          {plan.priceAnnual !== null && <p className="mt-1 text-xs font-semibold text-[#51c2ec]">o {priceFormatter.format(plan.priceAnnual)} al año</p>}
        </>
      )}

      <FeaturesList planId={plan.id} features={features} expanded={featuresExpanded} onToggleExpanded={onToggleFeatures} />

      <div className="flex-1" />

      <Link href="/registro" className={`urbi-btn mt-6 w-full justify-center ${featured ? "border-transparent! bg-[#208ab1]! font-bold shadow-[0_10px_30px_-6px_rgba(32,138,177,.5)] hover:bg-[#1e658c]!" : "border-black/15! bg-[#133453]! text-white hover:bg-black!"}`}>
        Elegir este plan
      </Link>
    </article>
  );
}

export function UrbiPlans({ plans }: { plans: PublicPlan[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [cycle, setCycle] = useState<BillingCycle>("MONTHLY");
  const [featuresExpanded, setFeaturesExpanded] = useState(false);
  const carousel = plans.length > 3;
  // Si ningún plan está marcado como "más elegido" (instalación vieja, antes
  // de este campo), conserva el comportamiento anterior: el del medio.
  const featuredId = plans.find((p) => p.featured)?.id ?? plans[Math.min(1, plans.length - 1)]?.id;

  function goTo(index: number) {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.max(0, Math.min(index, plans.length - 1));
    const card = track.children[next] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
    setActive(next);
  }

  if (plans.length === 0) {
    return <div className="rounded-2xl border border-dashed border-black/15 bg-white/50 p-10 text-center text-sm text-black/50">Estamos preparando nuestros planes. Escribinos y te contamos las opciones disponibles.</div>;
  }

  const hasAnnual = plans.some((p) => p.priceAnnual !== null);

  if (!carousel) {
    return (
      <div>
        {hasAnnual && <BillingToggle cycle={cycle} onChange={setCycle} />}
        <div className={`grid items-stretch gap-5 ${plans.length === 1 ? "mx-auto max-w-md" : plans.length === 2 ? "mx-auto max-w-3xl md:grid-cols-2" : "md:grid-cols-3"}`}>
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              featured={plans.length > 1 && plan.id === featuredId}
              cycle={cycle}
              featuresExpanded={featuresExpanded}
              onToggleFeatures={() => setFeaturesExpanded((e) => !e)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {hasAnnual && <BillingToggle cycle={cycle} onChange={setCycle} />}
      <div className="relative">
        <div className="mb-5 flex justify-end gap-2">
          <button type="button" onClick={() => goTo(active - 1)} disabled={active === 0} aria-label="Plan anterior" className="flex size-10 items-center justify-center rounded-full border border-black/15 bg-white transition hover:border-[#208ab1] hover:text-[#1e658c] disabled:opacity-30"><ChevronLeft className="size-5" /></button>
          <button type="button" onClick={() => goTo(active + 1)} disabled={active === plans.length - 1} aria-label="Plan siguiente" className="flex size-10 items-center justify-center rounded-full border border-black/15 bg-white transition hover:border-[#208ab1] hover:text-[#1e658c] disabled:opacity-30"><ChevronRight className="size-5" /></button>
        </div>
        <div
          ref={trackRef}
          onScroll={(event) => {
            const track = event.currentTarget;
            const cards = Array.from(track.children) as HTMLElement[];
            const nearest = cards.reduce((best, card, index) => Math.abs(card.offsetLeft - track.scrollLeft) < Math.abs(cards[best].offsetLeft - track.scrollLeft) ? index : best, 0);
            setActive(nearest);
          }}
          className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {plans.map((plan) => (
            <div key={plan.id} className="w-[88%] shrink-0 snap-start sm:w-[55%] lg:w-[calc((100%-2.5rem)/3)]">
              <PlanCard
                plan={plan}
                featured={plan.id === featuredId}
                cycle={cycle}
                featuresExpanded={featuresExpanded}
                onToggleFeatures={() => setFeaturesExpanded((e) => !e)}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-2" aria-label="Posición del carrusel">
          {plans.map((plan, index) => <button key={plan.id} type="button" onClick={() => goTo(index)} aria-label={`Ver plan ${plan.name}`} className={`h-2 rounded-full transition-all ${active === index ? "w-7 bg-[#208ab1]" : "w-2 bg-black/15"}`} />)}
        </div>
      </div>
    </div>
  );
}
