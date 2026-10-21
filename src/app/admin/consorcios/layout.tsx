import { notFound } from "next/navigation";

import { requireTenantAdminWithPlan } from "@/lib/require-admin";

export default async function ConsortiumLayout({ children }: { children: React.ReactNode }) {
  const { features } = await requireTenantAdminWithPlan();
  if (!features.allowConsortium) notFound();
  return children;
}
