import { ActivateOwnerForm } from "./activate-form";

export default function ActivateOwnerPortalPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold">Activar mi cuenta de propietario</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Si la inmobiliaria ya te habilitó el acceso, ingresá el email y el DNI con los que
          estás registrado para crear tu cuenta.
        </p>
      </div>
      <ActivateOwnerForm />
    </div>
  );
}
