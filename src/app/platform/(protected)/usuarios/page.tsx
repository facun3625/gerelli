import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { UsersTable } from "./users-table";

export default async function UsuariosPage() {
  await requireSuperAdmin();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      referralCode: true,
      resellerDeactivatedAt: true,
      tenant: { select: { id: true, subdomain: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Usuarios</h1>
        <p className="text-sm text-muted-foreground">
          {users.length} {users.length === 1 ? "cuenta" : "cuentas"} — buscá y segmentá por los servicios que tiene cada una.
        </p>
      </div>
      <UsersTable users={users.map((user) => ({
        ...user,
        createdAt: user.createdAt.toISOString(),
        resellerDeactivatedAt: user.resellerDeactivatedAt?.toISOString() ?? null,
      }))} />
    </div>
  );
}
