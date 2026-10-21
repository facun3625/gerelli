"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { AiAgentSettings } from "@/lib/settings";
import { updateAiAgentSettings } from "./actions";

export function AiAgentSettingsForm({ settings }: { settings: AiAgentSettings }) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [tone, setTone] = useState(settings.tone ?? "");
  const [rules, setRules] = useState(settings.rules ?? "");
  const [greeting, setGreeting] = useState(settings.greeting ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("enabled", String(enabled));
      formData.set("tone", tone.trim());
      formData.set("rules", rules.trim());
      formData.set("greeting", greeting.trim());
      const result = await updateAiAgentSettings(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Agente de IA guardado");
    });
  }

  return (
    <div className="flex flex-col gap-5 rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">
        Un agente que conversa con los visitantes de tu sitio, responde sobre tus propiedades
        publicadas con los datos reales de tu cuenta (nunca inventa un precio ni una ubicación) y
        te deja la consulta o la visita agendada lista para que la sigas vos.
      </p>

      <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">Activar en el sitio público</p>
          <p className="text-xs text-muted-foreground">Aparece un botón de chat flotante para los visitantes.</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="ai-greeting">Saludo inicial (opcional)</Label>
        <Input
          id="ai-greeting"
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          placeholder="¡Hola! ¿En qué te puedo ayudar hoy?"
          maxLength={500}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="ai-tone">Tono (opcional)</Label>
        <Input
          id="ai-tone"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          placeholder="Ej: cercano y directo, tratamos de vos"
          maxLength={500}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="ai-rules">Reglas propias (opcional)</Label>
        <Textarea
          id="ai-rules"
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          placeholder={"Ej:\n- No negociamos comisión por chat.\n- Mencionar que hacemos tasaciones gratis.\n- Los alquileres piden garantía propietaria."}
          rows={5}
          maxLength={4000}
        />
        <p className="text-xs text-muted-foreground">
          Una regla o dato por línea — se suma a lo que el agente ya sabe de tus propiedades.
        </p>
      </div>

      <div>
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          {pending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
