import { randomBytes } from "node:crypto";
import { resolveTxt } from "node:dns/promises";

export function generateDomainToken() {
  return `urbi-verify-${randomBytes(12).toString("hex")}`;
}

export function verificationRecordName(domain: string) {
  return `_urbi-challenge.${domain}`;
}

// Chequea que el dominio tenga el TXT record esperado en
// _urbi-challenge.<dominio> — así confirmamos que quien pidió el dominio
// realmente controla su DNS antes de empezar a servir la tienda ahí.
export async function verifyDomainTxtRecord(domain: string, token: string): Promise<boolean> {
  try {
    const records = await resolveTxt(verificationRecordName(domain));
    return records.some((chunks) => chunks.join("").trim() === token);
  } catch {
    return false;
  }
}
