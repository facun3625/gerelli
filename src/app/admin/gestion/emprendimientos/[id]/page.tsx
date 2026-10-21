import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireTenantAdmin } from "@/lib/require-admin";
import { DevelopmentEditor } from "../development-editor";
import { DevelopmentRowActions } from "../development-row-actions";

export default async function EditDevelopmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { tenant } = await requireTenantAdmin();
  const { id } = await params;
  const development = await prisma.estateDevelopment.findUnique({
    where: { id, tenantId: tenant.id },
    include: {
      fields: { orderBy: { order: "asc" } },
      images: { orderBy: { order: "asc" } },
    },
  });
  if (!development) notFound();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Editar emprendimiento</h1>
        <DevelopmentRowActions
          id={id}
          name={development.name}
          showEdit={false}
        />
      </div>
      <DevelopmentEditor
        development={{
          ...development,
          latitude: development.latitude?.toString() ?? null,
          longitude: development.longitude?.toString() ?? null,
        }}
      />
    </div>
  );
}
