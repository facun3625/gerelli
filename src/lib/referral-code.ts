import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";

// Código propio de un revendedor para repartir — corto y sin caracteres
// ambiguos (0/O, 1/I), porque alguien lo va a tipear a mano alguna vez
// además de escanearlo en el QR.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomSegment(length: number) {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

// Reintenta ante la remota chance de colisión — más simple y más seguro que
// confiar en que 8 caracteres al azar nunca se repiten dos veces.
export async function generateReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomSegment(8);
    const existing = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
  throw new Error("No se pudo generar un código de referido único");
}
