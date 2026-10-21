function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <h3 className="font-medium">{title}</h3>
      <div className="flex flex-col gap-1.5 text-sm text-muted-foreground [&_b]:font-medium [&_b]:text-foreground">
        {children}
      </div>
    </div>
  );
}

export function DocumentacionTab() {
  return (
    <div className="flex flex-col gap-3">
      <Section title="Tienda abierta / cerrada">
        <p>
          El switch del panel superior (arriba a la derecha, en todas las páginas del admin) apaga
          la tienda entera — los clientes ven un cartel de &quot;Tienda cerrada&quot; y no se puede
          hacer ningún pedido, sea cual sea el modo de fechas o los horarios configurados. Usalo
          para vacaciones, un problema puntual, o cualquier corte manual que no dependa del
          calendario.
        </p>
      </Section>

      <Section title="Cómo vendés">
        <p>
          <b>Horario semanal:</b> la tienda toma pedidos solo dentro de ventanas horarias fijas por
          día (ej. lunes 9 a 18hs). Se configura en Cómo vendés → Modalidad.
        </p>
        <p>
          <b>Ventas programadas:</b> vos abrís fechas puntuales (ej. &quot;sábado 14&quot;) con su
          propio horario de corte y capacidad — la tienda solo vende para esas fechas mientras
          estén abiertas.
        </p>
        <p>
          <b>Stock:</b> se trackea por grupo — cada variante puede tener su propio pozo individual o
          compartir uno con otras (ej. distintos sabores de la misma torta), o quedar sin límite. Se
          define por variante en la ficha del producto, y por fecha en Cómo vendés.
        </p>
      </Section>

      <Section title="Pedidos">
        <p>
          Flujo normal: <b>Pendiente de pago</b> (solo transferencia, hasta que revisás el
          comprobante) → <b>Confirmado</b> → <b>Preparando</b> → <b>Listo</b> →{" "}
          <b>Entregado</b>. Un pedido en efectivo entra directo como Confirmado.
        </p>
        <p>
          Cancelar un pedido devuelve el stock descontado — no hace falta ajustar nada a mano.
        </p>
      </Section>

      <Section title="Productos a consultar por WhatsApp">
        <p>
          Activando &quot;Consultar por WhatsApp&quot; en la ficha de un producto (catering,
          encargos grandes, etc.), se oculta el precio y el carrito — el cliente ve un botón que le
          arma un mensaje de WhatsApp precargado con el nombre del producto. Nunca se puede pedir
          por el checkout normal.
        </p>
      </Section>

      <Section title="Usuarios">
        <p>
          Desde Usuarios se puede ver el historial de compras de cualquier cliente, cambiarle el rol
          entre Cliente y Admin, o borrarlo. Un usuario con pedidos asociados no se puede borrar —
          hay que dejarlo así para no perder ese historial.
        </p>
      </Section>

      <Section title="Mail de confirmación">
        <p>
          El envío de mails todavía no está configurado (se está migrando a un proveedor único
          para todas las tiendas). Mientras tanto, la tienda funciona igual, simplemente no llega
          ese mail.
        </p>
      </Section>
    </div>
  );
}
