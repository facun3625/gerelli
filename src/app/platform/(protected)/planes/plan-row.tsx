"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, StarIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/admin/confirm-provider";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import { updatePlan, togglePlanActive, deletePlan, setFeaturedPlan, unfeaturePlan, movePlan } from "./actions";

export type PlanRowData = {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number | null;
  trialDays: number;
  maxPublishedProperties: number | null;
  maxProducts: number | null;
  maxAiMessagesPerMonth: number | null;
  allowRealEstate: boolean;
  allowConsortium: boolean;
  allowPostSale: boolean;
  allowCustomDomain: boolean;
  allowServices: boolean;
  allowStats: boolean;
  allowAiAgent: boolean;
  featured: boolean;
  description: string | null;
  active: boolean;
  tenantCount: number;
};

const FEATURE_TOGGLES = [
  { name: "allowServices", label: "Servicios y consultas" },
  { name: "allowStats", label: "Estadísticas" },
] as const;

const MODULE_TOGGLES = [
  { name: "allowRealEstate", label: "Inmobiliaria" },
  { name: "allowConsortium", label: "Consorcios" },
  { name: "allowPostSale", label: "Postventa" },
] as const;

export function PlanRow({ plan, isFirst, isLast }: { plan: PlanRowData; isFirst: boolean; isLast: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [togglePending, startToggleTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();
  const [featuredPending, startFeaturedTransition] = useTransition();
  const [movePending, startMoveTransition] = useTransition();
  const [allowCustomDomain, setAllowCustomDomain] = useState(plan.allowCustomDomain);
  const [allowAiAgent, setAllowAiAgent] = useState(plan.allowAiAgent);
  const [modules, setModules] = useState({
    allowRealEstate: plan.allowRealEstate,
    allowConsortium: plan.allowConsortium,
    allowPostSale: plan.allowPostSale,
  });
  const [features, setFeatures] = useState({
    allowServices: plan.allowServices,
    allowStats: plan.allowStats,
  });
  const confirm = useConfirm();

  function toggleFeatured() {
    startFeaturedTransition(async () => {
      try {
        await (plan.featured ? unfeaturePlan(plan.id) : setFeaturedPlan(plan.id));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error");
      }
    });
  }

  function move(direction: "up" | "down") {
    startMoveTransition(async () => {
      try {
        const actionResult = await movePlan(plan.id, direction);
        if (actionResult && "error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error");
      }
    });
  }

  function save(formData: FormData) {
    startTransition(async () => {
      try {
        const actionResult = await updatePlan(plan.id, formData);
        if (actionResult && "error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        setEditing(false);
        toast.success("Plan actualizado");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });
  }

  async function remove() {
    const ok = await confirm({
      title: "Borrar plan",
      description: `¿Borrar "${plan.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: "Borrar",
      destructive: true,
    });
    if (!ok) return;
    startDeleteTransition(async () => {
      try {
        const actionResult = await deletePlan(plan.id);
        if (actionResult && "error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        toast.success("Plan eliminado");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo borrar");
      }
    });
  }

  if (editing) {
    return (
      <form action={save} className="flex flex-col gap-3 rounded-lg border p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Nombre</Label>
            <Input name="name" defaultValue={plan.name} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Precio mensual</Label>
            <Input name="priceMonthly" type="number" min="0" step="0.01" defaultValue={plan.priceMonthly} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Precio anual (opcional)</Label>
            <Input name="priceAnnual" type="number" min="0" step="0.01" defaultValue={plan.priceAnnual ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Días de prueba</Label>
            <Input name="trialDays" type="number" min="0" max="365" step="1" defaultValue={plan.trialDays} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Máx. propiedades publicadas (opcional)</Label>
            <Input name="maxPublishedProperties" type="number" min="1" step="1" defaultValue={plan.maxPublishedProperties ?? ""} placeholder="Sin límite" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Máx. mensajes IA/mes (opcional)</Label>
            <Input name="maxAiMessagesPerMonth" type="number" min="1" step="1" defaultValue={plan.maxAiMessagesPerMonth ?? ""} placeholder="Sin límite" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Qué incluye el plan (opcional)</Label>
          <Textarea name="description" defaultValue={plan.description ?? ""} rows={5} placeholder="Una prestación por línea" />
          <p className="text-xs text-muted-foreground">Cada renglón se publica como un beneficio en la landing.</p>
        </div>
        <fieldset className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3">
          <legend className="px-1 text-xs font-semibold">Módulos incluidos</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {MODULE_TOGGLES.map((toggle) => (
              <label key={toggle.name} className="flex items-center gap-2.5 text-sm">
                <Switch
                  checked={modules[toggle.name]}
                  onCheckedChange={(checked) => setModules((current) => ({ ...current, [toggle.name]: checked }))}
                />
                <input type="hidden" name={toggle.name} value={String(modules[toggle.name])} />
                <span className="font-medium">{toggle.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-2.5 text-sm">
          <Switch checked={allowCustomDomain} onCheckedChange={setAllowCustomDomain} />
          <input type="hidden" name="allowCustomDomain" value={String(allowCustomDomain)} />
          <div className="flex flex-col">
            <span className="font-medium">Permite dominio propio</span>
            <span className="text-xs text-muted-foreground">
              Habilita la sección de dominio propio en Configuración para las tiendas de este plan.
            </span>
          </div>
        </label>
        <label className="flex items-center gap-2.5 text-sm">
          <Switch checked={allowAiAgent} onCheckedChange={setAllowAiAgent} />
          <input type="hidden" name="allowAiAgent" value={String(allowAiAgent)} />
          <div className="flex flex-col">
            <span className="font-medium">Agente de ventas IA</span>
            <span className="text-xs text-muted-foreground">
              Habilita el agente de IA en el sitio público de las tiendas de este plan.
            </span>
          </div>
        </label>
        <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
          {FEATURE_TOGGLES.map((toggle) => (
            <label key={toggle.name} className="flex items-center gap-2.5 text-sm">
              <Switch
                checked={features[toggle.name]}
                onCheckedChange={(checked) => setFeatures((f) => ({ ...f, [toggle.name]: checked }))}
              />
              <input type="hidden" name={toggle.name} value={String(features[toggle.name])} />
              <span className="font-medium">{toggle.label}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{plan.name}</span>
          <span className="text-sm text-muted-foreground">{formatPrice(plan.priceMonthly)}/mes</span>
          {plan.priceAnnual !== null && <span className="text-sm text-muted-foreground">{formatPrice(plan.priceAnnual)}/año</span>}
          {!plan.active && <Badge variant="secondary">Inactivo</Badge>}
          {plan.featured && <Badge className="gap-1"><StarIcon className="size-3 fill-current" />Más elegido</Badge>}
          {plan.allowCustomDomain && <Badge variant="outline">Dominio propio</Badge>}
          {plan.allowAiAgent && <Badge variant="outline">Agente IA</Badge>}
          {plan.allowRealEstate && <Badge variant="outline">Inmobiliaria</Badge>}
          {plan.allowConsortium && <Badge variant="outline">Consorcios</Badge>}
          {plan.allowPostSale && <Badge variant="outline">Postventa</Badge>}
          <Badge variant="outline">{plan.tenantCount} {plan.tenantCount === 1 ? "tienda" : "tiendas"}</Badge>
        </div>
        {plan.description && <p className="whitespace-pre-line text-sm text-muted-foreground">{plan.description}</p>}
        <p className="text-xs text-muted-foreground">
          {plan.maxPublishedProperties != null ? `Hasta ${plan.maxPublishedProperties} propiedades publicadas` : "Propiedades sin límite"}
          {plan.trialDays > 0
            ? ` · ${plan.trialDays} ${plan.trialDays === 1 ? "día" : "días"} de prueba`
            : " · Sin período de prueba"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="flex flex-col">
          <Button type="button" size="sm" variant="ghost" className="h-4 px-1" disabled={isFirst || movePending} onClick={() => move("up")}>
            <ArrowUpIcon className="size-3.5" />
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-4 px-1" disabled={isLast || movePending} onClick={() => move("down")}>
            <ArrowDownIcon className="size-3.5" />
          </Button>
        </div>
        <Button
          type="button"
          size="sm"
          variant={plan.featured ? "default" : "ghost"}
          disabled={featuredPending}
          onClick={toggleFeatured}
          title={plan.featured ? "Quitar de \"Más elegido\"" : "Marcar como \"Más elegido\""}
        >
          <StarIcon className={cn("size-4", plan.featured && "fill-current")} />
        </Button>
        <Switch
          checked={plan.active}
          disabled={togglePending}
          onCheckedChange={(active) =>
            startToggleTransition(async () => {
              try {
                const actionResult = await togglePlanActive(plan.id, active);
                if (actionResult && "error" in actionResult) {
                  toast.error(actionResult.error);
                  return;
                }
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Error");
              }
            })
          }
        />
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
          <PencilIcon className="size-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={deletePending} onClick={remove}>
          <Trash2Icon className="size-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
