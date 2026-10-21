// Constantes de las tiendas de demostración (ver scripts/seed-estate-demo.ts)
// — un único lugar para los subdominios y las credenciales fijas, reusado
// por el seed, el login simplificado que se muestra solo en esas tiendas, y
// el router de /demo que manda a quien entra a la copia libre.
//
// Son varias copias idénticas, no una sola: la clave de acceso es pública
// (queda escrita en pantalla), así que cualquiera puede entrar en cualquier
// momento — con una sola tienda, dos visitas simultáneas se pisan (uno
// borra lo que el otro está mirando). Con un pool, cada visita nueva cae en
// la copia que lleva más tiempo sin uso.
export const DEMO_SUBDOMAINS = ["demo1", "demo2", "demo3"] as const;
export const DEMO_ADMIN_EMAIL = "demo@urbi.com.ar";
export const DEMO_ADMIN_PASSWORD = "Demo1234!";

// Settings key (por tenant) que registra la última vez que alguien navegó
// el panel de esa copia — así /demo sabe cuál está "libre" hace más tiempo.
export const DEMO_LAST_ACTIVE_KEY = "demo_last_active";

export function isDemoSubdomain(subdomain: string): boolean {
  return (DEMO_SUBDOMAINS as readonly string[]).includes(subdomain);
}
