"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { saveBillingCredentials, saveBillingSettings, testBillingConnection } from "./actions";

export function BillingSettingsForm({ enabled: initialEnabled, graceDays, hasToken, accessTokenMask, webhookSecretMask }: {
  enabled: boolean;
  graceDays: number;
  hasToken: boolean;
  accessTokenMask: string | null;
  webhookSecretMask: string | null;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const [testing, startTest] = useTransition();

  function save(formData: FormData) {
    startTransition(async () => {
      try {
        const actionResult = await saveBillingSettings(formData);
        if ("error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        toast.success("Configuración de facturación guardada");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar");
      }
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
    <form action={save} className="grid gap-5 rounded-xl border p-5">
      <label className="flex items-start justify-between gap-5">
        <span>
          <span className="block text-sm font-semibold">Aceptar nuevas suscripciones</span>
          <span className="mt-1 block text-xs text-muted-foreground">Si lo apagás, las suscripciones existentes siguen vigentes pero el alta no ofrece Mercado Pago.</span>
        </span>
        <Switch checked={enabled} onCheckedChange={setEnabled} disabled={!hasToken} />
        <input type="hidden" name="enabled" value={String(enabled)} />
      </label>
      <div className="max-w-xs space-y-1.5">
        <Label htmlFor="grace-days">Días de gracia ante un rechazo</Label>
        <Input id="grace-days" name="graceDays" type="number" min="0" max="60" defaultValue={graceDays} required />
        <p className="text-xs text-muted-foreground">La inmobiliaria queda marcada con pago pendiente antes de una suspensión definitiva.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar configuración"}</Button>
        <Button
          type="button"
          variant="outline"
          disabled={!hasToken || testing}
          onClick={() => startTest(async () => {
            try {
              const account = await testBillingConnection();
              if ("error" in account) {
                toast.error(account.error);
                return;
              }
              toast.success(`Conexión correcta${account.nickname ? ` · ${account.nickname}` : ""}`);
            } catch {
              toast.error("Se cortó la conexión. Probá de nuevo.");
            }
          })}
        >
          {testing ? "Probando..." : "Probar conexión"}
        </Button>
      </div>
    </form>
    <form
      action={(formData) => startTransition(async () => {
        try {
          const actionResult = await saveBillingCredentials(formData);
          if ("error" in actionResult) {
            toast.error(actionResult.error);
            return;
          }
          toast.success("Credenciales actualizadas y cifradas");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "No se pudieron guardar");
        }
      })}
      className="grid content-start gap-4 rounded-xl border p-5"
    >
      <div>
        <p className="text-sm font-semibold">Credenciales de Mercado Pago</p>
        <p className="mt-1 text-xs text-muted-foreground">Dejá un campo vacío para conservar el valor actual. Nunca se vuelve a mostrar completo.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="mp-access-token">Access Token</Label>
        <Input id="mp-access-token" name="accessToken" type="password" autoComplete="new-password" placeholder={accessTokenMask ?? "TEST-... o APP_USR-..."} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="mp-webhook-secret">Clave secreta del webhook</Label>
        <Input id="mp-webhook-secret" name="webhookSecret" type="password" autoComplete="new-password" placeholder={webhookSecretMask ?? "Clave de firma"} />
      </div>
      <Button type="submit" variant="outline" disabled={pending} className="justify-self-start">Guardar credenciales</Button>
    </form>
    </div>
  );
}
