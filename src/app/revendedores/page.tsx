import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeDollarSign, Check, Link2, QrCode, TrendingUp, Users } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { UrbiPublicFooter } from "@/components/marketing/urbi-public-footer";
import { UrbiPublicNav } from "@/components/marketing/urbi-public-nav";
import { UrbiReveal } from "@/components/marketing/urbi-reveal";
import { UrbiFaqList } from "@/components/marketing/urbi-faq-list";
import { trackSiteVisit } from "@/lib/site-visit";

export const metadata: Metadata = {
  title: "Socios comerciales · Urbi",
  description: "Recomendá Urbi, ayudá a más negocios a vender online y construí un ingreso recurrente.",
  alternates: { canonical: "/revendedores" },
};

const steps = [
  { icon: Users, number: "01", title: "Sumate como socio", text: "Te registrás en Urbi — no hace falta que nadie te apruebe, arrancás al toque." },
  { icon: Link2, number: "02", title: "Compartí tu código", text: "Te llevás un código y un QR propios. Cualquier inmobiliaria que se cree con ellos queda asociada a vos." },
  { icon: QrCode, number: "03", title: "El negocio se crea solo", text: "La persona crea su cuenta, elige un plan y arma su inmobiliaria en minutos, sin instalaciones ni técnicos." },
  { icon: BadgeDollarSign, number: "04", title: "Construí tu ingreso", text: "Cada vez que esa inmobiliaria paga, la comisión te queda pendiente en tu panel. Vos ves todo en tiempo real." },
];

export default async function ResellersPage() {
  await trackSiteVisit("/revendedores");

  const [settings, tiers, referencePlan] = await Promise.all([
    prisma.resellerSettings.upsert({ where: { id: "global" }, update: {}, create: { id: "global" } }),
    prisma.resellerCommissionTier.findMany({ orderBy: { minActiveStores: "asc" } }),
    prisma.plan.findFirst({ where: { active: true }, orderBy: { order: "asc" } }),
  ]);

  const minPercent = tiers[0] ? Number(tiers[0].percent) : 0;
  const maxPercent = tiers.length ? Number(tiers[tiers.length - 1].percent) : minPercent;
  const bonusAmount = Number(settings.activationBonusAmount);
  const bonusDays = settings.activationBonusDays;

  const growthText =
    tiers.length > 1
      ? tiers
          .slice(1)
          .map((t) => `${Number(t.percent)}% desde ${t.minActiveStores} inmobiliarias activas`)
          .join(" · ")
      : "Un único porcentaje fijo por ahora.";

  const resellerFaqs: [string, string][] = [
    ["¿Tengo que instalar o configurar la inmobiliaria?", "No. El alta es online y Urbi se ocupa de la plataforma, la infraestructura, las actualizaciones y el soporte técnico."],
    ["¿Cuándo empiezo a cobrar?", `La comisión recurrente se genera sobre cada pago que la inmobiliaria le hace a Urbi. El bono de activación se libera cuando la inmobiliaria lleva ${bonusDays} días pagando seguido.`],
    ["¿Cómo se identifica qué inmobiliaria traje yo?", "Cada inmobiliaria que se crea usando tu código o tu QR queda asociada a vos automáticamente, sin que tengas que avisarle a nadie ni confirmar nada por escrito."],
    ["¿Necesito aprobación para empezar?", "No. Te registrás y tu código está activo al instante."],
    ["¿Necesito conocimientos técnicos?", "No. Tu tarea es comercial: compartir tu código y acompañar la decisión. Los incidentes técnicos los atiende Urbi."],
  ];

  return (
    <main className="min-h-screen bg-[#f4f8fb] text-[#133453]">
      <UrbiPublicNav />

      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-20 md:pb-28 md:pt-28 lg:grid-cols-[1fr_380px]">
          <div>
            <p className="mb-4 text-xs font-black uppercase tracking-[.2em] text-[#1e658c]">Socios comerciales Urbi</p>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.06] tracking-[-.045em] md:text-6xl">Tu próxima venta puede convertirse en un ingreso recurrente.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-black/55">Recomendá Urbi a inmobiliarias y administradores que necesitan organizar su cartera y gestión. Ganás un bono por activación y una comisión cada vez que el cliente paga. Urbi se ocupa del producto y el soporte técnico.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/registro" className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#208ab1] px-6 font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#1e658c]">Quiero ser socio <ArrowRight className="size-[18px]" /></Link>
              <Link href="/socios" className="inline-flex h-12 items-center rounded-xl border border-black/15 bg-white px-6 font-bold transition hover:border-black/30">Ya soy socio, entrar</Link>
            </div>
            <p className="mt-4 text-xs font-bold text-black/45">Sin costo · Alta instantánea · Sin aprobación previa</p>
          </div>

          <div className="rotate-2 rounded-3xl bg-[#133453] p-8 text-white shadow-[0_24px_60px_rgba(13,59,59,.18)] lg:p-10">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#51c2ec]">Tu cartera activa</p>
            <p className="mt-5 text-7xl font-black tracking-[-.06em]">{minPercent}%</p>
            <p className="mt-1 font-bold">en cada pago de tus inmobiliarias</p>
            <div className="my-7 h-px bg-white/15" />
            <p className="text-sm leading-relaxed text-white/60">
              {maxPercent > minPercent
                ? `El porcentaje puede crecer hasta el ${maxPercent}% a medida que sumás inmobiliarias activas.`
                : "Porcentaje fijo por ahora, sin importar cuántas inmobiliarias traigas."}
            </p>
          </div>
        </div>
      </section>

      <section id="modelo" className="scroll-mt-20 bg-[#208ab1] py-20 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[.18em] text-white/70">El modelo</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Ganás al activar. Seguís ganando mientras el cliente paga.</h2>
            <p className="mt-4 leading-relaxed text-white/75">No es un premio aislado por recomendar un enlace. Es una relación comercial que recompensa la activación y el crecimiento de tu cartera.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl bg-white p-6 text-[#133453]">
              <p className="text-xs font-black uppercase tracking-wider text-[#1e658c]">Activación</p>
              <h3 className="mt-4 text-3xl font-black">{bonusAmount > 0 ? `$${bonusAmount.toLocaleString("es-AR")} de bono` : "Bono de activación"}</h3>
              <p className="mt-3 text-sm leading-relaxed text-black/55">Cuando una inmobiliaria que trajiste lleva {bonusDays} días pagando seguido, recibís este bono una sola vez.</p>
            </article>
            <article className="rounded-2xl bg-[#133453] p-6 text-white">
              <p className="text-xs font-black uppercase tracking-wider text-[#51c2ec]">Recurrencia</p>
              <h3 className="mt-4 text-3xl font-black">{minPercent}% inicial</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/60">Cobrás sobre cada pago que Urbi le registra a esa inmobiliaria.</p>
            </article>
            <article className="rounded-2xl bg-[#dff2f8] p-6 text-[#133453]">
              <p className="text-xs font-black uppercase tracking-wider text-black/50">Crecimiento</p>
              <h3 className="mt-4 text-3xl font-black">Hasta {maxPercent}%</h3>
              <p className="mt-3 text-sm leading-relaxed text-black/55">{growthText}</p>
            </article>
          </div>
        </div>
      </section>

      {referencePlan && (
        <section className="bg-[#f4f8fb] py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-10 max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[.18em] text-[#1e658c]">Números concretos</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Una venta puede seguir generando todos los meses.</h2>
              <p className="mt-4 text-black/55">Ejemplos estimados usando el plan {referencePlan.name} (${Number(referencePlan.priceMonthly).toLocaleString("es-AR")}/mes) y suponiendo que todos los clientes estén activos y al día.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3" style={{ gridTemplateColumns: `repeat(${Math.min(tiers.length, 3)}, minmax(0, 1fr))` }}>
              {tiers.map((tier, index) => {
                const stores = Math.max(tier.minActiveStores, 1);
                const monthly = stores * Number(referencePlan.priceMonthly) * (Number(tier.percent) / 100);
                return (
                  <UrbiReveal key={tier.id} direction="up" delay={index * 90}>
                    <article className="rounded-2xl border border-black/10 bg-white p-6">
                      <p className="text-sm font-bold text-black/45">{stores} activos · {Number(tier.percent)}%</p>
                      <p className="mt-3 text-3xl font-black tracking-tight text-[#1e658c]">${Math.round(monthly).toLocaleString("es-AR")} / mes</p>
                      <p className="mt-2 text-xs text-black/45">Comisión recurrente bruta estimada</p>
                    </article>
                  </UrbiReveal>
                );
              })}
            </div>
            <p className="mt-5 text-xs leading-relaxed text-black/45">Ejemplos informativos, no constituyen una garantía de ingresos y no incluyen el bono de activación, impuestos, descuentos, devoluciones ni contracargos. El importe varía según el plan y las condiciones vigentes en cada momento.</p>
          </div>
        </section>
      )}

      <section id="condiciones" className="scroll-mt-20 bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[.18em] text-[#1e658c]">Cómo funciona</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Simple de explicar. Claro para cobrar.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, number, title, text }) => (
              <article key={number} className="rounded-2xl border border-black/8 bg-[#f4f8fb] p-6">
                <div className="flex items-center justify-between"><Icon className="size-5 text-[#1e658c]" /><span className="text-xs font-black text-black/25">{number}</span></div>
                <h3 className="mt-8 font-black">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-black/50">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#133453] py-24 text-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-[#51c2ec]">Una oportunidad real</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Vos abrís la oportunidad. Urbi hace funcionar el sistema.</h2>
            <p className="mt-5 leading-relaxed text-white/60">La inmobiliaria crea su cuenta, configura su sitio y empieza a publicar propiedades. Tu rol es encontrar oportunidades, compartir tu código y acompañar la decisión comercial.</p>
          </div>
          <div className="rounded-2xl bg-white p-7 text-[#133453]">
            <h3 className="font-black">Herramientas para vender mejor</h3>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {["Código y QR propios", "Panel con tus inmobiliarias y comisiones", "Atribución automática", "Sin aprobación previa", "Comisiones transparentes", "Soporte de Urbi para tus clientes"].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-black/60"><Check className="mt-0.5 size-4 shrink-0 text-[#1e658c]" />{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-white py-24 text-[#133453]">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-10 text-center">
            <p className="text-xs font-black uppercase tracking-[.18em] text-[#1e658c]">Preguntas frecuentes</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">Un programa claro desde el inicio</h2>
          </div>
          <UrbiFaqList items={resellerFaqs} />
        </div>
      </section>

      <section className="bg-[#f4f8fb] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-start justify-between gap-8 rounded-3xl border border-black/10 bg-[#dff2f8] p-8 md:flex-row md:items-center md:p-10">
            <div>
              <div className="flex items-center gap-2 text-black/55"><TrendingUp className="size-5" /><span className="text-xs font-black uppercase tracking-[.16em]">Socios Urbi</span></div>
              <h2 className="mt-4 text-3xl font-black tracking-tight">Empezá a construir tu cartera hoy.</h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-black/55">Te registrás, te llevás tu código, y empezás a compartirlo. Así de simple.</p>
            </div>
            <Link href="/registro" className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-[#133453] px-6 font-bold text-white transition hover:-translate-y-0.5 hover:bg-black">Quiero ser socio <ArrowRight className="size-4" /></Link>
          </div>
        </div>
      </section>

      <UrbiPublicFooter />
    </main>
  );
}
