import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "localhost:3010";

export async function GET(request: NextRequest) {
  // En desarrollo y detrás de algunos proxies, request.nextUrl trae el host
  // interno del servidor (localhost) aunque el navegador esté realmente en
  // asdf.localhost o en un dominio propio. Los headers conservan el origen
  // real, igual que en api/auth/[...nextauth]/route.ts.
  const realHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const realProtocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const realOrigin = `${realProtocol}://${realHost}`;
  const requestedReturn = request.nextUrl.searchParams.get("returnTo");
  let returnTo = realOrigin;

  // Solo permitimos volver al mismo origen que inició el cierre. Evita que
  // este endpoint se convierta en un redirect abierto hacia otro sitio.
  if (requestedReturn) {
    try {
      const parsed = new URL(requestedReturn);
      if (parsed.origin === realOrigin) returnTo = parsed.origin;
    } catch {
      // Un destino inválido simplemente vuelve al origen actual.
    }
  }

  const protocol = ROOT_DOMAIN.startsWith("localhost") ? "http" : "https";
  const rootOrigin = `${protocol}://${ROOT_DOMAIN}`;
  const rootClear = new URL("/api/auth/logout-local", rootOrigin);
  rootClear.searchParams.set("next", returnTo);

  const requestHost = realHost;
  const rootHost = new URL(rootOrigin).host;
  if (requestHost !== rootHost && requestHost !== `www.${rootHost}`) {
    const localLogout = new URL("/api/auth/logout-local", realOrigin);
    localLogout.searchParams.set("next", rootClear.toString());
    return NextResponse.redirect(localLogout);
  }

  const session = await auth();
  if (session?.user?.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { subdomain: true },
    });
    if (tenant) {
      const tenantOrigin = `${protocol}://${tenant.subdomain}.${ROOT_DOMAIN}`;
      const localLogout = new URL("/api/auth/logout-local", tenantOrigin);
      localLogout.searchParams.set("next", rootClear.toString());
      return NextResponse.redirect(localLogout);
    }
  }

  return NextResponse.redirect(rootClear);
}
