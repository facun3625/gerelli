"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { overrideCustomDomain } from "./actions";

export function CustomDomainOverrideForm({
  tenantId,
  customDomain,
  customDomainVerified,
}: {
  tenantId: string;
  customDomain: string | null;
  customDomainVerified: boolean;
}) {
  const [domain, setDomain] = useState(customDomain ?? "");
  const [verified, setVerified] = useState(customDomainVerified);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const formData = new FormData();
      formData.set("customDomain", domain.trim());
      if (verified) formData.set("verified", "on");
      const result = await overrideCustomDomain(tenantId, formData);
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Dominio actualizado");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <Input
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="pedidos.mimarca.com"
        className="w-56"
        disabled={pending}
      />
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Checkbox checked={verified} onCheckedChange={(v) => setVerified(v === true)} disabled={pending} />
        Verificado
      </label>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Guardando..." : "Guardar dominio"}
      </Button>
      {customDomain && (
        <Badge variant={customDomainVerified ? "default" : "secondary"} className="text-[0.65rem]">
          Actual: {customDomain} · {customDomainVerified ? "Verificado" : "Pendiente"}
        </Badge>
      )}
    </form>
  );
}
