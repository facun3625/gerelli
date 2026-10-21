import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoForm, DemoProperties, DemoShell } from "@/components/demo/demo-site";

const pages: Record<string, { eyebrow: string; title: string; intro: string; items?: [string, string][] }> = {
  nosotros: { eyebrow: "Nosotros", title: "Cerca de vos, en cada decisión.", intro: "Comprar, vender o alquilar empieza por conocer lo que necesitás. En este espacio tu inmobiliaria puede presentar a su equipo, su historia y su forma de trabajar.", items: [["Escuchamos tu búsqueda", "Cada persona y cada propiedad tienen necesidades distintas. El primer paso es entenderlas."], ["Conocimiento de la zona", "Presentá los barrios y las localidades en las que trabaja tu equipo."], ["Acompañamiento personal", "Mostrá cómo acompañás a tus clientes desde la primera consulta hasta la entrega de llaves."]] },
  tasacion: { eyebrow: "Servicios", title: "¿Cuánto vale tu propiedad?", intro: "Contanos qué inmueble querés vender o alquilar. Una tasación empieza por conocer sus características, su ubicación y el estado de la propiedad." },
  "administracion-consorcios": { eyebrow: "Servicios", title: "Administración de Consorcios", intro: "Un espacio para presentar el servicio de administración de edificios y la atención a propietarios.", items: [["Expensas y cuentas", "Explicá cómo se comunican los gastos y se presentan las liquidaciones a cada consorcio."], ["Mantenimiento", "Presentá tu forma de coordinar tareas, reparaciones y proveedores."], ["Atención a propietarios", "Indicá los canales de consulta y el seguimiento de solicitudes."], ["Gestión del edificio", "Describí el alcance de tu servicio y la organización de reuniones y documentación."]] },
  obras: { eyebrow: "Servicios", title: "Proyecto y Ejecución de Obras", intro: "Desde una primera idea hasta un nuevo espacio. Presentá los servicios de proyecto, remodelación y seguimiento de obra que ofrece tu equipo.", items: [["Proyecto", "Un espacio para contar cómo se estudian las necesidades, la distribución y las posibilidades del inmueble."], ["Planificación", "Explicá cómo se definen las etapas, los alcances y el presupuesto de cada proyecto."], ["Seguimiento", "Mostrá cómo se coordina el trabajo y se comunica el avance de la obra."]] },
  mapa: { eyebrow: "Explorá por ubicación", title: "Propiedades en Mapa", intro: "Explorá una zona de ejemplo. Las propiedades de esta demostración son ficticias y no tienen ubicaciones reales asignadas." },
  alertas: { eyebrow: "Recibir Alertas", title: "Contanos qué estás buscando.", intro: "Elegí operación, tipo de propiedad y zona. Probá cómo tus visitantes podrían configurar una búsqueda personalizada." },
  contacto: { eyebrow: "Contacto", title: "Hablemos de tu próxima propiedad.", intro: "Consultas sobre venta, alquiler y servicios inmobiliarios. Este espacio llevará los datos de contacto, los horarios y la dirección de tu inmobiliaria." },
};
export function generateStaticParams() { return Object.keys(pages).map(section => ({ section })); }
export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params;
  return { title: `${pages[section]?.title ?? "Página no encontrada"} · Urbi`, robots: { index: false, follow: false } };
}
export default async function DemoSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = pages[section];
  if (!page) notFound();
  return <DemoShell>
    <section className="bg-[#edf6fa] px-6 py-14"><div className="mx-auto max-w-7xl"><Link href="/demo" className="text-sm text-[#1e658c]">Inicio / {page.eyebrow}</Link><h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">{page.title}</h1><p className="mt-5 max-w-2xl leading-7 text-slate-500">{page.intro}</p></div></section>
    <section className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
      {page.items && <><div className="grid gap-6 md:grid-cols-2">{page.items.map(([title, text], i) => <article key={title} className="rounded-2xl border border-slate-200 p-8"><p className="text-sm font-semibold text-[#208ab1]">0{i + 1}</p><h2 className="mt-4 text-2xl font-semibold">{title}</h2><p className="mt-3 leading-7 text-slate-500">{text}</p></article>)}</div><Link href="/demo/contacto" className="mt-8 inline-block rounded-lg bg-[#1e658c] px-6 py-3 font-semibold text-white">{section === "nosotros" ? "Conocé cómo podemos ayudarte" : "Consultar por este servicio"}</Link></>}
      {["tasacion", "alertas", "contacto"].includes(section) && <div className="max-w-3xl"><DemoForm kind={section}/></div>}
      {section === "mapa" && <><div className="mb-10 overflow-hidden rounded-2xl border border-slate-200"><iframe title="Mapa de referencia de Córdoba, sin propiedades geolocalizadas" src="https://www.openstreetmap.org/export/embed.html?bbox=-64.23%2C-31.45%2C-64.14%2C-31.38&layer=mapnik" className="h-[420px] w-full border-0" loading="lazy"/><p className="bg-slate-50 px-5 py-3 text-sm text-slate-500">Zona ilustrativa: Córdoba. Sin marcadores de propiedades. <a className="underline" href="https://www.openstreetmap.org/#map=13/-31.415/-64.185" target="_blank" rel="noreferrer">Abrir mapa</a></p></div><DemoProperties/></>}
    </section>
  </DemoShell>;
}
