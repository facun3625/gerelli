"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { DEMO_SUBDOMAINS, DEMO_LAST_ACTIVE_KEY } from "@/lib/demo";

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "localhost:3010";

export type DemoState = { error: string };

const emailSchema = z.string().trim().toLowerCase().email("Ingresá un email válido.");

// Reparte a quien entra hacia la copia (de DEMO_SUBDOMAINS, ver
// scripts/seed-demo-pizzeria.ts) que lleva más tiempo sin uso, así dos
// visitas al mismo tiempo no se pisan entre sí — y loguea directo como su
// admin, sin pedir usuario ni clave. El email se guarda antes de nada: es
// el único dato de contacto que dejamos de alguien que solo mira la demo.
export async function startDemoSession(_prev: DemoState, formData: FormData): Promise<DemoState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ingresá un email válido." };
  const email = parsed.data;

  const tenants = await prisma.tenant.findMany({
    where: { subdomain: { in: [...DEMO_SUBDOMAINS] } },
    select: {
      id: true,
      subdomain: true,
      users: { where: { role: "ADMIN" }, orderBy: { createdAt: "asc" }, take: 1, select: { id: true } },
    },
  });
  if (tenants.length === 0) return { error: "La demo no está configurada todavía." };

  const lastActiveByTenant = await prisma.settings.findMany({
    where: { tenantId: { in: tenants.map((t) => t.id) }, key: DEMO_LAST_ACTIVE_KEY },
    select: { tenantId: true, value: true },
  });
  const lastActiveMap = new Map(lastActiveByTenant.map((s) => [s.tenantId, s.value]));

  // La que nunca se usó (sin fila) es la más "libre" de todas — ordena antes
  // que cualquier timestamp real.
  const chosen = [...tenants].sort((a, b) => {
    const aTime = lastActiveMap.get(a.id) ?? "";
    const bTime = lastActiveMap.get(b.id) ?? "";
    return aTime.localeCompare(bTime);
  })[0];

  const admin = chosen.users[0];
  if (!admin) return { error: "Esa copia de la demo no tiene admin — correr el seed de nuevo." };

  const [token] = await prisma.$transaction([
    prisma.verificationToken.create({
      data: {
        identifier: `onboarding:${admin.id}`,
        token: randomBytes(32).toString("hex"),
        expires: new Date(Date.now() + 5 * 60 * 1000),
      },
      select: { token: true },
    }),
    // Se marca "ocupada" ya mismo, no recién cuando cargue /admin — evita
    // que una segunda visita a los pocos segundos caiga en la misma copia.
    prisma.settings.upsert({
      where: { tenantId_key: { tenantId: chosen.id, key: DEMO_LAST_ACTIVE_KEY } },
      update: { value: new Date().toISOString() },
      create: { tenantId: chosen.id, key: DEMO_LAST_ACTIVE_KEY, value: new Date().toISOString() },
    }),
    prisma.demoVisit.create({ data: { email, subdomain: chosen.subdomain } }),
  ]);

  const protocol = ROOT_DOMAIN.startsWith("localhost") ? "http" : "https";
  const url = `${protocol}://${chosen.subdomain}.${ROOT_DOMAIN}/login?token=${token.token}&callbackUrl=%2Fadmin`;
  redirect(url);
}
