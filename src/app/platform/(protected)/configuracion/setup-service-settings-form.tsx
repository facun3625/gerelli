"use client";

import { useState, useTransition } from "react";
import { HammerIcon, PlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { saveSetupServiceSettings } from "./actions";

const MAX_STEPS = 8;

export function SetupServiceSettingsForm({
  enabled: initialEnabled,
  price,
  steps: initialSteps,
}: {
  enabled: boolean;
  price: number;
  steps: string[];
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [price_, setPrice] = useState(String(price || ""));
  const [steps, setSteps] = useState<string[]>(initialSteps.length ? initialSteps : [""]);
  const [pending, startTransition] = useTransition();

  function updateStep(index: number, value: string) {
    setSteps((prev) => prev.map((s, i) => (i === index ? value : s)));
  }
  function addStep() {
    if (steps.length >= MAX_STEPS) return;
    setSteps((prev) => [...prev, ""]);
  }
  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function save(formData: FormData) {
    startTransition(async () => {
      try {
        formData.set("steps", JSON.stringify(steps.map((s) => s.trim()).filter(Boolean)));
        const actionResult = await saveSetupServiceSettings(formData);
        if ("error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        toast.success("Servicio de armado actualizado");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar la configuración");
      }
    });
  }

  return (
    <form action={save} className="grid max-w-3xl gap-6 rounded-xl border p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <HammerIcon className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold">Armamos tu inmobiliaria por vos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sección en la landing para quien no sabe armar su tienda solo. Precio único, independiente de la suscripción.
          </p>
        </div>
      </div>

      <label className="flex items-center justify-between gap-5 rounded-lg bg-muted/60 px-4 py-3">
        <span>
          <span className="block text-sm font-medium">Mostrar la sección</span>
          <span className="block text-xs text-muted-foreground">Podés ocultarla sin borrar el precio ni los pasos.</span>
        </span>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
        <input type="hidden" name="enabled" value={String(enabled)} />
      </label>

      <div className="space-y-2">
        <Label htmlFor="setup-service-price">Precio del servicio</Label>
        <Input
          id="setup-service-price"
          name="price"
          type="number"
          min={0}
          step="1"
          value={price_}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Ej: 30000"
          required
        />
        <p className="text-xs text-muted-foreground">Pago único, no se relaciona con ningún plan de suscripción.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Pasos del proceso</Label>
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input value={s} onChange={(e) => updateStep(i, e.target.value)} placeholder={`Paso ${i + 1}`} />
            {steps.length > 1 && (
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeStep(i)}>
                <XIcon className="size-4" />
              </Button>
            )}
          </div>
        ))}
        {steps.length < MAX_STEPS && (
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={addStep}>
            <PlusIcon className="size-4" />
            Agregar paso
          </Button>
        )}
      </div>

      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Guardando..." : "Guardar configuración"}
      </Button>
    </form>
  );
}
