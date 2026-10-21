"use client";

import { useTransition } from "react";
import { ArrowRightIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { joinResellerProgram } from "./actions";

// Botón en vez de <form action={...}>: la action puede devolver un motivo por
// el que no se pudo (cuenta pausada, por ejemplo) y un form action no tiene
// dónde mostrarlo. El caso feliz redirige a /socios desde el servidor.
export function JoinResellerButton() {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const result = await joinResellerProgram();
        if (result && "error" in result) toast.error(result.error);
      } catch {
        toast.error("Se cortó la conexión. Probá de nuevo.");
      }
    });
  }

  return (
    <Button onClick={handleClick} disabled={pending} className="w-full sm:w-auto">
      {pending ? "Activando…" : "Quiero ser socio"}
      <ArrowRightIcon className="size-4" />
    </Button>
  );
}
