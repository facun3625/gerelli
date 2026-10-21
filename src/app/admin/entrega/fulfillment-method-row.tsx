"use client";

import { toast } from "sonner";

import { ToggleRow } from "@/components/admin/toggle-row";
import type { FulfillmentType } from "@/generated/prisma/client";
import { setFulfillmentMethodEnabled } from "./actions";

export function FulfillmentMethodRow({
  type,
  title,
  description,
  enabled,
}: {
  type: FulfillmentType;
  title: string;
  description: string;
  enabled: boolean;
}) {
  return (
    <ToggleRow
      title={title}
      description={description}
      enabled={enabled}
      onToggle={async (checked) => {
        const result = await setFulfillmentMethodEnabled(type, checked);
        if ("error" in result) toast.error(result.error);
      }}
    />
  );
}
