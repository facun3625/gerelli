"use client";

import { useState, useTransition } from "react";
import { MailIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  removePlatformResendSettings,
  savePlatformResendSettings,
  sendTestPlatformResendEmail,
} from "./actions";

export function PlatformResendSettingsForm({
  configured,
  fromEmail: savedFromEmail,
}: {
  configured: boolean;
  fromEmail: string | null;
}) {
  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState(savedFromEmail ?? "");
  const [pending, startTransition] = useTransition();
  const [testPending, startTestTransition] = useTransition();
  const [removePending, startRemoveTransition] = useTransition();

  function save() {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("apiKey", apiKey.trim());
        formData.set("fromEmail", fromEmail.trim());
        const actionResult = await savePlatformResendSettings(formData);
        if ("error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        setApiKey("");
        toast.success("Resend guardado");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });
  }

  function sendTest() {
    startTestTransition(async () => {
      try {
        const actionResult = await sendTestPlatformResendEmail(apiKey, fromEmail);
        if ("error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        toast.success("Mail de prueba enviado — revisá tu casilla");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo enviar el mail de prueba");
      }
    });
  }

  function remove() {
    startRemoveTransition(async () => {
      try {
        const actionResult = await removePlatformResendSettings();
        if ("error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        setApiKey("");
        setFromEmail("");
        toast.success("Configuración de Resend eliminada");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo quitar");
      }
    });
  }

  return (
    <div className="grid max-w-3xl gap-6 rounded-xl border p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
          <MailIcon className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold">Envío de mail (Resend)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Una sola cuenta de Resend para todas las tiendas — confirmación de pedido, recuperar
            contraseña y consultas de servicio. Cada tienda no configura nada; el nombre del
            remitente sale solo del nombre de cada tienda.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="platform-resend-key">API key</Label>
          <Input
            id="platform-resend-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={configured ? "•••••••• (guardada — dejalo vacío para no cambiarla)" : "re_..."}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="platform-resend-from">Email de origen</Label>
          <Input
            id="platform-resend-from"
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder="notificaciones@tudominio.com"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        El dominio de ese email tiene que estar verificado en{" "}
        <span className="font-mono">resend.com/domains</span> (registros DNS) antes de que los
        mails salgan.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          {pending ? "Guardando..." : "Guardar"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={sendTest} disabled={testPending}>
          {testPending ? "Enviando..." : "Mandarme un mail de prueba"}
        </Button>
        {configured && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={remove}
            disabled={removePending}
            className="text-destructive hover:text-destructive"
          >
            Quitar configuración
          </Button>
        )}
      </div>
    </div>
  );
}
