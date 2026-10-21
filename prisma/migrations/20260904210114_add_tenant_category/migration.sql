-- CreateEnum
CREATE TYPE "TenantCategory" AS ENUM ('CLIENTE', 'DEMO', 'PROMOCION');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "category" "TenantCategory" NOT NULL DEFAULT 'CLIENTE';

-- Las copias de demo (ver DEMO_SUBDOMAINS en src/lib/demo.ts) ya existían
-- antes de este campo — se etiquetan solas para no depender de que alguien
-- lo haga a mano después del deploy.
UPDATE "Tenant" SET "category" = 'DEMO' WHERE "subdomain" IN ('demo1', 'demo2', 'demo3');
