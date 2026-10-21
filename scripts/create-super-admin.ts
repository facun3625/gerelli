import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Bootstrap del primer SUPER_ADMIN de la plataforma. No hay ninguna forma
// de crear uno desde la UI a propósito (register-platform solo crea
// CUSTOMER) — la primera vez hace falta este script; de ahí en más, el
// propio super admin gestiona el resto desde /platform.
// Re-ejecutable: si el email ya existe como super admin, solo actualiza la
// contraseña (sirve para resetearla).
//
// Correr con:
//   npx tsx --env-file=.env scripts/create-super-admin.ts <email> <password> ["Nombre"]
const [, , email, password, name] = process.argv;

if (!email || !password) {
  console.error("Uso: npx tsx --env-file=.env scripts/create-super-admin.ts <email> <password> [\"Nombre\"]");
  process.exit(1);
}
if (password.length < 6) {
  console.error("La contraseña tiene que tener al menos 6 caracteres.");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL!;
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);

  // tenantId es null acá (super admin, no pertenece a ninguna tienda) — el
  // atajo de clave compuesta @@unique([tenantId, email]) no acepta null en
  // Prisma, así que se busca con findFirst en vez de upsert directo.
  const existing = await db.user.findFirst({ where: { tenantId: null, email } });

  if (existing) {
    if (existing.role !== "SUPER_ADMIN") {
      console.error(`Ya existe un usuario con ese email pero con rol ${existing.role}, no SUPER_ADMIN. No se tocó.`);
      process.exit(1);
    }
    await db.user.update({ where: { id: existing.id }, data: { passwordHash, ...(name ? { name } : {}) } });
    console.log(`Contraseña actualizada para el super admin existente: ${email}`);
    return;
  }

  await db.user.create({
    data: { tenantId: null, email, passwordHash, name: name ?? "Super Admin", role: "SUPER_ADMIN" },
  });
  console.log(`Super admin creado: ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
