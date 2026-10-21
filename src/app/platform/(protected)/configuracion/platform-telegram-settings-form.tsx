"use client";

import { useState, useTransition } from "react";
import { SendIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  removePlatformTelegramSettings,
  savePlatformTelegramSettings,
  sendTestPlatformTelegram,
  type PlatformTelegramTestKind,
} from "./actions";

const TEST_BUTTONS: { kind: PlatformTelegramTestKind; label: string }[] = [
  { kind: "tienda", label: "Probar: tienda nueva" },
  { kind: "revendedor", label: "Probar: revendedor nuevo" },
  { kind: "bot", label: "Probar: lead del bot" },
];

export function PlatformTelegramSettingsForm({ configured, chatId: savedChatId }: { configured: boolean; chatId: string | null }) {
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState(savedChatId ?? "");
  const [pending, startTransition] = useTransition();
  const [testingKind, setTestingKind] = useState<PlatformTelegramTestKind | null>(null);
  const [testPending, startTestTransition] = useTransition();
  const [removePending, startRemoveTransition] = useTransition();

  function save() {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("botToken", botToken.trim());
        formData.set("chatId", chatId.trim());
        const actionResult = await savePlatformTelegramSettings(formData);
        if ("error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        setBotToken("");
        toast.success("Telegram guardado");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });
  }

  function sendTest(kind: PlatformTelegramTestKind) {
    setTestingKind(kind);
    startTestTransition(async () => {
      try {
        const actionResult = await sendTestPlatformTelegram(botToken, chatId, kind);
        if ("error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        toast.success("Mensaje de prueba enviado — revisá tu Telegram");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo enviar el mensaje de prueba");
      }
    });
  }

  function remove() {
    startRemoveTransition(async () => {
      try {
        const actionResult = await removePlatformTelegramSettings();
        if ("error" in actionResult) {
          toast.error(actionResult.error);
          return;
        }
        setBotToken("");
        setChatId("");
        toast.success("Configuración de Telegram eliminada");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo quitar");
      }
    });
  }

  return (
    <div className="grid max-w-3xl gap-6 rounded-xl border p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-500">
          <SendIcon className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold">Avisos por Telegram</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Te manda un mensaje a vos (no a las tiendas) cuando: se crea una inmobiliaria nueva, alguien saca su código de
            revendedor, o alguien deja nombre y WhatsApp en el bot de ventas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="platform-tg-token">Token del bot</Label>
          <Input
            id="platform-tg-token"
            type="password"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder={configured ? "•••••••• (guardado — dejalo vacío para no cambiarlo)" : "123456789:ABC..."}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="platform-tg-chat">Chat ID</Label>
          <Input
            id="platform-tg-chat"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder="-1001234567890"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Creás el bot hablándole a <span className="font-medium text-foreground">@BotFather</span>, lo agregás a tu
        chat/grupo, y sacás el chat ID mandando un mensaje ahí y abriendo{" "}
        <span className="font-mono">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</span>.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          {pending ? "Guardando..." : "Guardar"}
        </Button>
        {TEST_BUTTONS.map((b) => (
          <Button
            key={b.kind}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => sendTest(b.kind)}
            disabled={testPending}
          >
            {testPending && testingKind === b.kind ? "Enviando..." : b.label}
          </Button>
        ))}
        {configured && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={remove}
            disabled={removePending}
            className="text-destructive hover:text-destructive"
          >
            Quitar configuración
          </Button>
        )}
      </div>
    </div>
  );
}
