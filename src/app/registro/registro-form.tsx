"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { savePendingReferralCode } from "./actions";

// "/registro" a secas, no un paso fijo: esa página ya sabe reanudar a cada
// quien donde quedó (elegir tienda/socio, plan, pago, datos, o directo a
// /socios si ya es revendedor) — ver registro/page.tsx.
const NEXT_STEP = "/registro";

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v2.99h3.87c2.27-2.09 3.58-5.17 3.58-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.87-2.99c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.09A11.99 11.99 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.27a12 12 0 0 0 0 10.76l4-3.09Z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.62l4 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  );
}

function FloatingInput({
  id,
  label,
  type = "text",
  required,
  value,
  onChange,
  minLength,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  minLength?: number;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;

  return (
    <div className="relative">
      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute left-4 transition-all duration-150 select-none",
          lifted ? "top-2 text-[10px] font-medium text-white/50" : "top-1/2 -translate-y-1/2 text-sm text-white/50",
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
        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 pb-2.5 pt-6 text-sm text-white outline-none transition-colors focus:border-[#208ab1] focus:ring-2 focus:ring-[#208ab1]/20"
        autoComplete={type === "password" ? "new-password" : undefined}
      />
    </div>
  );
}

export function RegistroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  // Código de un revendedor que trajo a esta persona (del QR o del link que
  // repartió: /registro?ref=CODIGO). Se guarda en la cuenta recién creada y
  // se consume al crear la inmobiliaria — ver registro/actions.ts.
  const referralCode = searchParams.get("ref");

  // Si Google (u otro provider) falla, Auth.js vuelve acá con ?error=... en
  // vez de seguir a /registro/plan — sin esto el fallo queda invisible.
  useEffect(() => {
    const error = searchParams.get("error");
    if (!error) return;
    const message =
      error === "OAuthAccountNotLinked"
        ? "Ese email ya tiene una cuenta creada con contraseña — ingresá con tu contraseña o usá otro email."
        : "No se pudo completar el login con Google. Probá de nuevo.";
    toast.error(message);
  }, [searchParams]);

  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/register-platform", {
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
      scope: "onboarding",
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      toast.error("Cuenta creada, pero no se pudo iniciar sesión");
      return;
    }
    if (referralCode) await savePendingReferralCode(referralCode);
    router.push(NEXT_STEP);
    router.refresh();
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10 hover:text-white"
        onClick={() =>
          // El código no sobrevive el ida y vuelta con Google como parámetro
          // de este componente (la página se abandona entera) — viaja en el
          // callbackUrl, y /registro (server) lo guarda al volver, antes de
          // decidir a dónde seguir.
          signIn("google", { callbackUrl: referralCode ? `${NEXT_STEP}?ref=${referralCode}` : NEXT_STEP })
        }
      >
        <GoogleIcon className="size-4" />
        Crear cuenta con Google
      </button>

      <div className="flex items-center gap-3 text-xs text-white/40">
        <span className="h-px flex-1 bg-white/10" />
        o con tu email
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleRegister} className="flex flex-col gap-3">
        <FloatingInput id="register-name" label="Nombre" required value={registerName} onChange={setRegisterName} />
        <FloatingInput id="register-email" label="Email" type="email" required value={registerEmail} onChange={setRegisterEmail} />
        <FloatingInput id="register-password" label="Contraseña" type="password" required minLength={6} value={registerPassword} onChange={setRegisterPassword} />
        <Button type="submit" disabled={loading} size="lg" className="mt-1 w-full rounded-full bg-[#208ab1] text-white hover:bg-[#208ab1]/90">
          {loading ? "Creando cuenta..." : "Crear mi cuenta"}
        </Button>
      </form>
      <p className="text-center text-xs leading-relaxed text-white/45">
        Al crear tu cuenta aceptás los <Link href="/terminos" target="_blank" className="underline hover:text-white">Términos de uso</Link> y la <Link href="/privacidad" target="_blank" className="underline hover:text-white">Política de privacidad</Link>.
      </p>
    </div>
  );
}
