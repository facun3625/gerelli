"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function OnboardingSelect({
  id,
  name,
  options,
  placeholder = "Elegir",
}: {
  id: string;
  name: string;
  options: readonly string[];
  placeholder?: string;
}) {
  return (
    <Select
      name={name}
      items={options.map((value) => ({ value, label: value }))}
    >
      <SelectTrigger
        id={id}
        className="h-10 w-full rounded-xl border-white/15 bg-white/5 px-4 text-white transition-colors hover:bg-white/[.08] focus-visible:border-[#208ab1] focus-visible:ring-[#208ab1]/20 data-placeholder:text-white/35"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        sideOffset={6}
        className="border-white/10 bg-[#111827] text-white shadow-xl shadow-black/40"
      >
        {options.map((value) => (
          <SelectItem
            key={value}
            value={value}
            className="text-white/80 data-highlighted:bg-[#208ab1]/15 data-highlighted:text-white"
          >
            {value}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
