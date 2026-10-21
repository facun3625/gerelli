export const AGENT_ACCESS_SCOPES = ["NONE", "OWN", "ALL"] as const;
export type AgentAccessScope = (typeof AGENT_ACCESS_SCOPES)[number];

export const AGENT_MENU_SECTIONS = [
  { key: "summary", title: "Resumen", description: "Panel principal", href: "/admin" },
  { key: "properties", title: "Propiedades", description: "Cartera y publicaciones", href: "/admin/gestion/propiedades" },
  { key: "contacts", title: "Clientes y contactos", description: "Agenda comercial", href: "/admin/gestion/clientes" },
  { key: "agents", title: "Agentes", description: "Equipo de la inmobiliaria", href: "/admin/gestion/agentes" },
  { key: "inquiries", title: "Consultas inmobiliarias", description: "Consultas por propiedades, generales y asistidas por IA.", href: "/admin/gestion/consultas", scoped: true },
  { key: "searches", title: "Búsquedas guardadas", description: "Solicitudes de búsqueda y alertas del sitio.", href: "/admin/gestion/busquedas", scoped: true },
  { key: "visits", title: "Agenda de visitas", description: "Visitas y resultados", href: "/admin/gestion/visitas" },
  { key: "operations", title: "Operaciones", description: "Negociaciones, reservas y cierres", href: "/admin/gestion/operaciones" },
  { key: "appraisals", title: "Tasaciones", description: "Solicitudes y valoraciones", href: "/admin/gestion/tasaciones" },
  { key: "contracts", title: "Contratos", description: "Contratos y documentación", href: "/admin/gestion/contratos" },
  { key: "collections", title: "Cobranzas", description: "Cargos, pagos y recibos", href: "/admin/gestion/cobranzas" },
  { key: "developments", title: "Emprendimientos", description: "Proyectos inmobiliarios", href: "/admin/gestion/emprendimientos" },
  { key: "developmentInquiries", title: "Consultas de emprendimientos", description: "Consultas de proyectos", href: "/admin/gestion/consultas-emprendimientos" },
  { key: "services", title: "Servicios", description: "Servicios publicados", href: "/admin/servicios" },
  { key: "serviceInquiries", title: "Consultas de servicios", description: "Consultas sobre servicios", href: "/admin/consultas" },
  { key: "website", title: "Página web", description: "Contenido del sitio", href: "/admin/pagina" },
  { key: "statistics", title: "Estadísticas", description: "Métricas de la inmobiliaria", href: "/admin/estadisticas" },
  { key: "users", title: "Usuarios", description: "Usuarios de la cuenta", href: "/admin/usuarios" },
  { key: "settings", title: "Configuración", description: "Ajustes de la inmobiliaria", href: "/admin/configuracion" },
] as const;

export type AgentSectionKey = (typeof AGENT_MENU_SECTIONS)[number]["key"];
export type AgentPermissions = Record<AgentSectionKey, AgentAccessScope>;

export const DEFAULT_AGENT_PERMISSIONS: AgentPermissions = {
  inquiries: "OWN",
  searches: "OWN",
  summary: "NONE",
  properties: "NONE",
  contacts: "NONE",
  agents: "NONE",
  visits: "NONE",
  operations: "NONE",
  appraisals: "NONE",
  contracts: "NONE",
  collections: "NONE",
  developments: "NONE",
  developmentInquiries: "NONE",
  services: "NONE",
  serviceInquiries: "NONE",
  website: "NONE",
  statistics: "NONE",
  users: "NONE",
  settings: "NONE",
};
