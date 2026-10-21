import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { REGISTER_RULE, clientIp, isRateLimited, recordFailure } from "@/lib/rate-limit";

const registerSchema = z.object({
  name: z.string().min(1, "Ingresá tu nombre"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

// Registro público en urbi.com.ar, sin tienda todavía — el primer paso de
// /registro. A diferencia de /api/auth/register (que crea un cliente DENTRO
// de una tienda ya existente), esto crea un User con tenantId null que
// recién se convierte en ADMIN de una tienda al terminar el onboarding
// (ver /registro/datos/actions.ts).
export async function POST(request: Request) {
  // Mismo criterio que /api/auth/register: este endpoint es público y sin
  // freno se le puede tirar un script encima para crear cuentas en masa.
  const ipKey = `register-platform-ip:${clientIp(request.headers)}`;
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

  const existing = await prisma.user.findFirst({
    where: {
      email,
      OR: [
        { tenantId: null },
        { tenantId: { not: null }, role: "ADMIN" },
      ],
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: existing.tenantId ? "Ese email ya tiene una tienda en Urbi" : "Ya existe una cuenta con ese email" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { tenantId: null, name, email, passwordHash, role: "CUSTOMER" },
  });

  return NextResponse.json({ ok: true });
}
