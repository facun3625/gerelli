import type { Metadata } from "next";
import { UrbiPublicFooter } from "@/components/marketing/urbi-public-footer";
import { UrbiPublicNav } from "@/components/marketing/urbi-public-nav";

export const metadata: Metadata = {
  title: "Privacidad · Urbi",
  description: "Política de privacidad del servicio Urbi.",
  alternates: { canonical: "/privacidad" },
};

const sections = [
  ["Qué información tratamos", "Podemos tratar datos de registro y contacto, información del negocio, configuración de la tienda, actividad de la cuenta, datos técnicos y la información que se carga para gestionar pedidos y clientes."],
  ["Para qué la usamos", "Utilizamos la información para crear y administrar cuentas, prestar y mejorar el servicio, autenticar usuarios, procesar solicitudes, brindar soporte, prevenir fraude, cumplir obligaciones legales y enviar comunicaciones operativas."],
  ["Datos de clientes de cada inmobiliaria", "Cada inmobiliaria determina qué datos solicita a sus clientes y es responsable de informarles cómo los utiliza. Urbi procesa esos datos para prestar la plataforma siguiendo las instrucciones de la inmobiliaria y aplicando medidas razonables de seguridad."],
  ["Proveedores", "Podemos utilizar proveedores de infraestructura, autenticación, correo, analítica, soporte y cobros. Sólo compartimos la información necesaria para que presten sus servicios y exigimos que la protejan conforme a sus obligaciones."],
  ["Conservación y seguridad", "Conservamos la información durante el tiempo necesario para prestar el servicio, cumplir obligaciones y resolver reclamos. Aplicamos medidas técnicas y organizativas razonables, aunque ningún sistema conectado a internet puede garantizar seguridad absoluta."],
  ["Tus derechos", "Podés solicitar acceso, actualización, rectificación o eliminación de tus datos, sujeto a las excepciones y plazos de la normativa aplicable. También podés pedir información sobre el tratamiento realizado."],
  ["Cookies y tecnologías similares", "Usamos cookies necesarias para mantener sesiones, seguridad y preferencias. Cuando incorporemos mediciones no esenciales, informaremos su finalidad y las opciones disponibles."],
  ["Contacto", "Para consultas o para ejercer derechos vinculados con tus datos personales, utilizá Contactar al equipo en la página principal. Podemos pedirte información adicional para verificar tu identidad antes de responder."],
];

export default function PrivacyPage() {
  return <main className="min-h-screen bg-[#f4f8fb] text-[#133453]"><UrbiPublicNav /><article className="mx-auto max-w-3xl px-6 py-16 md:py-24"><p className="text-xs font-black uppercase tracking-[.18em] text-[#1e658c]">Tu información</p><h1 className="mt-3 text-4xl font-black tracking-tight">Política de privacidad</h1><p className="mt-3 text-sm text-black/50">Última actualización: 28 de agosto de 2026</p><p className="mt-8 leading-relaxed text-black/65">Esta política explica de manera general cómo Urbi trata la información relacionada con sus usuarios, inmobiliarias y clientes.</p><div className="mt-10 space-y-9">{sections.map(([title, text]) => <section key={title}><h2 className="text-xl font-black">{title}</h2><p className="mt-3 leading-relaxed text-black/60">{text}</p></section>)}</div></article><UrbiPublicFooter /></main>;
}
