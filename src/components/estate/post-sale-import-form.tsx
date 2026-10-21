"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DownloadIcon, FileSpreadsheetIcon, SearchCheckIcon, UploadIcon } from "lucide-react";

import type {
  PostSaleImportSummary,
  PostSaleImportRowPreview,
} from "@/app/admin/postventa/desarrollos/[developmentId]/import-actions";

type PreviewResult =
  | { ok: true; summary: PostSaleImportSummary; preview: PostSaleImportRowPreview[] }
  | { error: string };
type ImportResult = { ok: true; summary: PostSaleImportSummary } | { error: string };

const TEMPLATE_CSV =
  "unidad,piso,fecha_entrega,propietario_dni,propietario_nombre,propietario_email,propietario_telefono\n" +
  "Torre A - 4B,4,2026-03-15,30111222,,,\n" +
  "Torre A - 4B,4,2026-03-15,28999111,,,\n";

const statusPill = (status: "nueva" | "nuevo" | "existente") =>
  status === "existente"
    ? "bg-muted text-muted-foreground"
    : "bg-primary/10 text-primary";

function SummaryLine({ summary }: { summary: PostSaleImportSummary }) {
  return (
    <p>
      {summary.rows} filas · {summary.unitsCreated} unidades nuevas ({summary.unitsReused} ya
      existían) · {summary.contactsCreated} propietarios nuevos ({summary.contactsReused} ya
      existían)
    </p>
  );
}

function ErrorList({ errors }: { errors: PostSaleImportSummary["errors"] }) {
  if (!errors.length) return null;
  return (
    <div>
      <p className="font-medium text-destructive">{errors.length} fila(s) con problemas:</p>
      <ul className="mt-1 list-inside list-disc text-muted-foreground">
        {errors.slice(0, 20).map((e, i) => (
          <li key={i}>
            Fila {e.row}: {e.message}
          </li>
        ))}
      </ul>
      {errors.length > 20 && <p className="mt-1 text-muted-foreground">y {errors.length - 20} más…</p>}
    </div>
  );
}

export function PostSaleImportForm({
  previewAction,
  importAction,
}: {
  previewAction: (form: FormData) => Promise<PreviewResult>;
  importAction: (form: FormData) => Promise<ImportResult>;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    summary: PostSaleImportSummary;
    rows: PostSaleImportRowPreview[];
  } | null>(null);
  const [result, setResult] = useState<PostSaleImportSummary | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function resetProgress() {
    setMessage("");
    setPreview(null);
    setResult(null);
  }

  // El archivo se guarda en estado (no se relee del <input> al vuelo):
  // React resetea los campos nativos del <form> después de una acción
  // disparada por su prop `action` (la de "Procesar"), así que para cuando
  // se clickea "Importar" el input ya está vacío aunque el nombre siga
  // mostrado — armar el FormData a mano evita depender de ese estado del DOM.
  function buildFormData() {
    const data = new FormData();
    if (file) data.append("file", file);
    return data;
  }

  function runPreview() {
    start(async () => {
      resetProgress();
      const res = await previewAction(buildFormData());
      if ("error" in res) setMessage(res.error);
      else setPreview({ summary: res.summary, rows: res.preview });
    });
  }

  function runImport() {
    start(async () => {
      setMessage("");
      setResult(null);
      const res = await importAction(buildFormData());
      if ("error" in res) setMessage(res.error);
      else {
        setResult(res.summary);
        setPreview(null);
        formRef.current?.reset();
        setFile(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-2xl border bg-muted/20 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Importar unidades y propietarios</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Subí un .csv, .xls o .xlsx. Solo <strong>unidad</strong> y{" "}
            <strong>propietario_dni</strong> son obligatorias. <strong>fecha_entrega</strong> es
            opcional pero conviene cargarla — sin eso no se puede saber si un reclamo todavía está
            en garantía.{" "}
            <span className="font-mono">
              Ej: unidad=Torre A - 4B, piso=4, fecha_entrega=2026-03-15,
              propietario_dni=30111222
            </span>
          </p>
        </div>
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE_CSV)}`}
          download="propietarios.csv"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          <DownloadIcon className="size-3.5" />
          Descargar plantilla
        </a>
      </div>

      <form ref={formRef} className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          required
          accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            resetProgress();
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          <FileSpreadsheetIcon className="size-4" />
          Elegir archivo
        </button>
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {file?.name ?? "Ningún archivo seleccionado"}
        </span>
        <button
          type="button"
          disabled={!file || pending}
          onClick={runPreview}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
        >
          <SearchCheckIcon className="size-4" />
          {pending && !preview && !result ? "Procesando…" : "Procesar"}
        </button>
        <button
          type="button"
          disabled={!preview || pending}
          onClick={runImport}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <UploadIcon className="size-4" />
          {pending && preview ? "Importando…" : "Importar"}
        </button>
      </form>

      {message && <p className="mt-3 text-sm text-destructive">{message}</p>}

      {preview && !result && (
        <div className="mt-4 space-y-3 rounded-xl border bg-card p-4 text-sm">
          <p className="font-medium">Vista previa — todavía no se guardó nada</p>
          <SummaryLine summary={preview.summary} />

          {preview.rows.length > 0 && (
            <div className="max-h-80 overflow-y-auto rounded-lg border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-muted/60">
                  <tr>
                    <th className="px-3 py-2 font-medium">Unidad</th>
                    <th className="px-3 py-2 font-medium">Piso</th>
                    <th className="px-3 py-2 font-medium">DNI</th>
                    <th className="px-3 py-2 font-medium">Nombre</th>
                    <th className="px-3 py-2 font-medium">Estado unidad</th>
                    <th className="px-3 py-2 font-medium">Estado propietario</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.rows.map((r) => (
                    <tr key={r.row}>
                      <td className="px-3 py-1.5">{r.unidad}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.piso || "—"}</td>
                      <td className="px-3 py-1.5">{r.dni}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.nombre || "—"}</td>
                      <td className="px-3 py-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusPill(r.unitStatus)}`}>
                          {r.unitStatus}
                        </span>
                      </td>
                      <td className="px-3 py-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusPill(r.contactStatus)}`}>
                          {r.contactStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <ErrorList errors={preview.summary.errors} />
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-2 rounded-xl border bg-card p-4 text-sm">
          <p className="font-medium text-primary">Importación completa</p>
          <SummaryLine summary={result} />
          <ErrorList errors={result.errors} />
        </div>
      )}
    </div>
  );
}
