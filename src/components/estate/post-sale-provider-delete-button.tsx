"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { useConfirm } from "@/components/admin/confirm-provider";
import { deleteProvider } from "@/app/admin/postventa/proveedores/actions";

export function PostSaleProviderDeleteButton({ id, name }: { id: string; name: string }) {
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function remove() {
    const accepted = await confirm({
      title: "Eliminar proveedor",
      description: `¿Querés eliminar a "${name}"? Los reclamos que tenía derivados quedan sin proveedor asignado.`,
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!accepted) return;
    startTransition(async () => {
      const result = await deleteProvider(id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Proveedor eliminado");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={remove}
      className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      aria-label={`Eliminar ${name}`}
    >
      <Trash2Icon className="size-4" />
    </button>
  );
}
