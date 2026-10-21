"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogIn } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

export function UrbiLoginDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      scope: "urbi-account",
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      toast.error("Email o contraseña incorrectos");
      return;
    }
    onOpenChange(false);
    router.push("/mi-cuenta");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-white/10 bg-[#0b1220] p-0 text-white shadow-2xl sm:max-w-md">
        <DialogHeader className="border-b border-white/10 px-6 pb-5 pt-6">
          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-[#208ab1]/15 text-[#51c2ec]">
            <LogIn className="size-5" />
          </div>
          <DialogTitle className="text-xl font-bold">Ingresá a tu cuenta Urbi</DialogTitle>
          <DialogDescription className="text-white/55">
            Consultá tu cuenta y desde ahí accedé al panel de tu inmobiliaria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 py-3 text-sm font-semibold transition hover:bg-white/10"
            onClick={() => signIn("google", { callbackUrl: "/mi-cuenta" })}
          >
            <GoogleIcon className="size-5" />
            Continuar con Google
          </button>

          <div className="flex items-center gap-3 text-xs text-white/40">
            <span className="h-px flex-1 bg-white/10" />
            o con tu email
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-white/65">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-[#208ab1] focus:ring-2 focus:ring-[#208ab1]/20"
                placeholder="tu@email.com"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-white/65">Contraseña</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-[#208ab1] focus:ring-2 focus:ring-[#208ab1]/20"
                placeholder="Tu contraseña"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="urbi-btn urbi-btn-primary mt-2 w-full justify-center disabled:pointer-events-none disabled:opacity-60"
            >
              {loading && <LoaderCircle className="size-4 animate-spin" />}
              {loading ? "Ingresando..." : "Ingresar a mi cuenta"}
            </button>
          </form>

          <p className="text-center text-xs text-white/45">
            ¿Todavía no tenés una inmobiliaria?{" "}
            <a href="/registro" className="font-semibold text-[#51c2ec] hover:underline">Creala gratis</a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
