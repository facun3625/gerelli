"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Input con label flotante dentro del campo */
function FloatingInput({
  id,
  label,
  type = "text",
  required,
  value,
  onChange,
  minLength,
  suffix,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  minLength?: number;
  suffix?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;
  const lifted = focused || hasValue;

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
        className={cn(
          "peer w-full rounded-xl border bg-background px-4 pb-2.5 pt-6 text-sm text-foreground outline-none transition-colors",
          "border-border focus:border-primary focus:ring-2 focus:ring-primary/20",
          suffix && "pr-10",
        )}
        autoComplete={type === "password" ? "current-password" : undefined}
      />
      {suffix && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>
      )}
    </div>
  );
}

export function LoginForm({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

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
    router.push(callbackUrl);
    router.refresh();
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: registerName,
        email: registerEmail,
        password: registerPassword,
      }),
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
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <Tabs defaultValue="login">
        <TabsList className="grid w-full grid-cols-2 rounded-xl">
          <TabsTrigger value="login" className="rounded-lg">Ingresar</TabsTrigger>
          <TabsTrigger value="register" className="rounded-lg">Crear cuenta</TabsTrigger>
        </TabsList>

        {/* LOGIN */}
        <TabsContent value="login">
          <form onSubmit={handleLogin} className="flex flex-col gap-3 pt-1">
            <FloatingInput
              id="login-email"
              label="Email"
              type="email"
              required
              value={loginEmail}
              onChange={setLoginEmail}
            />
            <div className="flex flex-col gap-1.5">
              <FloatingInput
                id="login-password"
                label="Contraseña"
                type="password"
                required
                value={loginPassword}
                onChange={setLoginPassword}
              />
              <Link
                href="/recuperar-contrasena"
                className="self-end text-xs text-muted-foreground"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Button
              type="submit"
              disabled={loading}
              size="lg"
              className="mt-1 w-full rounded-full"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </TabsContent>

        {/* REGISTRO */}
        <TabsContent value="register">
          <form onSubmit={handleRegister} className="flex flex-col gap-3 pt-1">
            <FloatingInput
              id="register-name"
              label="Nombre"
              required
              value={registerName}
              onChange={setRegisterName}
            />
            <FloatingInput
              id="register-email"
              label="Email"
              type="email"
              required
              value={registerEmail}
              onChange={setRegisterEmail}
            />
            <FloatingInput
              id="register-password"
              label="Contraseña"
              type="password"
              required
              minLength={6}
              value={registerPassword}
              onChange={setRegisterPassword}
            />
            <Button
              type="submit"
              disabled={loading}
              size="lg"
              className="mt-1 w-full rounded-full"
            >
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
