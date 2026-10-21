"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  publishToMercadoLibre,
  pauseMercadoLibreListing,
  reactivateMercadoLibreListing,
  closeMercadoLibreListing,
} from "./mercadolibre-actions";

export type MlListingSummary = {
  id: string;
  operation: string;
  mlItemId: string | null;
  mlPermalink: string | null;
  mlStatus: string | null;
  mlLastError: string | null;
  mlLastSyncedAt: string | null;
};

const OPERATION_LABELS: Record<string, string> = { SALE: "Venta", RENT: "Alquiler" };
const ML_STATUS_LABELS: Record<string, string> = { active: "Activa", paused: "Pausada", closed: "Cerrada" };

export function MercadoLibrePanel({
  propertyId,
  connected,
  listings,
}: {
  propertyId: string;
  connected: boolean;
  listings: MlListingSummary[];
}) {
  if (!connected) {
    return (
      <section className="rounded-2xl border bg-card p-5 sm:p-7">
        <h2 className="font-semibold">Mercado Libre</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Todavía no hay una cuenta de Mercado Libre conectada — configurala en{" "}
          <a href="/admin/configuracion?tab=mercadolibre" className="underline">
            Configuración → Mercado Libre
          </a>
          .
        </p>
      </section>
    );
  }

  if (listings.length === 0) {
    return (
      <section className="rounded-2xl border bg-card p-5 sm:p-7">
        <h2 className="font-semibold">Mercado Libre</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cargá un precio de venta o alquiler para esta propiedad antes de poder publicarla.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-7">
      <h2 className="font-semibold">Mercado Libre</h2>
      <div className="mt-4 flex flex-col gap-3">
        {listings.map((listing) => (
          <ListingRow key={listing.id} propertyId={propertyId} listing={listing} />
        ))}
      </div>
    </section>
  );
}

function ListingRow({ propertyId, listing }: { propertyId: string; listing: MlListingSummary }) {
  const [pending, startTransition] = useTransition();

  function run(action: (propertyId: string, listingId: string) => Promise<{ ok: true } | { error: string }>) {
    startTransition(async () => {
      const result = await action(propertyId, listing.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Listo");
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{OPERATION_LABELS[listing.operation] ?? listing.operation}</span>
          {listing.mlStatus && <Badge variant={listing.mlStatus === "active" ? "default" : "secondary"}>{ML_STATUS_LABELS[listing.mlStatus] ?? listing.mlStatus}</Badge>}
        </div>
        {listing.mlPermalink && (
          <a href={listing.mlPermalink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
            Ver en Mercado Libre →
          </a>
        )}
        {listing.mlLastError && <p className="mt-1 max-w-md text-xs text-destructive">{listing.mlLastError}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {!listing.mlItemId && (
          <Button type="button" size="sm" disabled={pending} onClick={() => run(publishToMercadoLibre)}>
            Publicar
          </Button>
        )}
        {listing.mlItemId && (
          <>
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(publishToMercadoLibre)}>
              Actualizar
            </Button>
            {listing.mlStatus === "paused" ? (
              <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(reactivateMercadoLibreListing)}>
                Reactivar
              </Button>
            ) : (
              <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(pauseMercadoLibreListing)}>
                Pausar
              </Button>
            )}
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(closeMercadoLibreListing)} className="text-destructive hover:text-destructive">
              Cerrar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
