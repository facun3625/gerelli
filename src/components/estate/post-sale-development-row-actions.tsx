"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { useConfirm } from "@/components/admin/confirm-provider";
import { deleteDevelopment } from "@/app/admin/postventa/desarrollos/actions";

export function PostSaleDevelopmentRowActions({ id, name }: { id: string; name: string }) {
  const confirm = useConfirm();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function remove() {
    const accepted = await confirm({
      title: "Eliminar desarrollo",
      description: `¿Querés eliminar "${name}"? Se borran sus unidades y reclamos. Los propietarios no se borran — si tienen unidades en otro desarrollo, siguen ahí.`,
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!accepted) return;
    startTransition(async () => {
      const result = await deleteDevelopment(id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Desarrollo eliminado");
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
