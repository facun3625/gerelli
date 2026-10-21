import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requirePostSaleStaff } from "@/lib/require-post-sale-admin";
import { PostSaleImportForm } from "@/components/estate/post-sale-import-form";
import { importPostSaleUnits, previewPostSaleImport } from "../import-actions";

export default async function ImportPostSaleUnitsPage({
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
      <h2 className="font-semibold">Agregar unidades</h2>
      <PostSaleImportForm
        previewAction={previewPostSaleImport.bind(null, developmentId)}
        importAction={importPostSaleUnits.bind(null, developmentId)}
      />
    </div>
  );
}
