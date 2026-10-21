"use client";

import { useState, useTransition } from "react";
import { MessageCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { saveMarketingWhatsapp } from "./actions";

export function MarketingSettingsForm({
  enabled: initialEnabled,
  number,
  message,
}: {
  enabled: boolean;
  number: string | null;
  message: string | null;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();

  function save(formData: FormData) {
    startTransition(async () => {
      try {
        const actionResult = await saveMarketingWhatsapp(formData);
        if ("error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        toast.success("WhatsApp público actualizado");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar la configuración");
      }
    });
  }

  return (
    <form action={save} className="grid max-w-3xl gap-6 rounded-xl border p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[#1aa64b]">
          <MessageCircleIcon className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold">WhatsApp comercial de Urbi</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Se muestra flotando en la landing y en las páginas públicas de Urbi. No modifica el WhatsApp propio de las tiendas.
          </p>
        </div>
      </div>

      <label className="flex items-center justify-between gap-5 rounded-lg bg-muted/60 px-4 py-3">
        <span>
          <span className="block text-sm font-medium">Mostrar el botón</span>
          <span className="block text-xs text-muted-foreground">Podés ocultarlo sin borrar el número.</span>
        </span>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
        <input type="hidden" name="enabled" value={String(enabled)} />
      </label>

      <div className="space-y-2">
        <Label htmlFor="marketing-whatsapp-number">Número de WhatsApp</Label>
        <Input
          id="marketing-whatsapp-number"
          name="number"
          type="tel"
          inputMode="tel"
          defaultValue={number ?? ""}
          placeholder="5493511234567"
          required
        />
        <p className="text-xs text-muted-foreground">Incluí el código de país y de área, sin el signo +. Ejemplo: 5493511234567.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="marketing-whatsapp-message">Mensaje inicial</Label>
        <Textarea
          id="marketing-whatsapp-message"
          name="message"
          rows={4}
          maxLength={500}
          defaultValue={message ?? "Hola, quiero conocer más sobre Urbi."}
          placeholder="Hola, quiero conocer más sobre Urbi."
        />
        <p className="text-xs text-muted-foreground">Se completa automáticamente cuando la persona abre WhatsApp.</p>
      </div>

      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Guardando..." : "Guardar configuración"}
      </Button>
    </form>
  );
}
