import {
  ClipboardList,
  Compass,
  HardHat,
  Handshake,
  Lightbulb,
  PencilRuler,
  Ruler,
  type LucideIcon,
} from "lucide-react";

// Contenido de la sección Arquitectura, migrado del sitio anterior
// (gerellicorrenti.com.ar/about y /servicios-arq). Las imágenes se copiaron
// a R2 para no depender del WordPress viejo cuando se mude el dominio.
export const ARQ_R2 = "https://pub-f59926e980074152ab17e8fa8e9ffa0a.r2.dev/arquitectura";
export const ARQ_EMAIL = "sergiogerelli@gmail.com";

export const ARQ_SECTIONS = [
  { href: "/arquitectura/equipo", label: "Equipo" },
  { href: "/arquitectura/servicios", label: "Servicios" },
  { href: "/arquitectura/obras", label: "Obras" },
] as const;

export const TEAM_GALLERY = [1, 2, 3].map((n) => ({
  id: `equipo-${n}`,
  type: "IMAGE" as const,
  url: `${ARQ_R2}/equipo-${n}.webp`,
}));

export const TRAITS = [
  "Amplia experiencia y trayectoria. Lo realizado hasta hoy lo demuestra: buenos negocios inmobiliarios y alta calidad arquitectónica general y de detalles.",
  "Atención especialmente personalizada.",
  "Honestidad y sinceridad: consideramos fundamental generar un vínculo de confianza mutua.",
  "Procuramos respuestas rápidas con soluciones simples, funcionales, eficientes y bien coordinadas.",
];

export const PILLARS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: PencilRuler,
    title: "Arquitectura",
    text: "Nuestros diseños se enriquecen por la complementariedad de las ideas del equipo. Cada nueva obra la pensamos desde las necesidades particulares y expectativas del cliente, atendiendo sobre todo sus preocupaciones y con una acorde relación calidad-precio. El resultado: inmuebles con mucha riqueza espacial y alto nivel de diseño y calidad.",
  },
  {
    icon: Handshake,
    title: "Inmobiliaria",
    text: "Fomentamos la relación personalizada basada en la confianza y la transparencia, acompañando y asesorando profesionalmente para lograr con éxito los acuerdos y la conformidad de todas las partes intervinientes.",
  },
  {
    icon: Compass,
    title: "Integración",
    text: "Nace desde el asesoramiento al momento de adquirir un inmueble: estudiamos su potencial, la inversión estimada a realizar y su valorización antes de ejecutar las mejoras. Cuando se busca retorno financiero, analizamos el negocio antes de la compra.",
  },
];

export type ArqService = {
  icon: LucideIcon;
  title: string;
  paragraphs?: string[];
  intro?: string;
  bullets?: string[];
};

export const SERVICES: ArqService[] = [
  {
    icon: Lightbulb,
    title: "Asesoramientos",
    paragraphs: [
      "Entrevistas sin costo para quienes necesiten definir un emplazamiento o un terreno donde construir.",
      "Análisis de posibles desarrollos de negocios inmobiliarios, con análisis de inversión y retorno.",
    ],
  },
  {
    icon: Ruler,
    title: "Anteproyecto",
    paragraphs: [
      "El diseño preliminar se fundamenta en entrevistas con el comitente, donde escuchamos lo que necesita y percibimos lo que quiere transmitirnos: sus preocupaciones, que a veces no se verbalizan.",
      "La propuesta resultante, en gráfica digital en esta instancia, será funcional y estética. La interacción con el cliente irá determinando el diseño definitivo, que lo hará único y especial, a su medida.",
      "Sobre esa base se estima la inversión con cómputo y presupuesto a valores reales de plaza, y se analizan posibles etapas de obra si es necesario.",
    ],
  },
  {
    icon: ClipboardList,
    title: "Proyecto ejecutivo",
    paragraphs: [
      "Abarcamos todas las instancias previas a la ejecución de la obra: planimetrías completas, todas las instalaciones de servicios, detalles constructivos, cálculos estructurales, etc.",
      "Desarrollamos los cómputos de materiales y mano de obra para la posterior gestión de construcción, y las planimetrías y gestiones de permisos de edificación municipal, bomberos, EPE, etc.",
    ],
  },
  {
    icon: HardHat,
    title: "Dirección de obra",
    intro: "A través de nuestra asistencia integral permanente abarcamos:",
    bullets: [
      "La solicitud de presupuestos de mano de obra y materiales de todos los rubros de la obra.",
      "El asesoramiento en la gestión de los contratos de cada rubro.",
      "El control permanente de la calidad de los trabajos, para el buen cumplimiento del proyecto y la durabilidad de la obra en el tiempo.",
      "La coordinación de los rubros y sus tiempos de ejecución según lo planificado, controlando el avance de cada uno con programas específicos.",
      "La verificación de los pagos a los contratistas de acuerdo al avance de la obra contratada.",
      "El acompañamiento en la elección de los materiales y la gestión de su provisión en tiempo y forma.",
    ],
  },
];
