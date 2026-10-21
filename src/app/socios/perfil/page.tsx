import { requireReseller } from "@/lib/require-reseller";
import { SetPasswordForm } from "../socio-tools";

export default async function SociosPerfilPage() {
  const { reseller } = await requireReseller();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Perfil</h1>
        <p className="text-sm text-muted-foreground">Tu cuenta de socio.</p>
      </div>

      <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-sm font-semibold">Datos</h2>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Nombre: </span>
            {reseller.name ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Email: </span>
            {reseller.email}
          </div>
        </div>
      </section>

      {!reseller.passwordHash && (
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="text-sm font-semibold">Definir contraseña</h2>
          <p className="mt-1 mb-4 text-xs text-muted-foreground">
            Entraste con Google — con eso alcanza. Si además querés poder entrar con contraseña, definila acá.
          </p>
          <SetPasswordForm />
        </section>
      )}
    </div>
  );
}
