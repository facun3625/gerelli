"use client";

import type { ReactNode } from "react";
import { scrollToAnchor } from "@/lib/anchor-scroll";

// Para un link "#id" dentro de la misma página — evita convertir a client
// toda una sección server-only solo por este botón.
export function AnchorScrollLink({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  return (
    <a
      href={`#${id}`}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        scrollToAnchor(id);
        window.history.pushState(null, "", `/#${id}`);
      }}
    >
      {children}
    </a>
  );
}
