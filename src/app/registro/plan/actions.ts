"use server";

import { redirect } from "next/navigation";

import { ActionError, toUserError } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { requireOnboardingUser } from "@/lib/require-onboarding";

export async function choosePlan(planId: string, billingCycle: "MONTHLY" | "ANNUAL") {
  try {
    return await runChoosePlan(planId, billingCycle);
  } catch (err) {
    return toUserError(err, "No se pudo elegir el plan");
  }
}

async function runChoosePlan(planId: string, billingCycle: "MONTHLY" | "ANNUAL") {
  const session = await requireOnboardingUser();

  const plan = await prisma.plan.findUnique({ where: { id: planId, active: true } });
  if (!plan) throw new ActionError("Ese plan ya no está disponible");
  if (billingCycle === "ANNUAL" && plan.priceAnnual === null) {
    throw new ActionError("Ese plan no ofrece facturación anual");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      pendingPlanId: plan.id,
      pendingBillingCycle: billingCycle,
      pendingSubscriptionId: null,
      pendingSubscriptionStatus: null,
      onboardingPaidAt: null,
    },
  });

  redirect("/registro/datos");
}
