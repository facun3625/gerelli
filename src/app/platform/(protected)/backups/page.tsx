import { DownloadIcon } from "lucide-react";

import { listBackups } from "@/lib/backup";
import { formatFileSize } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { BackupNowButton } from "./backup-now-button";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

export default async function BackupsPage() {
  const backups = await listBackups();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Backups</h1>
          <p className="text-sm text-muted-foreground">
            Copia de la base de datos. Se genera una por día automáticamente y se conservan las últimas 5.
          </p>
        </div>
        <BackupNowButton />
      </div>

      <div className="flex flex-col gap-3">
        {backups.map((backup) => (
          <article
            key={backup.filename}
            className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate font-mono text-sm">{backup.filename}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {dateFormatter.format(backup.createdAt)} · {formatFileSize(backup.sizeBytes)}
              </p>
            </div>
            <Button
              render={<a href={`/platform/backups/${backup.filename}`} download />}
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              <DownloadIcon className="size-4" />
              Descargar
            </Button>
          </article>
        ))}
        {backups.length === 0 && (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Todavía no hay ningún backup.
          </p>
        )}
      </div>
    </div>
  );
}
