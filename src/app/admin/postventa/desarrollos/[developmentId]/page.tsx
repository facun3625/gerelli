import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requirePostSaleStaff } from "@/lib/require-post-sale-admin";
import { DevelopmentUnitsEditor } from "@/components/estate/post-sale-units-editor";
import { addOwnerToUnit, removeOwnerFromUnit } from "../actions";

export default async function PostSaleDevelopmentUnitsPage({
  params,
}: {
  params: Promise<{ developmentId: string }>;
}) {
  const { developmentId } = await params;
  const { tenant, assignedDevelopmentIds } = await requirePostSaleStaff();
  if (assignedDevelopmentIds && !assignedDevelopmentIds.includes(developmentId)) notFound();

  const development = await prisma.postSaleDevelopment.findFirst({
    where: { id: developmentId, tenantId: tenant.id },
    include: {
      units: {
        orderBy: { label: "asc" },
        include: { members: { include: { contact: true } } },
      },
    },
  });
  if (!development) notFound();

  const units = development.units.map((u) => ({
    id: u.id,
    label: u.label,
    floor: u.floor,
    owners: u.members.map((m) => ({
      membershipId: m.id,
      contactId: m.contactId,
      name: m.contact.name,
      taxId: m.contact.taxId,
    })),
  }));

  return (
    <DevelopmentUnitsEditor
      units={units}
      addOwnerAction={addOwnerToUnit}
      removeOwnerAction={removeOwnerFromUnit.bind(null, developmentId)}
    />
  );
}
