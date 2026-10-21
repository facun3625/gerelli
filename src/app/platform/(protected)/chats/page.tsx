import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const TOPIC_LABELS: Record<string, string> = {
  SETUP_SERVICE: "Armado de tienda",
  CONTACT_CTA: "Quiero empezar",
};

export default async function SalesBotChatsPage() {
  const conversations = await prisma.salesBotConversation.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">Chats del bot de ventas</h1>
        <p className="text-sm text-muted-foreground">
          Conversaciones del asistente en la landing. Las que dejaron nombre y WhatsApp necesitan seguimiento.
        </p>
      </div>

      {conversations.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Todavía no hay conversaciones.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {conversations.map((c) => (
            <details key={c.id} className="group rounded-xl border p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">
                    {c.contactName ? c.contactName : `Conversación ${c.id.slice(-6)}`}
                    {c.contactPhone && <span className="ml-2 text-muted-foreground">· {c.contactPhone}</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {dateFormatter.format(c.createdAt)} · {c.messages.length} mensajes
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {c.topic && (
                    <Badge className="bg-violet-500/15 text-violet-500">{TOPIC_LABELS[c.topic] ?? c.topic}</Badge>
                  )}
                  {c.needsHuman && (
                    <Badge className={c.contactName ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"}>
                      {c.contactName ? "Contacto dejado" : "Pidió humano"}
                    </Badge>
                  )}
                </div>
              </summary>
              <div className="mt-3 flex flex-col gap-2 border-t pt-3">
                {c.messages.map((m) => (
                  <div
                    key={m.id}
                    className={
                      m.role === "user"
                        ? "ml-auto max-w-[80%] rounded-lg rounded-br-sm bg-primary/10 px-3 py-1.5 text-sm"
                        : "mr-auto max-w-[80%] rounded-lg rounded-bl-sm bg-muted px-3 py-1.5 text-sm"
                    }
                  >
                    {m.text}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
