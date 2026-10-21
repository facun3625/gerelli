"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireOnboardingUser } from "@/lib/require-onboarding";
import { generateReferralCode } from "@/lib/referral-code";
import { notifyPlatformNewReseller } from "@/lib/telegram";

// Le genera el código de referido — no hace falta que nadie lo apruebe, ver
// plan del programa de revendedores. A propósito NO toca `role`: seguir
// siendo CUSTOMER acá es lo que le deja, más adelante, también crear su
// propia tienda sin que "ser socio" se lo impida (ver requireReseller,
// que gatea por tener código, no por rol).
//
// `redirectTo` deja reusar esta misma acción para "solo socio" (vuelve a
// /socios) y para "quiero las dos cosas" (sigue directo a elegir plan, sin
// pasar dos veces por esta pantalla).
export async function becomeReseller(redirectTo: string) {
  const session = await requireOnboardingUser();

  const referralCode = await generateReferralCode();
  await prisma.user.update({
    where: { id: session.user.id },
    data: { referralCode },
  });

  notifyPlatformNewReseller({
    name: session.user.name ?? null,
    email: session.user.email ?? "",
    referralCode,
  }).catch(() => {});

  redirect(redirectTo);
}
