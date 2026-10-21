"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { RefObject } from "react";
import { Building2Icon, ChevronDownIcon, HouseIcon, WrenchIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  platformModuleForPath,
  type PlatformModuleKey,
  type PlatformModuleOption,
} from "@/lib/platform-modules";
import { cn } from "@/lib/utils";

const moduleIcons = {
  real_estate: HouseIcon,
  consortium: Building2Icon,
  post_sale: WrenchIcon,
} satisfies Record<PlatformModuleKey, typeof HouseIcon>;

export function ModuleSwitcher({
  modules,
  container,
}: {
  modules: PlatformModuleOption[];
  container?: RefObject<HTMLElement | null>;
}) {
  const pathname = usePathname();
  if (modules.length <= 1) return null;

  const activeKey = platformModuleForPath(pathname);
  const active = modules.find((module) => module.key === activeKey) ?? modules[0];
  const ActiveIcon = moduleIcons[active.key];

  return (
    <>
      <nav
        aria-label="Cambiar módulo"
        className="hidden items-center gap-1 rounded-xl border bg-muted/40 p-1 sm:flex"
      >
        {modules.map((module) => {
          const Icon = moduleIcons[module.key];
          const selected = module.key === active.key;
          return (
            <Link
              key={module.key}
              href={module.href}
              aria-current={selected ? "page" : undefined}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors",
                selected
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              <span className="hidden md:inline">{module.label}</span>
              <span className="md:hidden">{module.shortLabel}</span>
            </Link>
          );
        })}
      </nav>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label="Cambiar módulo"
              className="flex h-9 items-center gap-2 rounded-xl border bg-background px-3 text-xs font-semibold shadow-sm sm:hidden"
            />
          }
        >
          <ActiveIcon className="size-4 text-primary" />
          {active.shortLabel}
          <ChevronDownIcon className="size-3 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-48 p-1.5" container={container}>
          {modules.map((module) => {
            const Icon = moduleIcons[module.key];
            return (
              <DropdownMenuItem
                key={module.key}
                render={<Link href={module.href} />}
                className={cn("gap-2.5", module.key === active.key && "bg-muted font-semibold")}
              >
                <Icon className="size-4" />
                {module.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
