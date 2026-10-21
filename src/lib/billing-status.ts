export const BILLING_STATUS_LABELS: Record<string, string> = {
  TRIAL: "En trial",
  ACTIVE: "Al día",
  PAST_DUE: "Vencida",
  SUSPENDED: "Suspendida",
};

export const BILLING_STATUS_COLORS: Record<string, string> = {
  TRIAL: "bg-blue-500/15 text-blue-500",
  ACTIVE: "bg-emerald-500/15 text-emerald-500",
  PAST_DUE: "bg-amber-500/15 text-amber-500",
  SUSPENDED: "bg-destructive/15 text-destructive",
};

export function canTenantReceiveOrders(tenant: {
  status?: string;
  billingStatus: string;
  trialEndsAt: Date | null;
}) {
  if (tenant.status === "SUSPENDED") return false;
  if (tenant.billingStatus === "ACTIVE" || tenant.billingStatus === "PAST_DUE") return true;
  return tenant.billingStatus === "TRIAL" && Boolean(tenant.trialEndsAt && tenant.trialEndsAt > new Date());
}
