"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminTheme } from "@/components/admin/admin-theme-root";
import { TENANT_CATEGORY_LABELS } from "@/lib/tenant-category";
import { setTenantCategory } from "./[tenantId]/actions";

export function TenantCategorySelect({
  tenantId,
  category,
}: {
  tenantId: string;
  category: "CLIENTE" | "DEMO" | "PROMOCION";
}) {
  const { containerRef } = useAdminTheme();
  const [pending, startTransition] = useTransition();

  return (
    <Select
      items={Object.entries(TENANT_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
      value={category}
      onValueChange={(v) =>
        startTransition(async () => {
          const result = await setTenantCategory(tenantId, v as never);
          if ("error" in result) toast.error(result.error);
        })
      }
      disabled={pending}
    >
      <SelectTrigger size="sm" className="w-auto">
        <SelectValue />
      </SelectTrigger>
      <SelectContent container={containerRef} alignItemWithTrigger={false}>
        {Object.entries(TENANT_CATEGORY_LABELS).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
