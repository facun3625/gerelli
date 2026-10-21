"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { useConfirm } from "@/components/admin/confirm-provider";
import { deleteManager } from "@/app/admin/postventa/administradores/actions";

export function PostSaleManagerDeleteButton({ id, name }: { id: string; name: string }) {
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function remove() {
    const accepted = await confirm({
      title: "Eliminar administrador",
      description: `¿Querés eliminar a "${name}"? Se quitan sus desarrollos asignados. Si tenía acceso, su cuenta de login queda sin vincular.`,
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!accepted) return;
    startTransition(async () => {
      const result = await deleteManager(id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Administrador eliminado");
      router.push("/admin/postventa/administradores");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={remove}
      className="rounded-lg border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
    >
      <Trash2Icon className="mr-1.5 inline size-4" />
      Eliminar administrador
    </button>
  );
}
