import Image from "next/image";

export function OnboardingCredit() {
  return (
    <a
      href="https://kubbo.com.ar"
      target="_blank"
      rel="noopener noreferrer"
      className="mx-auto flex items-center justify-center gap-3 text-sm text-white/45 transition-colors hover:text-white/70"
    >
      <span>Desarrollo de</span>
      <Image src="/logo.png" alt="Kubbo" width={1767} height={631} className="h-6 w-auto object-contain" />
    </a>
  );
}
