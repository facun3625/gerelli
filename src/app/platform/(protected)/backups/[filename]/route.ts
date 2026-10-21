import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";

import { requireSuperAdmin } from "@/lib/require-super-admin";
import { resolveBackupFilePath } from "@/lib/backup";

// Un route.ts nunca hereda el auth del layout.tsx de su carpeta (los
// layouts solo envuelven páginas) — por eso el chequeo va acá explícito,
// igual que ya hace cada actions.ts de /platform.
export async function GET(_req: Request, { params }: { params: Promise<{ filename: string }> }) {
  try {
    await requireSuperAdmin();
  } catch {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const { filename } = await params;
  const filePath = resolveBackupFilePath(filename);
  if (!filePath) return new NextResponse("Not found", { status: 404 });

  const info = await stat(filePath).catch(() => null);
  if (!info?.isFile()) return new NextResponse("Not found", { status: 404 });

  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(info.size),
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Nunca cachear un dump de la base, ni en el navegador ni en ningún
      // proxy intermedio.
      "Cache-Control": "private, no-store",
    },
  });
}
