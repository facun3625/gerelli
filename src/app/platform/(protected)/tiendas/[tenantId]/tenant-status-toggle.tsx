"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setTenantStatus } from "./actions";

export function TenantStatusToggle({
  tenantId,
  status,
}: {
  tenantId: string;
  status: "ACTIVE" | "SUSPENDED";
}) {
  const [pending, startTransition] = useTransition();
  const nextStatus = status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

  return (
    <Button
      type="button"
      variant={status === "ACTIVE" ? "outline" : "default"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await setTenantStatus(tenantId, nextStatus);
          if ("error" in result) toast.error(result.error);
        })
      }
    >
      {status === "ACTIVE" ? "Suspender tienda" : "Reactivar tienda"}
    </Button>
  );
}
