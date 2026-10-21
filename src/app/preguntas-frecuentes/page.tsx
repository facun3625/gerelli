import type { Metadata } from "next";
import { ContactCtaButton } from "@/components/marketing/contact-cta-button";

import { UrbiPublicFooter } from "@/components/marketing/urbi-public-footer";
import { UrbiPublicNav } from "@/components/marketing/urbi-public-nav";
import { UrbiFaqList } from "@/components/marketing/urbi-faq-list";
import { UrbiReveal } from "@/components/marketing/urbi-reveal";
import { FAQ_CATEGORIES } from "@/lib/faq-content";
import { trackSiteVisit } from "@/lib/site-visit";

export const metadata: Metadata = {
  title: "Preguntas frecuentes · Urbi",
  description: "Respuestas sobre tu página web inmobiliaria, propiedades, personalización y planes mensuales de Urbi.",
  alternates: { canonical: "/preguntas-frecuentes" },
};

const categories = FAQ_CATEGORIES;

// FAQPage le permite a Google mostrar estas preguntas plegables directo en
// los resultados de búsqueda (rich snippet), sin que la persona tenga que
// entrar al sitio para verlas.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: categories.flatMap(({ questions }) =>
    questions.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  ),
};

export default async function FrequentlyAskedQuestionsPage() {
  await trackSiteVisit("/preguntas-frecuentes");

  return (
    <main className="min-h-screen bg-[#f4f8fb] text-[#133453]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <UrbiPublicNav />

      <section className="bg-[#208ab1] px-6 py-16 text-white md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-black uppercase tracking-[.2em] text-white/75">Centro de ayuda</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-.04em] md:text-6xl">Preguntas frecuentes</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/80">Todo lo que necesitás saber antes de crear tu página inmobiliaria y comenzar a recibir consultas con Urbi.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <div className="space-y-14">
          {categories.map(({ icon: Icon, title, questions }, index) => (
            <UrbiReveal key={title} direction={index % 2 === 0 ? "left" : "right"}>
            <section id={title.toLowerCase().replaceAll(" ", "-")} className="scroll-mt-24">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-[#208ab1]/10 text-[#1e658c]"><Icon className="size-5" /></span>
                <h2 className="text-2xl font-black tracking-tight">{title}</h2>
              </div>
              <UrbiFaqList items={questions} />
            </section></UrbiReveal>
          ))}
        </div>

        <div className="mt-16 rounded-3xl bg-[#133453] p-8 text-white md:flex md:items-center md:justify-between md:gap-10 md:p-10">
          <div><p className="text-xs font-black uppercase tracking-[.18em] text-[#51c2ec]">¿Te quedó alguna duda?</p><h2 className="mt-3 text-2xl font-black">Hablemos sobre tu inmobiliaria.</h2><p className="mt-2 text-sm text-white/60">Te ayudamos a entender si Urbi te ayuda a mostrar tus propiedades.</p></div>
          <ContactCtaButton label="Escribinos" className="mt-6 inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-[#208ab1] px-6 font-bold text-white transition hover:-translate-y-0.5 md:mt-0" />
        </div>
      </section>

      <UrbiPublicFooter />
    </main>
  );
}
