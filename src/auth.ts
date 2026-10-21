import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";
import { tenantAwareAdapter } from "@/lib/auth-adapter";
import {
  LOGIN_IP_RULE,
  LOGIN_RULE,
  clearFailures,
  clientIp,
  isRateLimited,
  recordFailure,
} from "@/lib/rate-limit";

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "localhost:3010";
const IS_LOCAL = ROOT_DOMAIN.startsWith("localhost");

// Las cookies de state/PKCE/nonce van HOST-ONLY a propósito (sin `domain`
// compartido). Aunque Google siempre vuelve a ROOT_DOMAIN por
// redirectProxyUrl, esas cookies nunca se leen ahí: el proxy saca el
// origen del `state` firmado que viaja en el query string (@auth/core
// lib/actions/callback/index.js) y rebota el navegador al dominio donde
// arrancó el login, que es el único que las lee. O sea, ida y vuelta al
// mismo origen. Forzar `domain: .rootdomain` acá rompía dos casos: en
// local Chromium descarta `Domain=.localhost`, y un dominio propio de
// cliente (tiendacliente.com) no puede setear cookies de otro sitio.
export const { handlers, auth, signIn, signOut } = NextAuth(async (req) => {
  // El subdominio lo pone el middleware (proxy.ts) en todo request, incluido
  // este — así sabemos desde qué tienda arrancó el login sin depender de
  // next/headers (acá no siempre corre dentro de un request de verdad).
  const subdomain = req?.headers.get("x-tenant-subdomain") ?? null;
  const customDomain = req?.headers.get("x-tenant-domain") ?? null;
  const tenant = subdomain
    ? await prisma.tenant.findUnique({ where: { subdomain } })
    : customDomain
      ? await prisma.tenant.findFirst({ where: { customDomain, customDomainVerified: true } })
      : null;

  return {
    ...authConfig,
    // tenantId null es un universo válido (urbi.com.ar sin tienda todavía:
    // super admin, o alguien registrándose en /registro) — nunca "sin
    // adapter", así Google también puede crear/vincular cuentas ahí.
    adapter: tenantAwareAdapter(tenant?.id ?? null),
    // Si Google falla (cuenta ya vinculada de otra forma, etc.), Auth.js
    // redirige a pages.signIn con el error en el query string. /login
    // necesita un tenant real y tira 404 en el dominio raíz — para el
    // registro público (sin subdominio) hay que volver a /registro en su
    // lugar, o el error queda invisible detrás de un 404.
    pages: { ...authConfig.pages, signIn: tenant ? "/login" : "/registro" },
    // Todo el ida y vuelta con Google pasa siempre por ROOT_DOMAIN — un único
    // redirect URI para registrar en Google Cloud Console, sin importar
    // desde qué subdominio de tienda arrancó el login. Auth.js arma un
    // estado firmado para volver al subdominio original una vez que Google
    // confirma.
    redirectProxyUrl: `${IS_LOCAL ? "http" : "https"}://${ROOT_DOMAIN}/api/auth`,
    trustHost: true,
    session: { strategy: "jwt" },
    providers: [
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
      }),
      Credentials({
        name: "credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Contraseña", type: "password" },
          tenantId: { label: "Tenant", type: "text" },
          scope: { label: "Scope", type: "text" },
          token: { label: "Token", type: "text" },
        },
        authorize: async (credentials) => {
          const scope = credentials?.scope as string | undefined;

          // Login automático de un solo uso justo después de crear la
          // tienda en /registro/datos — evita pedirle la contraseña de
          // nuevo apenas la acaba de escribir, y no depende de que Google
          // ande entre subdominios (ver auth-adapter.ts y el comentario de
          // sharedOAuthCookieOptions más arriba).
          if (scope === "magic-token") {
            const token = credentials?.token as string | undefined;
            if (!token) return null;
            const record = await prisma.verificationToken.findUnique({ where: { token } });
            if (!record || record.expires < new Date()) return null;

            // "Entrar como admin" desde /platform/tiendas/[tenantId] — el
            // identifier lleva quién lo pidió, para dejar rastro en la
            // sesión (session.user.impersonatedBy) y que el panel muestre
            // el cartel de modo soporte. Se valida que quien lo pidió siga
            // siendo super admin recién en este momento, no solo cuando se
            // generó el token.
            if (record.identifier.startsWith("impersonate:")) {
              await prisma.verificationToken
                .delete({ where: { identifier_token: { identifier: record.identifier, token } } })
                .catch(() => {});
              const [, superAdminId, targetUserId] = record.identifier.split(":");
              const superAdmin = await prisma.user.findUnique({ where: { id: superAdminId } });
              if (!superAdmin || superAdmin.role !== "SUPER_ADMIN") return null;
              const user = await prisma.user.findUnique({ where: { id: targetUserId } });
              if (!user || !user.tenantId || user.role !== "ADMIN") return null;
              return {
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
                role: user.role,
                tenantId: user.tenantId,
                impersonatedBy: superAdminId,
              };
            }

            if (!record.identifier.startsWith("onboarding:")) return null;
            await prisma.verificationToken
              .delete({ where: { identifier_token: { identifier: record.identifier, token } } })
              .catch(() => {});
            const userId = record.identifier.slice("onboarding:".length);
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user || !user.tenantId) return null;
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              image: user.image,
              role: user.role,
              tenantId: user.tenantId,
            };
          }

          const email = credentials?.email as string | undefined;
          const password = credentials?.password as string | undefined;
          const credentialsTenantId = (credentials?.tenantId as string | undefined) || null;
          if (!email || !password) return null;

          // Freno de fuerza bruta. La key incluye el ámbito y el tenant
          // porque el mismo email puede existir como cliente de una tienda,
          // dueño de otra y super admin — bloquear uno no tiene por qué
          // bloquear los demás.
          const scopeKey = scope ?? (credentialsTenantId ? `tenant:${credentialsTenantId}` : "unknown");
          const accountKey = `login:${scopeKey}:${email.toLowerCase()}`;
          const ipKey = `login-ip:${clientIp(req?.headers ?? new Headers())}`;
          const [accountBlocked, ipBlocked] = await Promise.all([
            isRateLimited(accountKey, LOGIN_RULE),
            isRateLimited(ipKey, LOGIN_IP_RULE),
          ]);
          // Se devuelve null (igual que una contraseña incorrecta) en vez de
          // un error propio: decir "estás bloqueado" le confirmaría al
          // atacante que la cuenta existe y que va por buen camino.
          if (accountBlocked || ipBlocked) return null;

          const user = scope === "platform"
            ? await prisma.user.findFirst({
                where: { email, tenantId: null, role: "SUPER_ADMIN" },
              })
            : scope === "urbi-account"
              // La cuenta central de urbi.com.ar admite al dueño aunque su
              // User ya pertenezca a una tienda. Esa sesión queda en el
              // dominio raíz; desde /mi-cuenta se genera el pase efímero al
              // subdominio solo cuando el usuario elige entrar a su tienda.
              ? await prisma.user.findFirst({
                  where: {
                    email,
                    OR: [
                      { role: "ADMIN", tenantId: { not: null } },
                      { role: "SUPER_ADMIN", tenantId: null },
                      { role: { in: ["CUSTOMER", "RESELLER"] }, tenantId: null },
                    ],
                  },
                })
            : credentialsTenantId
              ? await prisma.user.findUnique({
                  where: { tenantId_email: { tenantId: credentialsTenantId, email } },
                })
              : scope === "onboarding"
                // Alguien registrándose en urbi.com.ar todavía sin tienda —
                // ver /registro y lib/require-onboarding.ts. Un revendedor
                // sin tienda propia sigue siendo CUSTOMER acá (ser
                // revendedor es tener un código, no un rol aparte — ver
                // lib/require-reseller.ts), así que entra por el mismo
                // login sin necesitar un scope propio.
                ? await prisma.user.findFirst({
                    where: { email, tenantId: null, role: "CUSTOMER" },
                  })
                : null;
          if (user?.role === "AGENT" && !(await prisma.estateAgent.findFirst({ where: { userId: user.id, tenantId: user.tenantId ?? "", accessEnabled: true } }))) return null;
          if (!user?.passwordHash) {
            await Promise.all([recordFailure(accountKey), recordFailure(ipKey)]);
            return null;
          }

          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) {
            await Promise.all([recordFailure(accountKey), recordFailure(ipKey)]);
            return null;
          }

          // Entró bien: se borra el historial para que los errores previos
          // no se le acumulen a alguien que simplemente se equivocó al tipear.
          await clearFailures(accountKey);

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
            tenantId: user.tenantId,
          };
        },
      }),
    ],
  };
});
