"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { XIcon, ArrowLeftIcon, MailCheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useLoginDialog } from "@/lib/login-dialog-context";
import { useStoreSettings } from "@/lib/store-settings-context";
import { requestPasswordReset } from "@/app/recuperar-contrasena/actions";

type Screen = "auth" | "forgot" | "forgot-sent";

/* ─── Floating label input ─── */
function FloatingInput({
  id, label, type = "text", required, value, onChange, minLength,
}: {
  id: string; label: string; type?: string; required?: boolean;
  value: string; onChange: (v: string) => void; minLength?: number;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;

  return (
    <div className="relative">
      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute left-4 transition-all duration-150 select-none",
          lifted
            ? "top-2 text-[10px] font-medium text-muted-foreground"
            : "top-1/2 -translate-y-1/2 text-sm text-muted-foreground",
        )}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full rounded-xl border border-border bg-background px-4 pb-2.5 pt-6 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

/* ─── Main dialog ─── */
export function LoginDialog() {
  const { isOpen, closeLogin } = useLoginDialog();
  const router = useRouter();
  const { storeName, logoUrl, tenantId } = useStoreSettings();

  const [screen, setScreen] = useState<Screen>("auth");
  const [loading, setLoading] = useState(false);
  const [forgotPending, startForgotTransition] = useTransition();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  const [forgotEmail, setForgotEmail] = useState("");

  function handleClose() {
    closeLogin();
    // Reset state after animation
    setTimeout(() => {
      setScreen("auth");
      setLoginEmail("");
      setLoginPassword("");
      setRegisterName("");
      setRegisterEmail("");
      setRegisterPassword("");
      setForgotEmail("");
    }, 300);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await signIn("credentials", {
      email: loginEmail,
      password: loginPassword,
      tenantId,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      toast.error("Email o contraseña incorrectos");
      return;
    }
    handleClose();
    router.refresh();
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: registerName, email: registerEmail, password: registerPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      toast.error(data.error ?? "No se pudo crear la cuenta");
      return;
    }
    const result = await signIn("credentials", {
      email: registerEmail,
      password: registerPassword,
      tenantId,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      toast.error("Cuenta creada, pero no se pudo iniciar sesión");
      return;
    }
    handleClose();
    router.refresh();
  }

  function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    startForgotTransition(async () => {
      try {
        await requestPasswordReset(forgotEmail);
        setScreen("forgot-sent");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo procesar la solicitud");
      }
    });
  }

  const isForgotScreen = screen === "forgot" || screen === "forgot-sent";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-sm flex-col gap-0 overflow-hidden rounded-2xl p-0"
      >
        <DialogTitle className="sr-only">
          {screen === "auth" ? "Ingresar" : "Recuperar contraseña"}
        </DialogTitle>

        {/* ── Barra de navegación compacta ── */}
        <div className="relative flex h-28 shrink-0 items-center justify-center px-2">
          {isForgotScreen && (
            <button
              type="button"
              onClick={() => setScreen("auth")}
              className="absolute left-2 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Volver"
            >
              <ArrowLeftIcon className="size-4" />
            </button>
          )}

          {logoUrl && (
            <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-border">
              <Image src={logoUrl} alt={storeName} width={80} height={80} className="size-full object-contain" />
            </div>
          )}

          <DialogClose
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-3 right-3 rounded-full"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Cerrar</span>
          </DialogClose>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col gap-5 overflow-y-auto px-6 py-6">

          {/* ── PANTALLA: auth ── */}
          {screen === "auth" && (
            <>
              <Tabs defaultValue="login">
                <TabsList className="grid w-full grid-cols-2 rounded-xl">
                  <TabsTrigger value="login" className="rounded-lg">Ingresar</TabsTrigger>
                  <TabsTrigger value="register" className="rounded-lg">Crear cuenta</TabsTrigger>
                </TabsList>

                {/* Login */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="flex flex-col gap-3 pt-1">
                    <FloatingInput id="dlg-login-email" label="Email" type="email" required value={loginEmail} onChange={setLoginEmail} />
                    <div className="flex flex-col gap-1.5">
                      <FloatingInput id="dlg-login-password" label="Contraseña" type="password" required value={loginPassword} onChange={setLoginPassword} />
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(loginEmail);
                          setScreen("forgot");
                        }}
                        className="self-end text-xs text-muted-foreground"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                    <Button type="submit" disabled={loading} size="lg" className="mt-1 w-full rounded-full">
                      {loading ? "Ingresando..." : "Ingresar"}
                    </Button>
                  </form>
                </TabsContent>

                {/* Registro */}
                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="flex flex-col gap-3 pt-1">
                    <FloatingInput id="dlg-register-name" label="Nombre" required value={registerName} onChange={setRegisterName} />
                    <FloatingInput id="dlg-register-email" label="Email" type="email" required value={registerEmail} onChange={setRegisterEmail} />
                    <FloatingInput id="dlg-register-password" label="Contraseña" type="password" required minLength={6} value={registerPassword} onChange={setRegisterPassword} />
                    <Button type="submit" disabled={loading} size="lg" className="mt-1 w-full rounded-full">
                      {loading ? "Creando cuenta..." : "Crear cuenta"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </>
          )}

          {/* ── PANTALLA: forgot ── */}
          {screen === "forgot" && (
            <form onSubmit={handleForgot} className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Ingresá tu email y te mandamos un link para elegir una nueva contraseña.
              </p>
              <FloatingInput
                id="dlg-forgot-email"
                label="Email"
                type="email"
                required
                value={forgotEmail}
                onChange={setForgotEmail}
              />
              <Button type="submit" disabled={forgotPending} size="lg" className="w-full rounded-full">
                {forgotPending ? "Enviando..." : "Mandar link"}
              </Button>
              <button
                type="button"
                onClick={() => setScreen("auth")}
                className="text-center text-sm text-muted-foreground"
              >
                Volver al login
              </button>
            </form>
          )}

          {/* ── PANTALLA: forgot-sent ── */}
          {screen === "forgot-sent" && (
            <div className="flex flex-col items-center gap-5 py-2 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                <MailCheckIcon className="size-7 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Si <strong className="text-foreground">{forgotEmail}</strong> tiene una cuenta,
                te va a llegar un mail con el link para restablecer tu contraseña.
              </p>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full rounded-full"
                onClick={() => setScreen("auth")}
              >
                Volver al login
              </Button>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
