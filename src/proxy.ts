import { randomUUID } from "node:crypto";
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "localhost:3010";

// Cookie anónima (sin datos personales) para distinguir visitantes. Cada
// subdominio o dominio propio recibe su propia cookie, por lo que el dato
// queda naturalmente separado entre inmobiliarias.
const VISITOR_COOKIE = "urbi_vid";

function getSubdomain(host: string, rootDomain: string): string | null {
  const cleanHost = host.split(":")[0];
  const cleanRoot = rootDomain.split(":")[0];
  if (cleanHost === cleanRoot || cleanHost === `www.${cleanRoot}`) return null;
  if (!cleanHost.endsWith(`.${cleanRoot}`)) return null;
  const subdomain = cleanHost.slice(0, -`.${cleanRoot}`.length);
  if (!subdomain || subdomain === "www") return null;
  return subdomain;
}

function isRootHost(host: string, rootDomain: string): boolean {
  const cleanHost = host.split(":")[0];
  const cleanRoot = rootDomain.split(":")[0];
  return cleanHost === cleanRoot || cleanHost === `www.${cleanRoot}`;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") ?? "";
  const subdomain = getSubdomain(host, ROOT_DOMAIN);

  const requestHeaders = new Headers(req.headers);
  // Estos headers los pone este proxy y nadie más: los borramos antes de
  // escribirlos porque new Headers(req.headers) copia lo que haya mandado el
  // cliente. Sin esto, en el dominio raíz y en los dominios propios (donde
  // abajo no siempre se sobrescriben) cualquiera podía mandar
  // "x-tenant-subdomain: otra-tienda" y hacerse pasar por esa tienda —
  // getCurrentTenant() lee el subdominio primero, así que el header falso le
  // ganaba incluso al dominio real.
  requestHeaders.delete("x-tenant-subdomain");
  requestHeaders.delete("x-tenant-domain");
  if (subdomain) {
    requestHeaders.set("x-tenant-subdomain", subdomain);
  } else if (host && !isRootHost(host, ROOT_DOMAIN)) {
    // No matchea ni subdominio ni el dominio raíz — puede ser un dominio
    // propio de una tienda (ej: pedidos.mimarca.com). getCurrentTenant()
    // resuelve esto contra Tenant.customDomain, solo si está verificado.
    requestHeaders.set("x-tenant-domain", host.split(":")[0]);
  }
  requestHeaders.set("x-pathname", pathname);

  const existingVisitorId = req.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = existingVisitorId ?? randomUUID();
  if (visitorId) requestHeaders.set("x-visitor-id", visitorId);

  // El manifest y los íconos de la PWA del admin tienen que poder pedirse
  // sin sesión: iOS Safari busca el apple-touch-icon con un mecanismo propio
  // que no manda la cookie — si esto quedara detrás del login, recibe un
  // redirect en vez de la imagen y cae al ícono genérico con la inicial del
  // nombre. No expone nada sensible (nombre y logo ya son públicos en la
  // tienda), así que no hace falta el gate de ADMIN acá.
  const isPublicAdminAsset =
    pathname === "/admin/manifest.webmanifest" ||
    pathname.startsWith("/admin/icon/");
  const isAdminRoute = pathname.startsWith("/admin") && !isPublicAdminAsset;
  const isPlatformRoute =
    pathname.startsWith("/platform") && pathname !== "/platform/login";

  let response: NextResponse;
  if (!isAdminRoute && !isPlatformRoute) {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  } else {
    const user = req.auth?.user;
    if (!user) {
      const loginPath = isPlatformRoute ? "/platform/login" : "/login";
      const loginUrl = new URL(loginPath, req.nextUrl.origin);
      if (!isPlatformRoute) loginUrl.searchParams.set("callbackUrl", pathname);
      response = NextResponse.redirect(loginUrl);
    } else if (isPlatformRoute && user.role !== "SUPER_ADMIN") {
      response = NextResponse.redirect(new URL("/", req.nextUrl.origin));
    } else if (isAdminRoute && user.role !== "ADMIN" && user.role !== "AGENT") {
      response = NextResponse.redirect(new URL("/", req.nextUrl.origin));
    } else {
      response = NextResponse.next({ request: { headers: requestHeaders } });
    }
  }

  if (visitorId && !existingVisitorId) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
});

export const config = {
  // Sin excluir /uploads/ (fotos de producto, logos, favicons subidos por
  // cada tienda) y el resto de los archivos estáticos, el proxy corre
  // sobre ellos igual que sobre cualquier página — la doc de Next.js
  // (proxy.md) avisa exactamente de esto: "auth logic or redirects can
  // unintentionally block CSS, JS, or images from loading".
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|uploads/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|txt|xml)$).*)",
  ],
};
