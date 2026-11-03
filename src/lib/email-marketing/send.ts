import "server-only";

import { prisma } from "@/lib/prisma";
import { getStoreSettings } from "@/lib/settings";
import { sendMailBatch } from "@/lib/mailer";
import { getMailBrand, unsubscribeUrl, SITE_URL } from "@/lib/email-marketing/data";
import { applyNameToken, renderMarketingEmail, type MailContent } from "@/lib/email-marketing/templates";

const BATCH_SIZE = 50;
const PAUSE_MS = 1100;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function unsubscribeHeaders(tenantId: string, email: string) {
  const link = unsubscribeUrl(tenantId, email).replace(`${SITE_URL}/baja`, `${SITE_URL}/api/email/unsubscribe`);
  return {
    "List-Unsubscribe": `<${link}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

// Envía una campaña a toda su lista, de a lotes. Corre en segundo plano
// (after() en la acción) — el panel muestra el avance leyendo los
// contadores de la campaña.
export async function runCampaign(campaignId: string) {
  const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return;
  const content = campaign.content as unknown as MailContent;
  const [brand, settings] = await Promise.all([getMailBrand(campaign.tenantId), getStoreSettings(campaign.tenantId)]);

  for (;;) {
    const batch = await prisma.emailCampaignRecipient.findMany({
      where: { campaignId, success: null },
      take: BATCH_SIZE,
      orderBy: { id: "asc" },
    });
    if (batch.length === 0) break;

    const ids = batch.map((r) => r.id);
    try {
      await sendMailBatch(
        campaign.tenantId,
        batch.map((r) => ({
          to: r.email,
          subject: applyNameToken(content.subject, r.name),
          html: renderMarketingEmail(content, brand, {
            recipientName: r.name,
            unsubscribeUrl: unsubscribeUrl(campaign.tenantId, r.email),
          }),
          headers: unsubscribeHeaders(campaign.tenantId, r.email),
        })),
        settings.email,
      );
      await prisma.$transaction([
        prisma.emailCampaignRecipient.updateMany({ where: { id: { in: ids } }, data: { success: true, sentAt: new Date() } }),
        prisma.emailCampaign.update({ where: { id: campaignId }, data: { sentCount: { increment: ids.length } } }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await prisma.$transaction([
        prisma.emailCampaignRecipient.updateMany({ where: { id: { in: ids } }, data: { success: false, error: message.slice(0, 300) } }),
        prisma.emailCampaign.update({ where: { id: campaignId }, data: { failedCount: { increment: ids.length } } }),
      ]);
    }
    await sleep(PAUSE_MS);
  }

  const final = await prisma.emailCampaign.findUnique({ where: { id: campaignId }, select: { sentCount: true } });
  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: { status: final && final.sentCount > 0 ? "SENT" : "FAILED", finishedAt: new Date() },
  });
}
