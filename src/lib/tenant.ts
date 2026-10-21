import { cache } from "react";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export const getCurrentTenant = cache(async () => {
  const hdrs = await headers();
  const subdomain = hdrs.get("x-tenant-subdomain");
  if (subdomain) return prisma.tenant.findUnique({ where: { subdomain } });

  const customDomain = hdrs.get("x-tenant-domain");
  if (customDomain) {
    return prisma.tenant.findFirst({ where: { customDomain, customDomainVerified: true } });
  }

  return null;
});
