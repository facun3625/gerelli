import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL!;
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const tenants = await db.tenant.findMany({
    select: {
      subdomain: true,
      planId: true,
      plan: { select: { name: true, allowAiAgent: true } },
      settings: { where: { key: { in: ["ai_agent_enabled", "ai_agent_greeting"] } } },
    },
    orderBy: { createdAt: "desc" },
    take: 15,
  });
  for (const t of tenants) {
    const enabled = t.settings.find((s) => s.key === "ai_agent_enabled")?.value;
    console.log(t.subdomain, "| plan:", t.plan?.name, "| allowAiAgent:", t.plan?.allowAiAgent, "| ai_agent_enabled setting:", enabled);
  }
}

main().finally(() => db.$disconnect());
