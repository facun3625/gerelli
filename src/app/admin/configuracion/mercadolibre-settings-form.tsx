"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/admin/confirm-provider";
import {
  updateMercadoLibreCredentials,
  disconnectMercadoLibre,
  fetchMlStates,
  fetchMlCities,
  fetchMlNeighborhoods,
  saveMlLocationMapping,
  deleteMlLocationMapping,
} from "./mercadolibre-actions";

type MlLocationRef = { id: string; name: string };

type LocationRow = {
  city: string;
  neighborhood: string;
  mapping: {
    id: string;
    mlStateId: string;
    mlStateName: string;
    mlCityId: string;
    mlCityName: string;
    mlNeighborhoodId: string | null;
  } | null;
};

export function MercadoLibreSettingsForm({
  clientId,
  configured,
  connected,
  userId,
  redirectUri,
  mlError,
  locationRows,
}: {
  clientId: string | null;
  configured: boolean;
  connected: boolean;
  userId: string | null;
  redirectUri: string;
  mlError: string | null;
  locationRows: LocationRow[];
}) {
  const [clientIdValue, setClientIdValue] = useState(clientId ?? "");
  const [clientSecretValue, setClientSecretValue] = useState("");
  const [credsPending, startCredsTransition] = useTransition();
  const [disconnectPending, startDisconnectTransition] = useTransition();
  const confirm = useConfirm();

  function saveCredentials() {
    startCredsTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("clientId", clientIdValue.trim());
        formData.set("clientSecret", clientSecretValue.trim());
        const result = await updateMercadoLibreCredentials(formData);
        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        setClientSecretValue("");
        toast.success("Credenciales guardadas");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });
  }

  async function disconnect() {
    const ok = await confirm({
      title: "¿Desconectar Mercado Libre?",
      description: "Vas a tener que volver a autorizar la app para publicar propiedades.",
      confirmLabel: "Desconectar",
      destructive: true,
    });
    if (!ok) return;
    startDisconnectTransition(async () => {
      const result = await disconnectMercadoLibre();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Desconectado");
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5 rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">App de Mercado Libre</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Creá una app en{" "}
            <a href="https://developers.mercadolibre.com.ar" target="_blank" rel="noopener noreferrer" className="underline">
              developers.mercadolibre.com.ar
            </a>{" "}
            con la cuenta de la inmobiliaria, y registrá esta URL de redirect exactamente así:
          </p>
          <code className="mt-2 block rounded-md bg-muted px-2.5 py-1.5 text-xs">{redirectUri}</code>
        </div>

        {mlError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Mercado Libre devolvió un error: {mlError}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ml-client-id">Client ID</Label>
            <Input id="ml-client-id" value={clientIdValue} onChange={(e) => setClientIdValue(e.target.value)} placeholder="1234567890123456" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ml-client-secret">Client Secret</Label>
            <Input
              id="ml-client-secret"
              type="password"
              value={clientSecretValue}
              onChange={(e) => setClientSecretValue(e.target.value)}
              placeholder={configured ? "•••••••• (guardado — dejalo vacío para no cambiarlo)" : "Pegá el Client Secret"}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" onClick={saveCredentials} disabled={credsPending}>
            {credsPending ? "Guardando..." : "Guardar credenciales"}
          </Button>

          {configured && !connected && (
            <Button type="button" size="sm" variant="outline" render={<a href="/api/mercadolibre/oauth/start" />}>
              Conectar con Mercado Libre
            </Button>
          )}
          {connected && (
            <>
              <span className="text-sm text-muted-foreground">
                Conectado {userId ? `(cuenta ${userId})` : ""}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={disconnect}
                disabled={disconnectPending}
                className="text-destructive hover:text-destructive"
              >
                Desconectar
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Ubicaciones</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Mercado Libre no acepta la ciudad/barrio como texto libre — hace falta resolver una vez el ID real de
            cada ciudad/barrio que uses en el catálogo. Una vez mapeada, se reutiliza para todas las propiedades de
            esa zona.
          </p>
        </div>
        {locationRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay propiedades cargadas.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {locationRows.map((row) => (
              <LocationMappingRow key={`${row.city}__${row.neighborhood}`} row={row} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LocationMappingRow({ row }: { row: LocationRow }) {
  const [editing, setEditing] = useState(!row.mapping);
  const [states, setStates] = useState<MlLocationRef[] | null>(null);
  const [cities, setCities] = useState<MlLocationRef[] | null>(null);
  const [neighborhoods, setNeighborhoods] = useState<MlLocationRef[] | null>(null);
  const [stateId, setStateId] = useState("");
  const [cityId, setCityId] = useState("");
  const [neighborhoodId, setNeighborhoodId] = useState("");
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  async function loadStates() {
    if (states) return;
    setLoadingStates(true);
    try {
      setStates(await fetchMlStates());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudieron cargar las provincias");
    } finally {
      setLoadingStates(false);
    }
  }

  async function onStateChange(id: string) {
    setStateId(id);
    setCityId("");
    setCities(null);
    setNeighborhoods(null);
    setLoadingCities(true);
    try {
      setCities(await fetchMlCities(id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudieron cargar las ciudades");
    } finally {
      setLoadingCities(false);
    }
  }

  async function onCityChange(id: string) {
    setCityId(id);
    setNeighborhoodId("");
    setNeighborhoods(null);
    setLoadingNeighborhoods(true);
    try {
      setNeighborhoods(await fetchMlNeighborhoods(id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudieron cargar los barrios");
    } finally {
      setLoadingNeighborhoods(false);
    }
  }

  function save() {
    const state = states?.find((s) => s.id === stateId);
    const city = cities?.find((c) => c.id === cityId);
    if (!state || !city) {
      toast.error("Elegí provincia y ciudad");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("city", row.city);
      formData.set("neighborhood", row.neighborhood);
      formData.set("mlStateId", state.id);
      formData.set("mlStateName", state.name);
      formData.set("mlCityId", city.id);
      formData.set("mlCityName", city.name);
      if (neighborhoodId) formData.set("mlNeighborhoodId", neighborhoodId);
      const result = await saveMlLocationMapping(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Ubicación mapeada");
      setEditing(false);
    });
  }

  async function remove() {
    if (!row.mapping) return;
    const ok = await confirm({ title: "¿Borrar este mapeo?", description: "Las propiedades de esta zona no van a poder publicarse hasta volver a mapearla.", confirmLabel: "Borrar", destructive: true });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteMlLocationMapping(row.mapping!.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Mapeo borrado");
    });
  }

  const label = row.neighborhood ? `${row.city} / ${row.neighborhood}` : row.city;

  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {row.mapping && !editing && (
            <p className="text-xs text-muted-foreground">
              → {row.mapping.mlCityName}, {row.mapping.mlStateName} (ML)
            </p>
          )}
        </div>
        {row.mapping && !editing ? (
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
              Cambiar
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={remove} disabled={pending} className="text-destructive hover:text-destructive">
              Borrar
            </Button>
          </div>
        ) : (
          !editing && (
            <Button type="button" size="sm" variant="outline" onClick={() => { setEditing(true); void loadStates(); }}>
              Mapear
            </Button>
          )
        )}
      </div>

      {editing && (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <select
            className="h-9 rounded-md border bg-transparent px-2 text-sm"
            value={stateId}
            onFocus={() => void loadStates()}
            onChange={(e) => void onStateChange(e.target.value)}
          >
            <option value="">{loadingStates ? "Cargando..." : "Provincia"}</option>
            {states?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select className="h-9 rounded-md border bg-transparent px-2 text-sm" value={cityId} disabled={!stateId} onChange={(e) => void onCityChange(e.target.value)}>
            <option value="">{loadingCities ? "Cargando..." : "Ciudad"}</option>
            {cities?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select className="h-9 rounded-md border bg-transparent px-2 text-sm" value={neighborhoodId} disabled={!cityId} onChange={(e) => setNeighborhoodId(e.target.value)}>
            <option value="">{loadingNeighborhoods ? "Cargando..." : "Barrio (opcional)"}</option>
            {neighborhoods?.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
          <Button type="button" size="sm" onClick={save} disabled={pending}>
            Guardar
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}
