import { WhatsAppIcon } from "@/components/catalog/social-icons";

function buildWhatsappUrl(number: string, message?: string | null) {
  const digits = number.replace(/\D/g, "");
  const query = message?.trim() ? `?text=${encodeURIComponent(message.trim())}` : "";
  return `https://wa.me/${digits}${query}`;
}

export function MarketingWhatsappWidget({
  number,
  message,
}: {
  number: string;
  message?: string | null;
}) {
  return (
    <a
      href={buildWhatsappUrl(number, message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Consultar a Urbi por WhatsApp"
      className="group fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 rounded-full bg-[#25D366] px-3.5 py-3 text-sm font-semibold text-white shadow-[0_12px_36px_rgba(37,211,102,0.32)] transition duration-300 hover:-translate-y-1 hover:bg-[#20bd5a] hover:shadow-[0_16px_42px_rgba(37,211,102,0.42)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#25D366] active:translate-y-0 sm:bottom-7 sm:right-7 sm:px-4"
    >
      <WhatsAppIcon className="size-6 shrink-0 transition-transform duration-300 group-hover:rotate-[-5deg] group-hover:scale-110" />
      <span className="hidden sm:inline">Hablemos por WhatsApp</span>
    </a>
  );
}
