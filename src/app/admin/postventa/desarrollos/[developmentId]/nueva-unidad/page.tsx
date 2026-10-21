import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requirePostSaleStaff } from "@/lib/require-post-sale-admin";
import { NewUnitForm } from "@/components/estate/post-sale-new-unit-form";
import { createUnit } from "../../actions";

export default async function NewPostSaleUnitPage({
  params,
}: {
  params: Promise<{ developmentId: string }>;
}) {
  const { developmentId } = await params;
  const { tenant, assignedDevelopmentIds } = await requirePostSaleStaff();
  if (assignedDevelopmentIds && !assignedDevelopmentIds.includes(developmentId)) notFound();
  const development = await prisma.postSaleDevelopment.findFirst({
    where: { id: developmentId, tenantId: tenant.id },
    select: { id: true },
  });
  if (!development) notFound();

  return (
    <div className="space-y-3">
      <h2 className="font-semibold">Agregar unidad</h2>
      <NewUnitForm action={createUnit.bind(null, developmentId)} />
    </div>
  );
}
