"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { ExternalLinkIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateMercadoPagoConfig } from "./actions";
import type { MercadoPagoPublicConfig } from "@/lib/mercadopago-config";

export function MercadoPagoConfigForm({
  config,
  webhookUrl,
}: {
  config: MercadoPagoPublicConfig;
  webhookUrl: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          try {
            await updateMercadoPagoConfig(formData);
            toast.success("Credenciales de MercadoPago guardadas");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Error al guardar");
          }
        })
      }
      className="flex flex-col gap-3 border-t pt-3"
    >
      <p className="text-xs text-muted-foreground">
        Sacá tus credenciales de{" "}
        <a
          href="https://www.mercadopago.com.ar/developers/panel/app"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          Tus integraciones <ExternalLinkIcon className="size-3" />
        </a>{" "}
        en MercadoPago. Los cobros van directo a tu cuenta.
      </p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="accessToken">
          Access Token {config.accessTokenMask && <span className="text-muted-foreground">· guardado: {config.accessTokenMask}</span>}
        </Label>
        <Input
          id="accessToken"
          name="accessToken"
          type="password"
          autoComplete="off"
          placeholder={config.accessTokenMask ? "Dejalo vacío para no cambiarlo" : "APP_USR-... o TEST-..."}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="publicKey">Public Key</Label>
        <Input
          id="publicKey"
          name="publicKey"
          autoComplete="off"
          defaultValue={config.publicKey ?? ""}
          placeholder="APP_USR-... o TEST-..."
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="webhookSecret">
          Clave secreta del webhook{" "}
          {config.webhookSecretMask && <span className="text-muted-foreground">· guardada: {config.webhookSecretMask}</span>}
        </Label>
        <Input
          id="webhookSecret"
          name="webhookSecret"
          type="password"
          autoComplete="off"
          placeholder={config.webhookSecretMask ? "Dejalo vacío para no cambiarla" : "La que te da MP al configurar el webhook"}
        />
        <p className="text-xs text-muted-foreground">
          En MercadoPago, en <strong>Webhooks → Configurar notificaciones</strong>, pegá esta URL y copiá acá la
          clave secreta que te genera:
        </p>
        <code className="rounded-md bg-muted px-2 py-1.5 text-xs break-all">{webhookUrl}</code>
        <p className="text-xs text-muted-foreground">
          Sin esta clave no podemos comprobar que los avisos de pago vengan de verdad de MercadoPago, así que los
          pedidos no se van a confirmar solos.
        </p>
      </div>

      <Button type="submit" size="sm" disabled={pending} className="self-start">
        {pending ? "Guardando..." : "Guardar credenciales"}
      </Button>
    </form>
  );
}
