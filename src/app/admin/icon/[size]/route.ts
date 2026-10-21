import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentTenant } from "@/lib/tenant";
import { getStoreSettings } from "@/lib/settings";
import { renderIcon, FALLBACK_ICON } from "@/lib/tenant-icon";

// logoUrl siempre es un path local /uploads/... (todo pasa por
// saveUploadedFile en lib/storage.ts) — si algún día se permite pegar una
// URL externa, esto rompe en silencio y cae al ícono de Urbi por defecto.
//
// A propósito SIN requireTenantAdmin(): src/proxy.ts deja pasar esta ruta
// sin sesión (ver isPublicAdminAsset ahí) porque iOS Safari busca el
// apple-touch-icon con un mecanismo propio que no manda la cookie — el
// nombre y el logo de la tienda ya son públicos en la tienda, no hace
// falta exigir login para esto.
export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const tenant = await getCurrentTenant();
  if (!tenant) return new NextResponse("Tienda no encontrada", { status: 404 });
  const { size: rawSize } = await params;

  const isMaskable = rawSize.endsWith("-maskable");
  const px = parseInt(isMaskable ? rawSize.replace("-maskable", "") : rawSize, 10);
  if (!Number.isFinite(px) || px <= 0 || px > 1024) {
    return new NextResponse("Tamaño inválido", { status: 400 });
  }

  const { logoUrl } = await getStoreSettings(tenant.id);
  const source = logoUrl ? path.join(process.cwd(), "public", logoUrl) : FALLBACK_ICON;

  let png: Buffer;
  try {
    png = await renderIcon(source, px, isMaskable);
  } catch {
    png = await renderIcon(FALLBACK_ICON, px, isMaskable);
  }

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
