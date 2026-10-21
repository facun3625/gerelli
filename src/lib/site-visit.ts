import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/rate-limit";

// Contador de tráfico del sitio de marketing — se llama desde cada página
// pública (no de un tenant). Se descarta el prefetch de <Link> (Next manda
// ese header en esos pedidos) para no inflar el número con hovers que
// nunca se convierten en una visita real. Fire-and-forget: no debe sumarle
// latencia a la página ni romperla si la base falla.
//
// visitorId sale de la cookie anónima que pone proxy.ts (x-visitor-id) —
// permite contar "visitantes distintos" además de "visitas totales". ip
// se usa solo para país/ciudad (lib/ip-geo.ts, base local, nunca sale del
// servidor) — es el único dato de acá que identifica de verdad.
export async function trackSiteVisit(path: string): Promise<void> {
  const hdrs = await headers();
  if (hdrs.get("next-router-prefetch")) return;

  prisma.siteVisit
    .create({
      data: {
        path,
        referrer: hdrs.get("referer") || null,
        userAgent: hdrs.get("user-agent") || null,
        visitorId: hdrs.get("x-visitor-id") || null,
        ip: clientIp(hdrs),
      },
    })
    .catch(() => {});
}
