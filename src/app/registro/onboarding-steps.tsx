import Image from "next/image";
import { cn } from "@/lib/utils";

const STEPS = ["Cuenta", "Plan", "Tu inmobiliaria"];

export function OnboardingSteps({ current }: { current: number }) {
  return (
    <div className="flex flex-col items-center gap-5">
      <Image src="/logo_blanco.svg" alt="Urbi" width={595} height={180} className="h-8 w-auto object-contain" priority />
      <div className="mx-auto flex w-full max-w-md items-center justify-between">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  done ? "bg-[#208ab1] text-white" : active ? "bg-[#208ab1]/20 text-[#51c2ec] ring-1 ring-[#208ab1]" : "bg-white/5 text-white/40",
                )}
              >
                {step}
              </span>
              <span className={cn("text-[10px] font-medium", active || done ? "text-white/80" : "text-white/35")}>{label}</span>
            </div>
            {step < STEPS.length && (
              <span className={cn("mx-2 h-px flex-1", done ? "bg-[#208ab1]" : "bg-white/10")} />
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
