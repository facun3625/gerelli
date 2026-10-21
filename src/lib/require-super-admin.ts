import { auth } from "@/auth";

export async function requireSuperAdmin() {
  const session = await auth();
  if (session?.user.role !== "SUPER_ADMIN") {
    throw new Error("No autorizado");
  }
  return session;
}
