import type { Metadata } from "next";
import { UrbiPublicFooter } from "@/components/marketing/urbi-public-footer";
import { UrbiPublicNav } from "@/components/marketing/urbi-public-nav";

export const metadata: Metadata = {
  title: "Términos de uso · Urbi",
  description: "Condiciones generales de uso del servicio Urbi.",
  alternates: { canonical: "/terminos" },
};

const sections = [
  ["1. El servicio", "Urbi es una plataforma online que permite publicar propiedades y administrar contactos, visitas, operaciones, contratos y registros de cobranzas. Cada inmobiliaria es responsable de sus publicaciones, precios, disponibilidad, atención y operaciones."],
  ["2. Cuenta y seguridad", "Para utilizar las funciones de administración debés crear una cuenta y brindar información verdadera y actualizada. Sos responsable de proteger tus credenciales y de la actividad realizada desde tu cuenta. Informanos de inmediato si detectás un acceso no autorizado."],
  ["3. Prueba, planes y renovación", "Las condiciones, duración y alcance de una prueba se informan durante el alta. Antes de contratar se muestra el plan y su precio vigente. Las suscripciones se renuevan según la modalidad elegida hasta su cancelación. Los cambios de precio se comunicarán antes de aplicarse a una renovación futura."],
  ["4. Operaciones y cobros", "Urbi no es parte de la compraventa entre la inmobiliaria y sus clientes y no cobra una comisión porcentual sobre cada venta. Los proveedores de cobro, entidades financieras o pasarelas seleccionadas por la inmobiliaria pueden aplicar sus propias comisiones y condiciones."],
  ["5. Uso permitido", "No podés usar Urbi para actividades ilegales, fraudulentas, engañosas, que vulneren derechos de terceros o comprometan la seguridad del servicio. Podemos limitar o suspender una cuenta ante incumplimientos graves, fraude, falta de pago o riesgos para la plataforma y sus usuarios."],
  ["6. Contenido y datos de la inmobiliaria", "Conservás la titularidad del contenido que cargás. Nos autorizás a procesarlo y mostrarlo únicamente en la medida necesaria para prestar el servicio. Debés contar con los derechos y autorizaciones correspondientes sobre imágenes, marcas, propiedades y datos ingresados."],
  ["7. Disponibilidad y cambios", "Trabajamos para mantener el servicio disponible y seguro, aunque pueden existir mantenimientos, interrupciones o cambios necesarios. Las funciones en desarrollo o anunciadas como próximas no forman parte del servicio contratado hasta su publicación efectiva."],
  ["8. Cancelación", "Podés solicitar la cancelación de tu suscripción para evitar futuras renovaciones. La cancelación no genera, salvo obligación legal distinta, devolución de períodos ya iniciados o importes efectivamente devengados. Antes de cancelar, sos responsable de resguardar la información que necesites conservar."],
  ["9. Responsabilidad", "Urbi brinda herramientas de gestión, pero las decisiones comerciales, fiscales y de atención corresponden al titular de cada inmobiliaria. Nuestra responsabilidad se limita en la máxima medida permitida por la normativa aplicable y no comprende pérdidas indirectas ni resultados comerciales esperados."],
  ["10. Contacto y actualizaciones", "Podemos actualizar estos términos para reflejar cambios legales o del servicio. La versión publicada indicará su fecha de vigencia. Para consultas, utilizá Contactar al equipo en la página principal."],
];

export default function TermsPage() {
  return <main className="min-h-screen bg-[#f4f8fb] text-[#133453]"><UrbiPublicNav /><article className="mx-auto max-w-3xl px-6 py-16 md:py-24"><p className="text-xs font-black uppercase tracking-[.18em] text-[#1e658c]">Información legal</p><h1 className="mt-3 text-4xl font-black tracking-tight">Términos de uso</h1><p className="mt-3 text-sm text-black/50">Última actualización: 28 de agosto de 2026</p><p className="mt-8 leading-relaxed text-black/65">Estos términos regulan el acceso y uso de Urbi. Al crear una cuenta o contratar el servicio confirmás que los leíste y aceptaste.</p><div className="mt-10 space-y-9">{sections.map(([title, text]) => <section key={title}><h2 className="text-xl font-black">{title}</h2><p className="mt-3 leading-relaxed text-black/60">{text}</p></section>)}</div></article><UrbiPublicFooter /></main>;
}
