"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PlusIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAdminTheme } from "@/components/admin/admin-theme-root";
import { createDomainRequest } from "./actions";

const MAX_DOMAIN_OPTIONS = 3;

export function DomainRequestForm({
  contactName,
  contactEmail,
}: {
  contactName: string;
  contactEmail: string;
}) {
  const { containerRef } = useAdminTheme();
  const [revealed, setRevealed] = useState(false);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(contactName);
  const [email, setEmail] = useState(contactEmail);
  const [phone, setPhone] = useState("");
  const [domainOptions, setDomainOptions] = useState<string[]>([""]);
  const [notes, setNotes] = useState("");

  function updateOption(index: number, value: string) {
    setDomainOptions((prev) => prev.map((d, i) => (i === index ? value : d)));
  }
  function addOption() {
    if (domainOptions.length >= MAX_DOMAIN_OPTIONS) return;
    setDomainOptions((prev) => [...prev, ""]);
  }
  function removeOption(index: number) {
    setDomainOptions((prev) => prev.filter((_, i) => i !== index));
  }

  function submit() {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("contactName", name);
        formData.set("contactEmail", email);
        formData.set("contactPhone", phone);
        formData.set("domainOptions", JSON.stringify(domainOptions.map((d) => d.trim())));
        formData.set("notes", notes);
        const actionResult = await createDomainRequest(formData);
        if ("error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        setSent(true);
        setOpen(false);
        toast.success("Listo, nos vamos a contactar para coordinar la compra.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo enviar el pedido");
      }
    });
  }

  if (sent) {
    return (
      <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        Ya enviaste tu pedido — te vamos a contactar para coordinar la compra e instalación del dominio.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {!revealed ? (
        <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setRevealed(true)}>
          ¿No sabés cómo hacer el trámite? Nosotros lo hacemos por vos
        </Button>
      ) : (
        <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
          <p className="text-sm">
            Dominio <span className="font-mono">.com.ar</span>: <span className="font-semibold">$30.000 por año</span>, instalación incluida.
          </p>
          <Button type="button" size="sm" className="self-start" onClick={() => setOpen(true)}>
            Pedir que lo hagamos
          </Button>
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto" container={containerRef}>
          <SheetHeader>
            <SheetTitle>Pedir dominio propio</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 px-4 pb-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="dr-name">Tu nombre</Label>
              <Input id="dr-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dr-email">Email de contacto</Label>
              <Input id="dr-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dr-phone">Teléfono (opcional)</Label>
              <Input id="dr-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Opciones de dominio que te gustarían</Label>
              {domainOptions.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={d}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder="ej: pedidos.mimarca.com.ar"
                    required={i === 0}
                  />
                  {domainOptions.length > 1 && (
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeOption(i)}>
                      <XIcon className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
              {domainOptions.length < MAX_DOMAIN_OPTIONS && (
                <Button type="button" variant="outline" size="sm" className="self-start" onClick={addOption}>
                  <PlusIcon className="size-4" />
                  Agregar otra opción
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="dr-notes">Comentarios (opcional)</Label>
              <Textarea id="dr-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <Button type="button" disabled={pending || !name.trim() || !email.trim() || !domainOptions[0]?.trim()} onClick={submit}>
              {pending ? "Enviando..." : "Enviar pedido"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
