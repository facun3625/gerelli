import { Building2Icon, CircleDollarSignIcon, FileTextIcon, UsersIcon } from "lucide-react";

const nextAreas = [
  { icon: Building2Icon, label: "Consorcios y edificios" },
  { icon: UsersIcon, label: "Unidades y consorcistas" },
  { icon: CircleDollarSignIcon, label: "Expensas y cobranzas" },
  { icon: FileTextIcon, label: "Documentación y asambleas" },
];

export default function ConsortiumHomePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Consorcios</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Administración de consorcios</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          El entorno ya está separado de Inmobiliaria. Acá construiremos la operación de edificios,
          unidades, expensas, proveedores y comunicaciones.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {nextAreas.map(({ icon: Icon, label }) => (
          <div key={label} className="rounded-2xl border bg-card p-5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
            <p className="mt-4 font-medium">{label}</p>
            <p className="mt-1 text-xs text-muted-foreground">Próximamente</p>
          </div>
        ))}
      </section>
    </div>
  );
}
