"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";

// Consume el pase efímero armado por admin/cuenta-urbi/page.tsx (mismo
// mecanismo que login-form.tsx usa para entrar a la inmobiliaria recién creada,
// acá en la dirección contraria: entra al panel de Urbi en el dominio raíz).
export function EntrarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const callbackUrl = searchParams.get("callbackUrl") ?? "/mi-cuenta";

  const [failed, setFailed] = useState(false);
  const used = useRef(false);

  useEffect(() => {
    if (!token || used.current) return;
    used.current = true;
    (async () => {
      const result = await signIn("credentials", { token, scope: "magic-token", redirect: false });
      if (result?.error) {
        setFailed(true);
        toast.error("El link ya venció — ingresá de nuevo desde tu panel.");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (failed || !token) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-medium">Este link ya no es válido.</p>
        <p className="text-xs text-white/50">Volvé a tu panel y probá de nuevo.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Loader2Icon className="size-6 animate-spin text-[#51c2ec]" />
      <p className="text-sm text-white/60">Entrando a tu cuenta Urbi...</p>
    </div>
  );
}
