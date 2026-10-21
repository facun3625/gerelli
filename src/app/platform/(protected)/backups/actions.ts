"use server";

import { revalidatePath } from "next/cache";

import { requireSuperAdmin } from "@/lib/require-super-admin";
import { createDatabaseBackup } from "@/lib/backup";

export async function runBackupNow() {
  await requireSuperAdmin();
  await createDatabaseBackup();
  revalidatePath("/platform/backups");
}
