"use client";

import { ArrowRight } from "lucide-react";

import { useSalesChat } from "./sales-chat-widget";

export function ContactCtaButton({ label, className }: { label: string; className?: string }) {
  const { openWithTopic } = useSalesChat();

  function handleClick() {
    openWithTopic(
      "CONTACT_CTA",
      "¡Hola! Contame un poco sobre tu inmobiliaria y dejame tu nombre y WhatsApp — te contactamos para ayudarte a arrancar.",
    );
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {label} <ArrowRight className="size-[18px]" />
    </button>
  );
}
