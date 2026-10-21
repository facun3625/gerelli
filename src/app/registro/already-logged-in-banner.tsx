"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export function AlreadyLoggedInBanner({ email, label }: { email: string; label: string }) {
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    // redirect:false + recarga dura a propósito: el redirect propio de
    // signOut() puede reusar la navegación del router y mostrar la versión
    // cacheada de esta misma página con el banner todavía puesto. Una
    // recarga completa garantiza que el server vuelva a leer la sesión de
    // cero, ya sin cookie.
    await signOut({ redirect: false });
    window.location.href = "/registro";
  }

  return (
    <div className="mb-5 flex flex-col gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-200">
      <p>
        Ya iniciaste sesión como <span className="font-medium text-white">{email}</span> ({label}). Para
        crear otra tienda, primero cerrá esa sesión.
      </p>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={pending}
        className="self-start rounded-lg border border-amber-500/40 px-3 py-1.5 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
      >
        {pending ? "Cerrando sesión..." : "Cerrar esa sesión"}
      </button>
    </div>
  );
}
