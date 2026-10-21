"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/admin/confirm-provider";
import { deleteTenant } from "./actions";

export function DeleteTenantButton({ tenantId, subdomain }: { tenantId: string; subdomain: string }) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const router = useRouter();

  async function handleClick() {
    const ok = await confirm({
      title: `¿Borrar "${subdomain}" para siempre?`,
      description:
        "Se elimina la inmobiliaria con absolutamente todo lo que contiene: productos, pedidos, clientes, historial de pagos y comisiones generadas por sus cobros. No se puede deshacer.",
      confirmLabel: "Sí, borrar todo",
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        const actionResult = await deleteTenant(tenantId);
        if ("error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        toast.success(`"${subdomain}" fue borrada`);
        router.push("/platform/tiendas");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo borrar la inmobiliaria");
      }
    });
  }

  return (
    <Button type="button" variant="destructive" disabled={pending} onClick={handleClick}>
      {pending ? "Borrando..." : "Borrar tienda"}
    </Button>
  );
}
