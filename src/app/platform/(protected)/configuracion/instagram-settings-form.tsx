"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { InstagramIcon } from "@/components/catalog/social-icons";
import { saveMarketingInstagram } from "./actions";

export function InstagramSettingsForm({
  enabled: initialEnabled,
  username,
}: {
  enabled: boolean;
  username: string | null;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();

  function save(formData: FormData) {
    startTransition(async () => {
      try {
        const actionResult = await saveMarketingInstagram(formData);
        if ("error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        toast.success("Instagram público actualizado");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar la configuración");
      }
    });
  }

  return (
    <form action={save} className="grid max-w-3xl gap-6 rounded-xl border p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pink-500/15 text-pink-500">
          <InstagramIcon className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold">Instagram de Urbi</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Se muestra en el header y el pie de la landing y las páginas públicas de Urbi. No modifica el Instagram propio de las tiendas.
          </p>
        </div>
      </div>

      <label className="flex items-center justify-between gap-5 rounded-lg bg-muted/60 px-4 py-3">
        <span>
          <span className="block text-sm font-medium">Mostrar el ícono</span>
          <span className="block text-xs text-muted-foreground">Podés ocultarlo sin borrar el usuario.</span>
        </span>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
        <input type="hidden" name="enabled" value={String(enabled)} />
      </label>

      <div className="space-y-2">
        <Label htmlFor="marketing-instagram-username">Usuario de Instagram</Label>
        <Input
          id="marketing-instagram-username"
          name="username"
          defaultValue={username ?? ""}
          placeholder="urbivendemas"
          required
        />
        <p className="text-xs text-muted-foreground">Sin el @, solo el usuario. Ejemplo: urbivendemas.</p>
      </div>

      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Guardando..." : "Guardar configuración"}
      </Button>
    </form>
  );
}
