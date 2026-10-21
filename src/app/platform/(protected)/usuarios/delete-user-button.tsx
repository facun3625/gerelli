"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/admin/confirm-provider";
import { deleteUserAccount } from "./actions";

export function DeleteUserButton({
  userId,
  label,
  hasStore,
  isReseller,
}: {
  userId: string;
  label: string;
  hasStore: boolean;
  isReseller: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();
  const router = useRouter();

  async function handleClick() {
    const extra = [
      hasStore && "su tienda con todo lo que contiene (productos, pedidos, todo)",
      isReseller && "su historial de comisiones como revendedor",
    ].filter(Boolean) as string[];

    const ok = await confirm({
      title: `¿Borrar la cuenta de "${label}"?`,
      description:
        extra.length > 0
          ? `Se borra la cuenta y también ${extra.join(" y ")}. No se puede deshacer.`
          : "Se borra la cuenta. No se puede deshacer.",
      confirmLabel: "Sí, borrar todo",
      destructive: true,
    });
    if (!ok) return;

    startTransition(async () => {
      try {
        const actionResult = await deleteUserAccount(userId);
        if (actionResult && "error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        toast.success(`Cuenta de "${label}" borrada`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo borrar la cuenta");
      }
    });
  }

  return (
    <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={pending} onClick={handleClick}>
      {pending ? "Borrando..." : "Borrar"}
    </Button>
  );
}
