import path from "node:path";
import sharp from "sharp";

export const ICON_BG = { r: 255, g: 255, b: 255, alpha: 1 };
export const FALLBACK_ICON = path.join(process.cwd(), "public", "favicon2.png");

// Compartido entre el ícono del panel admin y el del storefront: mismo
// resize "contain" para el caso normal, y para maskable el logo va al 60%
// centrado sobre un lienzo sólido (zona segura que los launchers de Android
// no recortan al aplicar la máscara círculo/squircle/gota).
export async function renderIcon(source: string, px: number, maskable: boolean): Promise<Buffer> {
  if (!maskable) {
    return sharp(source).resize(px, px, { fit: "contain", background: ICON_BG }).png().toBuffer();
  }

  const inner = Math.round(px * 0.6);
  const logo = await sharp(source).resize(inner, inner, { fit: "contain", background: ICON_BG }).png().toBuffer();

  return sharp({ create: { width: px, height: px, channels: 4, background: ICON_BG } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
}
