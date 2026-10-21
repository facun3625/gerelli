import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { REGISTER_RULE, clientIp, isRateLimited, recordFailure } from "@/lib/rate-limit";

const registerSchema = z.object({
  name: z.string().min(1, "Ingresá tu nombre"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export async function POST(request: Request) {
  // El tenant se resuelve del subdominio de la request, nunca del body:
  // así nadie puede registrar una cuenta en un tenant ajeno manipulando el body.
  const tenant = await getCurrentTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
  }

  // Freno para que nadie llene la base de cuentas basura desde un script.
  const ipKey = `register-ip:${clientIp(request.headers)}`;
  if (await isRateLimited(ipKey, REGISTER_RULE)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Probá de nuevo en un rato." },
      { status: 429 },
    );
  }
  await recordFailure(ipKey);

  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Ya existe una cuenta con ese email" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { tenantId: tenant.id, name, email, passwordHash, role: "CUSTOMER" },
  });

  return NextResponse.json({ ok: true });
}
