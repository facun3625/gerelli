import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";

import { prisma } from "@/lib/prisma";

// El adapter de Prisma estándar asume un User global por email y una
// Account global por (provider, providerAccountId) — acá cada tienda
// (tenant) tiene su propio universo de clientes (lo único realmente único
// es tenantId+email, igual que en el login por contraseña), así que
// envolvemos el adapter base para que Google cree y busque usuarios/cuentas
// DENTRO del tenant que originó el login, en vez de mezclar clientes de
// tiendas distintas bajo un mismo usuario.
//
// tenantId === null es un caso válido, no "sin adapter": es el universo de
// urbi.com.ar sin tienda todavía — el mismo que ya usa el super admin, y el
// que ahora también usa alguien registrándose en /registro antes de pagar
// y crear su tienda. Prisma no permite null en la clave compuesta
// tenantId_email (aunque la columna sí lo admite), así que ahí usamos
// findFirst/deleteMany con un filtro simple en vez del atajo de clave
// compuesta — la unicidad para ese caso ya la garantiza la lógica de
// registro (ver /api/auth/register-platform), no hace falta a nivel DB.
export function tenantAwareAdapter(tenantId: string | null): Adapter {
  const base = PrismaAdapter(prisma);

  return {
    ...base,
    createUser: async (data) => {
      return prisma.user.create({ data: { ...data, tenantId } });
    },
    getUserByEmail: async (email) => {
      if (tenantId === null) {
        // El espacio tenantId null mezcla dos cosas que NO deben pisarse:
        // el/los super admin (role SUPER_ADMIN) y quienes se están
        // registrando en /registro todavía sin tienda (role CUSTOMER —
        // "ser revendedor" es tener un código, no un rol aparte, así que
        // un revendedor sin tienda sigue siendo CUSTOMER acá; ver
        // lib/require-reseller.ts). Sin este filtro, alguien logueándose
        // con Google con el mismo email que el super admin terminaría
        // logueado COMO el super admin en vez de arrancar su propio
        // registro.
        return prisma.user.findFirst({
          where: {
            email,
            OR: [
              { tenantId: null, role: "CUSTOMER" },
              { tenantId: { not: null }, role: "ADMIN" },
            ],
          },
          orderBy: { tenantId: "asc" },
        });
      }
      return prisma.user.findUnique({ where: { tenantId_email: { tenantId, email } } });
    },
    getUserByAccount: async ({ provider, providerAccountId }) => {
      const account =
        tenantId === null
          ? await prisma.account.findFirst({
              where: {
                provider,
                providerAccountId,
                OR: [
                  { tenantId: null },
                  { tenantId: { not: null }, user: { role: "ADMIN" } },
                ],
              },
              include: { user: true },
              orderBy: { tenantId: "asc" },
            })
          : await prisma.account.findUnique({
              where: { tenantId_provider_providerAccountId: { tenantId, provider, providerAccountId } },
              include: { user: true },
            });
      return account?.user ?? null;
    },
    linkAccount: async (data) => {
      await prisma.account.create({ data: { ...data, tenantId } });
    },
    unlinkAccount: async ({ provider, providerAccountId }) => {
      if (tenantId === null) {
        await prisma.account.deleteMany({ where: { tenantId: null, provider, providerAccountId } });
        return;
      }
      await prisma.account.delete({
        where: { tenantId_provider_providerAccountId: { tenantId, provider, providerAccountId } },
      });
    },
  };
}
