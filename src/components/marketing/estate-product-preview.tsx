import Image from "next/image";
import { Building2, CalendarDays, ChevronRight, CircleCheck, FileText, LayoutDashboard, MapPin, Search, Users } from "lucide-react";

/** Vista ilustrativa del producto: datos ficticios, sin métricas comerciales inventadas. */
export function EstateProductPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className="urbi-product-preview overflow-hidden rounded-2xl border border-[#d9e6ef] bg-white text-[#133453] shadow-[0_30px_90px_-35px_rgba(19,52,83,.4)]">
      <div className="flex items-center justify-between gap-4 border-b border-[#e6edf3] px-5 py-3">
        <div className="flex gap-1.5" aria-hidden="true">{[0,1,2].map(n=><span key={n} className="size-2 rounded-full bg-[#d9e6ef]" />)}</div>
        <p className="text-[10px] font-medium tracking-wide text-[#617b90]">Tu espacio de trabajo</p>
        <Image src="/favicon2.png" alt="" width={22} height={22} />
      </div>
      <div className="grid grid-cols-[52px_1fr] sm:grid-cols-[120px_1fr]">
        <div className="space-y-5 border-r border-[#e6edf3] bg-[#f7fafc] px-3 py-6">
          {[[LayoutDashboard,"Resumen"],[Building2,"Propiedades"],[Users,"Contactos"],[CalendarDays,"Visitas"],[FileText,"Contratos"]].map(([Icon,label],i)=>{const I=Icon as typeof Building2;return <div key={String(label)} className={`flex items-center gap-2 text-[10px] ${i===1?"font-semibold text-[#16769b]":"text-[#8294a3]"}`}><I className="size-4 shrink-0"/><span className="hidden sm:inline">{String(label)}</span></div>;})}
        </div>
        <div className="min-w-0 p-4 sm:p-6">
          <div className="flex items-center justify-between"><div><p className="text-[9px] font-semibold uppercase tracking-[.15em] text-[#208ab1]">Inmobiliaria Horizonte</p><h3 className="mt-1 text-lg font-semibold">Tu cartera, en orden.</h3></div><span className="flex size-8 items-center justify-center rounded-full bg-[#e5f5fa] text-[10px] font-bold">MH</span></div>
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-[#e3ebf1] px-3 py-2 text-[10px] text-[#8294a3]"><Search className="size-3"/>Buscar una propiedad, contacto o dirección</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-[#e3ebf1]">
              <div className="relative flex h-28 items-end justify-center overflow-hidden bg-[#dcecf2] px-8 pt-4" aria-hidden="true"><div className="absolute left-4 top-4 size-8 rounded-full bg-white/70"/><div className="h-20 w-24 rounded-t-sm bg-[#9abaca] px-3 pt-3"><div className="grid grid-cols-3 gap-2">{Array.from({length:9},(_,i)=><div key={i} className="h-3 bg-[#edf7fa]"/>)}</div></div><div className="h-24 w-20 rounded-t-sm bg-[#133453] px-3 pt-3"><div className="grid grid-cols-2 gap-2">{Array.from({length:6},(_,i)=><div key={i} className="h-4 bg-[#8cd4e8]"/>)}</div></div></div>
              <div className="p-3"><span className="rounded-full bg-[#e8f5ef] px-2 py-1 text-[9px] font-semibold text-[#33735e]">Publicada · Venta</span><p className="mt-3 text-xs font-semibold">Departamento con balcón</p><p className="mt-1 flex items-center gap-1 text-[10px] text-[#8294a3]"><MapPin className="size-3"/>Nueva Córdoba</p></div>
            </div>
            <div className="flex flex-col gap-3"><div className="rounded-xl border border-[#e3ebf1] p-3"><p className="flex items-center gap-2 text-[10px] font-semibold"><CalendarDays className="size-3.5 text-[#208ab1]"/>Próxima visita</p><p className="mt-3 text-xs font-semibold">Lucía · Departamento centro</p><p className="mt-1 text-[10px] text-[#8294a3]">Hoy, 16:30 h</p><p className="mt-3 flex items-center gap-1 text-[9px] text-[#33735e]"><CircleCheck className="size-3"/>Confirmada</p></div><div className="rounded-xl bg-[#133453] p-3 text-white"><p className="text-[10px] text-white/60">Seguimiento comercial</p><p className="mt-2 text-xs font-semibold">Cada consulta, un próximo paso.</p><ChevronRight className="ml-auto mt-2 size-4 text-[#6ad7ed]"/></div></div>
          </div>
          {!compact&&<div className="mt-4 flex items-center gap-2 rounded-xl bg-[#f1f7fa] px-3 py-3 text-[10px] text-[#617b90]"><CircleCheck className="size-4 shrink-0 text-[#208ab1]"/>Propiedades, personas y gestiones conectadas.</div>}
        </div>
      </div>
      <p className="border-t border-[#e6edf3] px-4 py-2 text-right text-[9px] text-[#8294a3]">Vista ilustrativa · Datos de ejemplo</p>
    </div>
  );
}
