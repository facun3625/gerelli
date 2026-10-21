"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { setResellerPassword } from "./actions";

export function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        toast.success("Link copiado");
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex shrink-0 items-center gap-1.5 rounded-lg border bg-muted/40 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

export function SetPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.set("password", password);
        startTransition(async () => {
          try {
            await setResellerPassword(formData);
            toast.success("Contraseña guardada");
            setPassword("");
          } catch {
            toast.error("La contraseña debe tener al menos 6 caracteres");
          }
        });
      }}
      className="flex flex-col gap-3"
    >
      <input
        type="password"
        required
        minLength={6}
        placeholder="Mínimo 6 caracteres"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      <Button type="submit" disabled={pending} className="w-full rounded-full">
        {pending ? "Guardando..." : "Definir contraseña"}
      </Button>
    </form>
  );
}
