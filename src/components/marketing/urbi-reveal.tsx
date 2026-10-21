"use client";

import { useEffect, useRef, useState } from "react";

type Direction = "left" | "right" | "up";

const hiddenClass: Record<Direction, string> = {
  left: "-translate-x-10",
  right: "translate-x-10",
  up: "translate-y-8",
};

export function UrbiReveal({
  children,
  direction = "up",
  delay = 0,
  className = "",
  pop = false,
}: {
  children: React.ReactNode;
  direction?: Direction;
  delay?: number;
  className?: string;
  // Entrada con más onda: suma un ligero scale-in y un easing con rebote,
  // en vez del fade/slide liso por default. Opt-in para no alterar el
  // resto de los usos ya existentes de este componente.
  pop?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.unobserve(entry.target);
      },
      { threshold: 0.12, rootMargin: "0px 0px -7%" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} transform-gpu transition-[opacity,transform] motion-reduce:translate-x-0 motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:opacity-100 ${
        pop ? "duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]" : "duration-700 ease-out"
      } ${
        visible
          ? "translate-x-0 translate-y-0 scale-100 opacity-100"
          : `${hiddenClass[direction]} ${pop ? "scale-90" : ""} opacity-0`
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
