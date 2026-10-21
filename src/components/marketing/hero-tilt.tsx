"use client";

import { useRef, useState } from "react";
import Image from "next/image";

// El float continuo (globals.css, hero-preview-float) queda en el wrapper
// exterior; el tilt por mouse va en un div interno aparte porque ambos
// animan "transform" y una animación CSS + un transform inline en el mismo
// elemento se pisan entre sí.
export function HeroTilt() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -16, y: px * 16 });
  }

  return (
    <div
      id="vista-previa"
      ref={wrapperRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      className="hero-preview-float relative hidden aspect-[4/3] w-full max-h-[380px] scroll-mt-24 lg:block"
      style={{ perspective: "1400px" }}
    >
      <div
        className="relative size-full transition-transform duration-300 ease-out will-change-transform"
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        <Image
          src="/imac.png"
          alt="Vista previa de una página web hecha con Urbi"
          fill
          className="object-contain drop-shadow-[0_35px_60px_rgba(0,0,0,.4)]"
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
        />
      </div>
    </div>
  );
}
