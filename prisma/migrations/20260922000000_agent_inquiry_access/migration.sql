ALTER TYPE "Role" ADD VALUE 'AGENT';
ALTER TABLE "EstateAgent" ADD COLUMN "userId" TEXT, ADD COLUMN "accessEnabled" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "EstateAgent_userId_key" ON "EstateAgent"("userId");
CREATE UNIQUE INDEX "EstateAgent_id_tenantId_key" ON "EstateAgent"("id", "tenantId");
ALTER TABLE "EstateAgent" ADD CONSTRAINT "EstateAgent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EstateInquiry" ADD COLUMN "assignedAgentId" TEXT;
ALTER TABLE "EstateInquiry" ADD CONSTRAINT "EstateInquiry_assignedAgentId_tenantId_fkey" FOREIGN KEY ("assignedAgentId", "tenantId") REFERENCES "EstateAgent"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "EstateInquiry_tenantId_assignedAgentId_idx" ON "EstateInquiry"("tenantId", "assignedAgentId");
