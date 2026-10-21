"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireReseller } from "@/lib/require-reseller";

const passwordSchema = z.string().min(6, "La contraseña debe tener al menos 6 caracteres");

// Mismo caso que en /registro/datos: si el revendedor entró con Google no
// tiene contraseña propia todavía — esto le permite definir una, opcional,
// para poder entrar también sin depender de Google.
export async function setResellerPassword(formData: FormData) {
  const session = await requireReseller();
  const password = passwordSchema.parse(formData.get("password"));

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });
}
