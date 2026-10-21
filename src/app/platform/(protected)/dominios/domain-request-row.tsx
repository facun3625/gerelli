"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminTheme } from "@/components/admin/admin-theme-root";
import { setDomainRequestStatus } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En trámite",
  DONE: "Resuelto",
};

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });

export function DomainRequestRow({
  request,
}: {
  request: {
    id: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string | null;
    domainOptions: string[];
    notes: string | null;
    status: string;
    createdAt: string;
    tenant: { subdomain: string; storeName: string };
  };
}) {
  const { containerRef } = useAdminTheme();
  const [pending, startTransition] = useTransition();

  function changeStatus(status: string) {
    startTransition(async () => {
      try {
        await setDomainRequestStatus(request.id, status as "PENDING" | "IN_PROGRESS" | "DONE");
        toast.success("Estado actualizado");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo actualizar");
      }
    });
  }

  return (
    <article className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{request.tenant.storeName}</span>
            <span className="text-xs text-muted-foreground">({request.tenant.subdomain})</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {request.contactName} · {request.contactEmail}
            {request.contactPhone ? ` · ${request.contactPhone}` : ""}
          </p>
        </div>
        <Select value={request.status} onValueChange={(v) => changeStatus(String(v))} disabled={pending}>
          <SelectTrigger className="w-40 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent container={containerRef}>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {request.domainOptions.map((d, i) => (
          <span key={d} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
            {i + 1}. {d}
          </span>
        ))}
      </div>

      {request.notes && <p className="text-sm text-muted-foreground">{request.notes}</p>}

      <p className="text-xs text-muted-foreground">Pedido el {dateFormatter.format(new Date(request.createdAt))}</p>
    </article>
  );
}
