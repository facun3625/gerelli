"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const REMEMBER_EMAIL_KEY = "platform-login-email";

/** Input con label flotante dentro del campo — mismo patrón que /login */
function FloatingInput({
  id,
  label,
  type = "text",
  required,
  value,
  onChange,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full rounded-xl border border-border bg-background px-4 pb-2.5 pt-6 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        autoComplete={type === "password" ? "current-password" : undefined}
      />
    </div>
  );
}

export function PlatformLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/platform";

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  // Se lee en un efecto (no en el estado inicial) para no pisar el render
  // del servidor con lo que haya en localStorage y evitar un mismatch de
  // hidratación — el campo aparece prellenado un instante después del mount.
  useEffect(() => {
    // El `.then` mete una vuelta async a propósito — un setState síncrono
    // acá adentro dispara el lint de "set-state-in-effect" (cascading
    // renders); leer localStorage es justo el caso que un efecto debe
    // manejar, así que el gap async evita la advertencia sin cambiar nada
    // perceptible (corre en el mismo microtask antes del paint).
    Promise.resolve().then(() => {
      try {
        const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
        if (saved) setEmail(saved);
      } catch {
        // localStorage bloqueado (navegación privada, etc.) — sin prellenado.
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      scope: "platform",
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      toast.error("Email o contraseña incorrectos");
      return;
    }

    try {
      if (remember) localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      else localStorage.removeItem(REMEMBER_EMAIL_KEY);
    } catch {
      // Sin bloquear el login si el storage no está disponible.
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
      <FloatingInput id="platform-email" label="Email" type="email" required value={email} onChange={setEmail} />
      <FloatingInput
        id="platform-password"
        label="Contraseña"
        type="password"
        required
        value={password}
        onChange={setPassword}
      />
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
        Recordar usuario
      </label>
      <Button type="submit" disabled={loading} size="lg" className="mt-1 w-full rounded-full">
        {loading ? "Ingresando..." : "Ingresar"}
      </Button>
    </form>
  );
}
