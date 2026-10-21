import { requireTenantAdmin } from "@/lib/require-admin";
import { DevelopmentEditor } from "../development-editor";

export default async function NewDevelopmentPage() {
  await requireTenantAdmin();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Nuevo emprendimiento</h1>
      <DevelopmentEditor />
    </div>
  );
}
