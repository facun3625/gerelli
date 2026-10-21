-- AlterTable
ALTER TABLE "PlatformBillingSettings" ALTER COLUMN "setupServiceEnabled" SET DEFAULT false;

-- La fila "global" ya existía antes de esta columna (de whatsapp/billing) y
-- quedó en true por el default de la migración anterior — nadie configuró
-- todavía precio ni pasos, así que no debe mostrarse en la landing.
UPDATE "PlatformBillingSettings" SET "setupServiceEnabled" = false WHERE id = 'global';
