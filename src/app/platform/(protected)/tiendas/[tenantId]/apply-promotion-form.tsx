"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { applyPromotionToTenant } from "./actions";

export function ApplyPromotionForm({ tenantId, hasRedemption }: { tenantId: string; hasRedemption: boolean }) {
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const actionResult = await applyPromotionToTenant(tenantId, code);
        if ("error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        toast.success("Código aplicado");
        setCode("");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo aplicar el código");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Código promocional"
        className="w-48"
        disabled={pending}
      />
      <Button type="submit" variant="outline" size="sm" disabled={pending || !code.trim()}>
        {pending ? "Aplicando..." : hasRedemption ? "Reemplazar código" : "Aplicar código"}
      </Button>
    </form>
  );
}
