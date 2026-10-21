// Diagnóstico: recorre toda la base buscando URLs de /uploads/ que no
// tienen su archivo correspondiente en disco — el mismo síntoma que ya
// viste en un servicio y un producto. No borra ni cambia nada, solo
// informa. Correr en el servidor (o en local, apunta a la base que diga
// el .env de la carpeta desde donde se corre):
//
//   node --env-file=.env node_modules/.bin/tsx check-broken-uploads.ts
//
// Al terminar, borrar este archivo (no es parte de la app).

import { existsSync } from "node:fs";
import path from "node:path";
import { prisma } from "./src/lib/prisma";

const PUBLIC_ROOT = path.join(process.cwd(), "public");

function isBroken(url: string | null): boolean {
  if (!url || !url.startsWith("/uploads/")) return false;
  return !existsSync(path.join(PUBLIC_ROOT, url));
}

type Broken = { type: string; tienda: string; label: string; url: string };

async function main() {
  const broken: Broken[] = [];

  const productImages = await prisma.productImage.findMany({
    include: { product: { select: { name: true, tenant: { select: { subdomain: true } } } } },
  });
  for (const img of productImages) {
    if (isBroken(img.url)) {
      broken.push({ type: "Producto", tienda: img.product.tenant.subdomain, label: img.product.name, url: img.url });
    }
  }

  const serviceImages = await prisma.serviceImage.findMany({
    include: { service: { select: { title: true, tenant: { select: { subdomain: true } } } } },
  });
  for (const img of serviceImages) {
    if (isBroken(img.url)) {
      broken.push({ type: "Servicio", tienda: img.service.tenant.subdomain, label: img.service.title, url: img.url });
    }
  }

  const aboutMedia = await prisma.aboutMedia.findMany({
    include: { tenant: { select: { subdomain: true } } },
  });
  for (const m of aboutMedia) {
    if (isBroken(m.url)) {
      broken.push({ type: "Sobre nosotros", tienda: m.tenant.subdomain, label: m.type, url: m.url });
    }
  }

  const settingsImages = await prisma.settings.findMany({
    where: { key: { in: ["store_logo_url", "store_cover_url", "store_favicon_url", "seo_og_image_url"] } },
    include: { tenant: { select: { subdomain: true } } },
  });
  for (const s of settingsImages) {
    if (isBroken(s.value)) {
      broken.push({ type: "Config. de tienda", tienda: s.tenant.subdomain, label: s.key, url: s.value });
    }
  }

  const users = await prisma.user.findMany({
    where: { image: { not: null } },
    select: { name: true, email: true, image: true, tenant: { select: { subdomain: true } } },
  });
  for (const u of users) {
    if (isBroken(u.image)) {
      broken.push({ type: "Foto de perfil", tienda: u.tenant?.subdomain ?? "(sin tienda)", label: u.name ?? u.email, url: u.image! });
    }
  }

  if (broken.length === 0) {
    console.log("Ninguna imagen rota — todo lo que hay en la base existe en el disco.");
  } else {
    console.log(`${broken.length} imagen(es) rota(s):\n`);
    for (const b of broken) {
      console.log(`[${b.type}] ${b.tienda} — ${b.label} — ${b.url}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
