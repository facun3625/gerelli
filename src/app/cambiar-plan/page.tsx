import { notFound } from "next/navigation";

// El cambio de plan ahora vive dentro del panel de cada tienda. Conservamos
// la ruta como 404 controlado para invalidar enlaces antiguos sin revivir el
// flujo separado de tokens y pagos simulados.
export default function LegacyPlanChangePage() {
  notFound();
}
