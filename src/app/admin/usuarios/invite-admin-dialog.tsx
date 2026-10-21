"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckIcon, CopyIcon, UserPlusIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminTheme } from "@/components/admin/admin-theme-root";
import { inviteAdmin } from "./actions";

// Crea el admin directo (sin que se registre antes) y muestra el link de
// "creá tu contraseña" como respaldo — el mail puede no llegar (Resend sin
// configurar, casilla equivocada, etc.), pero el link ya es válido igual.
export function InviteAdminDialog() {
  const { containerRef } = useAdminTheme();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setError("");
      setInviteUrl(null);
      setCopied(false);
      router.refresh();
    }
  }

  function handleSubmit(form: FormData) {
    setError("");
    start(async () => {
      const result = await inviteAdmin(form);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setInviteUrl(result.inviteUrl);
      toast.success("Administrador creado");
    });
  }

  async function copyLink() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className="gap-1.5">
        <UserPlusIcon className="size-4" />
        Invitar administrador
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent container={containerRef}>
          <DialogHeader>
            <DialogTitle>Invitar administrador</DialogTitle>
          </DialogHeader>

          {inviteUrl ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Le mandamos un mail para que cree su contraseña. Si no lo recibe, pasale este link
                directamente:
              </p>
              <div className="flex items-center gap-2">
                <Input readOnly value={inviteUrl} className="text-xs" />
                <Button type="button" size="sm" variant="outline" onClick={copyLink}>
                  {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">El link vence en 1 hora.</p>
              <DialogFooter>
                <Button type="button" onClick={() => handleOpenChange(false)}>
                  Listo
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form action={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="invite-name">Nombre</Label>
                <Input id="invite-name" name="name" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email *</Label>
                <Input id="invite-email" name="email" type="email" required />
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Creando…" : "Crear e invitar"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
