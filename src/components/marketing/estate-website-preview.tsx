import { ArrowUpRight, Building2, MapPin, Search } from "lucide-react";

/** A public website example, deliberately labelled and separate from tenant data. */
export function EstateWebsitePreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#d8e4ed] bg-white text-[#133453] shadow-[0_35px_90px_-35px_rgba(19,52,83,.4)]">
      <div className="flex items-center gap-3 border-b border-[#e5edf2] bg-[#f9fbfc] px-4 py-3">
        <div className="flex gap-1" aria-hidden="true">{[0,1,2].map(n=><span key={n} className="size-2 rounded-full bg-[#cbdce7]"/>)}</div>
        <span className="mx-auto truncate text-[10px] text-[#718697]">El sitio web de tu inmobiliaria</span>
        <span className="size-3"/>
      </div>
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2"><Building2 className="size-5 text-[#208ab1]"/><span className="text-xs font-semibold tracking-wide">HORIZONTE<span className="block text-[7px] font-normal tracking-[.22em]">INMOBILIARIA</span></span></div>
        <div className="flex gap-3 text-[8px] text-[#718697]"><span>Propiedades</span><span>Nosotros</span><span>Contacto</span></div>
      </div>
      <div className="relative overflow-hidden bg-[#133453] px-5 pb-8 pt-8 sm:px-7">
        <div className="relative z-10 max-w-[65%]"><p className="text-[8px] uppercase tracking-[.18em] text-[#7ed5e7]">Un lugar para tu próxima etapa</p><p className="mt-3 text-2xl font-semibold leading-tight text-white sm:text-3xl">Tu próximo hogar<br/>empieza acá.</p><p className="mt-3 text-[10px] leading-relaxed text-[#b2cddd]">Propiedades en venta y alquiler.<br/>Personas que te acompañan.</p></div>
        <svg aria-hidden="true" viewBox="0 0 220 200" className="absolute -bottom-2 -right-3 h-48 w-52 opacity-90"><circle cx="147" cy="47" r="47" fill="#20516e"/><path d="M55 200V70L135 35V200" fill="#4a859b"/><path d="M135 35L200 80V200H135" fill="#2d657f"/><path d="M0 200V130L79 100V200" fill="#9cc7d4"/><path d="M79 100L124 130V200H79" fill="#6b9caf"/>{[0,1,2,3].map(i=><g key={i}><path d={`M69 ${88+i*26}l18 -7v15l-18 7zM102 ${76+i*26}l18 -7v15l-18 7z`} fill="#d5eef3"/><path d={`M151 ${73+i*27}l15 9v14l-15 -9zM177 ${90+i*27}l13 8v14l-13 -8z`} fill="#92c7d6"/></g>)}<path d="M16 146l19 -7v22l-19 7zM48 134l17 -7v22l-17 7z" fill="#fff"/><path d="M0 198H220" stroke="#12a7cd" strokeWidth="4"/></svg>
      </div>
      <div className="relative mx-5 -mt-3 flex items-center gap-2 rounded-lg border border-[#e2ebf2] bg-white px-3 py-3 shadow-sm"><MapPin className="size-3 text-[#8298a9]"/><span className="flex-1 text-[9px] text-[#8298a9]">¿Dónde querés vivir?</span><span className="text-[9px] text-[#61758a]">Venta / Alquiler</span><span className="rounded-md bg-[#1e658c] p-2 text-white"><Search className="size-3"/></span></div>
      <div className="p-5"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold">Encontrá tu lugar</p><span className="text-[9px] text-[#208ab1]">Ver propiedades →</span></div><div className="grid grid-cols-2 gap-3">{[{title:"Departamento con balcón",zone:"Nueva Córdoba",type:"Venta",color:"#e1edf2"},{title:"Casa con jardín",zone:"Zona norte",type:"Alquiler",color:"#e6efe9"}].map((p,i)=><div key={p.title} className="overflow-hidden rounded-lg border border-[#e3ebf0]"><div className="relative flex h-20 items-end justify-center overflow-hidden sm:h-24" style={{background:p.color}}><span className="absolute left-2 top-2 rounded bg-white px-1.5 py-0.5 text-[7px] font-semibold">{p.type}</span><Building2 strokeWidth={.8} className={`h-16 w-20 ${i?"text-[#8da698]":"text-[#84a6b8]"}`}/></div><div className="p-2.5"><p className="text-[10px] font-semibold">{p.title}</p><p className="mt-1 text-[8px] text-[#8294a3]">{p.zone}</p>{!compact&&<div className="mt-2 flex items-center justify-between border-t border-[#edf2f5] pt-2"><span className="text-[8px] text-[#61758a]">Fotos y detalles</span><ArrowUpRight className="size-3 text-[#208ab1]"/></div>}</div></div>)}</div></div>
      <p className="border-t border-[#edf2f5] px-4 py-2 text-right text-[9px] text-[#718697]">Ejemplo ilustrativo · Tu web lleva tu propia marca</p>
    </div>
  );
}
