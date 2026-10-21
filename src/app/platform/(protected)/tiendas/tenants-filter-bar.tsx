"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SearchIcon, XIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAdminTheme } from "@/components/admin/admin-theme-root";
import { BILLING_STATUS_LABELS } from "@/lib/billing-status";
import { TENANT_CATEGORY_LABELS } from "@/lib/tenant-category";

export function TenantsFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { containerRef } = useAdminTheme();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = setTimeout(() => updateParam("q", q || null), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasFilters = ["q", "billing", "category"].some((k) => searchParams.get(k));

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por subdominio..."
          className="bg-background pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          items={[
            { value: "all", label: "Todas las tiendas" },
            ...Object.entries(BILLING_STATUS_LABELS).map(([value, label]) => ({ value, label })),
          ]}
          value={searchParams.get("billing") ?? "all"}
          onValueChange={(v) => updateParam("billing", v === "all" ? null : String(v))}
        >
          <SelectTrigger size="sm" className="bg-background">
            <SelectValue placeholder="Facturación" />
          </SelectTrigger>
          <SelectContent container={containerRef} alignItemWithTrigger={false}>
            <SelectItem value="all">Todas las tiendas</SelectItem>
            {Object.entries(BILLING_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={[
            { value: "all", label: "Todas las categorías" },
            ...Object.entries(TENANT_CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
          ]}
          value={searchParams.get("category") ?? "all"}
          onValueChange={(v) => updateParam("category", v === "all" ? null : String(v))}
        >
          <SelectTrigger size="sm" className="bg-background">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent container={containerRef} alignItemWithTrigger={false}>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {Object.entries(TENANT_CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={() => { setQ(""); router.push(pathname); }}>
            <XIcon className="size-3.5" />
            Limpiar
          </Button>
        )}
      </div>
    </div>
  );
}
