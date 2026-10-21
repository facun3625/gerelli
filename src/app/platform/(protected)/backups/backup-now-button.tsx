"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { runBackupNow } from "./actions";

export function BackupNowButton() {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await runBackupNow();
        toast.success("Backup creado");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo crear el backup");
      }
    });
  }

  return (
    <Button type="button" disabled={pending} onClick={handleClick}>
      {pending ? "Generando backup..." : "Backup manual"}
    </Button>
  );
}
