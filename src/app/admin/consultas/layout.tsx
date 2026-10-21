import { notFound } from "next/navigation";

import { requireTenantAdminWithPlan } from "@/lib/require-admin";

export default async function ConsultasLayout({ children }: { children: React.ReactNode }) {
  const { features } = await requireTenantAdminWithPlan();
  if (!features.allowServices) notFound();
  return children;
}
