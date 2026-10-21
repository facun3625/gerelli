"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminTheme } from "@/components/admin/admin-theme-root";
import { DATE_RANGE_LABELS, type DateRangePreset } from "@/lib/date-range";

export function TrafficFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { containerRef } = useAdminTheme();

  const preset = (searchParams.get("range") as DateRangePreset) || "30d";

  function updateParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Select
        items={Object.entries(DATE_RANGE_LABELS).map(([value, label]) => ({ value, label }))}
        value={preset}
        onValueChange={(v) => updateParams({ range: String(v), from: null, to: null })}
      >
        {/* Ancho mínimo fijo, no "w-fit": el popup toma el ancho del
            trigger, y si el valor elegido es corto (ej. "Hoy") el menú
            queda demasiado angosto para "Rango personalizado" y ese texto
            se corta (el popup tiene overflow-x-hidden, sin scroll). */}
        <SelectTrigger size="sm" className="w-48 min-w-48 bg-background">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent container={containerRef} alignItemWithTrigger={false}>
          {Object.entries(DATE_RANGE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === "custom" && (
        <>
          <div className="flex flex-col gap-1">
            <Label htmlFor="traffic-from" className="text-xs text-muted-foreground">
              Desde
            </Label>
            <Input
              id="traffic-from"
              type="date"
              defaultValue={searchParams.get("from") ?? ""}
              onChange={(e) => updateParams({ from: e.target.value || null })}
              className="h-9 bg-background"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="traffic-to" className="text-xs text-muted-foreground">
              Hasta
            </Label>
            <Input
              id="traffic-to"
              type="date"
              defaultValue={searchParams.get("to") ?? ""}
              onChange={(e) => updateParams({ to: e.target.value || null })}
              className="h-9 bg-background"
            />
          </div>
        </>
      )}
    </div>
  );
}
