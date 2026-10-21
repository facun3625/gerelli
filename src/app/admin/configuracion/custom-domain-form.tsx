"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2Icon, ClockIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/admin/confirm-provider";
import { setCustomDomain, verifyCustomDomain, removeCustomDomain } from "./actions";
import { DomainRequestForm } from "./domain-request-form";

export function CustomDomainForm({
  domain,
  verified,
  verificationRecordName,
  verificationToken,
  contactName,
  contactEmail,
}: {
  domain: string | null;
  verified: boolean;
  verificationRecordName: string | null;
  verificationToken: string | null;
  contactName: string;
  contactEmail: string;
}) {
  const [value, setValue] = useState(domain ?? "");
  const [pending, startTransition] = useTransition();
  const [verifyPending, startVerifyTransition] = useTransition();
  const [removePending, startRemoveTransition] = useTransition();
  const confirm = useConfirm();

  function save() {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("domain", value.trim());
        const actionResult = await setCustomDomain(formData);
        if ("error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        toast.success("Dominio guardado — falta verificarlo");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });
  }

  function verify() {
    startVerifyTransition(async () => {
      try {
        const actionResult = await verifyCustomDomain();
        if ("error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        toast.success("Dominio verificado — ya podés usarlo");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo verificar");
      }
    });
  }

  async function remove() {
    const ok = await confirm({
      title: "Quitar dominio propio",
      description: "La tienda deja de responder en ese dominio y vuelve a estar solo en tu subdominio.",
      confirmLabel: "Quitar",
      destructive: true,
    });
    if (!ok) return;
    startRemoveTransition(async () => {
      try {
        const actionResult = await removeCustomDomain();
        if ("error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        setValue("");
        toast.success("Dominio quitado");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo quitar");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5 rounded-lg border p-4">
      <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
        <p>
          Conectá tu propio dominio (ej: <span className="font-mono">pedidos.mimarca.com</span>) para que la tienda
          se vea ahí en vez de tu subdominio.
        </p>
        <p>
          Vos tenés que comprarlo (en NIC Argentina si es <span className="font-mono">.com.ar</span>, o cualquier
          registrador si no) y tenerlo alojado en algún lugar donde puedas editar sus registros DNS. Después de
          guardarlo acá abajo te vamos a mostrar qué registro tenés que agregar para verificar que es tuyo.
        </p>
      </div>

      {!domain && <DomainRequestForm contactName={contactName} contactEmail={contactEmail} />}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="custom-domain">Dominio</Label>
          <Input
            id="custom-domain"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="pedidos.mimarca.com"
            disabled={verified}
          />
        </div>
        {!verified && (
          <Button type="button" size="sm" onClick={save} disabled={pending || !value.trim()}>
            {pending ? "Guardando..." : domain ? "Actualizar" : "Guardar"}
          </Button>
        )}
      </div>

      {domain && (
        <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            {verified ? (
              <Badge className="gap-1">
                <CheckCircle2Icon className="size-3.5" />
                Verificado
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <ClockIcon className="size-3.5" />
                Pendiente de verificación
              </Badge>
            )}
          </div>

          {!verified && verificationRecordName && verificationToken && (
            <div className="flex flex-col gap-2 text-xs text-muted-foreground">
              <p>
                Agregá este registro <span className="font-medium text-foreground">TXT</span> en el DNS de tu
                dominio, esperá unos minutos a que se propague, y tocá &quot;Verificar&quot;:
              </p>
              <div className="flex flex-col gap-1 rounded-md border bg-background p-2 font-mono">
                <span>Nombre: {verificationRecordName}</span>
                <span>Valor: {verificationToken}</span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!verified && (
              <Button type="button" size="sm" variant="outline" onClick={verify} disabled={verifyPending}>
                {verifyPending ? "Verificando..." : "Verificar"}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={remove}
              disabled={removePending}
              className="text-destructive hover:text-destructive"
            >
              Quitar dominio
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
