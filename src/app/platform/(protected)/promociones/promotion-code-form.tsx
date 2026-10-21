"use client";

import { useRef, useTransition } from "react";
import { GiftIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPromotionCode } from "./actions";

export function PromotionCodeForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  function create(formData: FormData) {
    startTransition(async () => {
      try {
        const actionResult = await createPromotionCode(formData);
        if ("error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        formRef.current?.reset();
        toast.success("Código promocional creado");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo crear el código");
      }
    });
  }

  return (
    <form ref={formRef} action={create} className="flex flex-col gap-4 rounded-xl border border-dashed p-4">
      <div className="flex items-center gap-2">
        <GiftIcon className="size-4 text-primary" />
        <p className="text-sm font-semibold">Nuevo código promocional</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="promo-code" className="text-xs">Código</Label>
          <Input id="promo-code" name="code" minLength={4} maxLength={30} placeholder="Urbi2026" required className="uppercase" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="promo-duration" className="text-xs">Meses bonificados</Label>
          <Input id="promo-duration" name="durationMonths" type="number" min={1} max={60} step={1} defaultValue={12} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="promo-max" className="text-xs">Cantidad de usos</Label>
          <Input id="promo-max" name="maxUses" type="number" min={1} step={1} placeholder="Sin límite" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="promo-until" className="text-xs">Válido hasta</Label>
          <Input id="promo-until" name="validUntil" type="date" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Los meses indican cuánto dura la bonificación desde que se crea la inmobiliaria. “Válido hasta” define hasta qué fecha se puede canjear el código.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="promo-description" className="text-xs">Descripción interna</Label>
        <Textarea id="promo-description" name="description" rows={2} maxLength={160} placeholder="Ej: lanzamiento, convenio con cámara gastronómica..." />
      </div>
      <Button type="submit" size="sm" disabled={pending} className="self-start">
        <PlusIcon className="size-4" />{pending ? "Creando..." : "Crear código"}
      </Button>
    </form>
  );
}
