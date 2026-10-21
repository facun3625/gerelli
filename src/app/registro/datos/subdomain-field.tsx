"use client";

import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, X } from "lucide-react";

import { checkSubdomainAvailability } from "./actions";

type Status = "idle" | "checking" | "available" | "unavailable";

function normalizeSubdomain(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "")
    .slice(0, 40);
}

export function SubdomainField({ rootDomain }: { rootDomain: string }) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("Mínimo 4 letras, sin espacios ni acentos");
  const requestId = useRef(0);

  useEffect(() => {
    const currentRequest = ++requestId.current;
    if (value.length < 4) return;
    const timer = window.setTimeout(async () => {
      try {
        const result = await checkSubdomainAvailability(value);
        if (currentRequest !== requestId.current) return;
        if ("error" in result) {
          setStatus("unavailable");
          setMessage(result.error);
          return;
        }
        setStatus(result.available ? "available" : "unavailable");
        setMessage(result.message);
      } catch {
        if (currentRequest !== requestId.current) return;
        setStatus("unavailable");
        setMessage("No pudimos comprobarlo. Intentá nuevamente.");
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [value]);

  function handleChange(rawValue: string) {
    const nextValue = normalizeSubdomain(rawValue);
    setValue(nextValue);
    if (nextValue.length === 0) {
      setStatus("idle");
      setMessage("Mínimo 4 letras, sin espacios ni acentos");
    } else if (nextValue.length < 4) {
      const remaining = 4 - nextValue.length;
      setStatus("unavailable");
      setMessage(`Faltan ${remaining} ${remaining === 1 ? "letra" : "letras"}`);
    } else {
      setStatus("checking");
      setMessage("Comprobando disponibilidad...");
    }
  }

  const stateClass = status === "available"
    ? "border-emerald-500/70 ring-2 ring-emerald-500/15"
    : status === "unavailable"
      ? "border-red-500/70 ring-2 ring-red-500/15"
      : "border-white/15 focus-within:border-[#208ab1] focus-within:ring-2 focus-within:ring-[#208ab1]/20";

  return (
    <div>
      <div className={`flex items-center overflow-hidden rounded-xl border bg-white/5 transition-colors ${stateClass}`}>
        <input
          id="subdomain"
          name="subdomain"
          required
          minLength={4}
          maxLength={40}
          pattern="[a-z]+"
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          placeholder="minegocio"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-describedby="subdomain-status"
          className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm text-white outline-none"
        />
        <span className="shrink-0 text-sm text-white/40">.{rootDomain}</span>
        <span className="mx-3 flex size-5 shrink-0 items-center justify-center" aria-hidden="true">
          {status === "checking" && <LoaderCircle className="size-4 animate-spin text-white/45" />}
          {status === "available" && <Check className="size-4 text-emerald-400" />}
          {status === "unavailable" && <X className="size-4 text-red-400" />}
        </span>
      </div>
      <p id="subdomain-status" aria-live="polite" className={`mt-1.5 text-xs ${status === "available" ? "text-emerald-400" : status === "unavailable" ? "text-red-400" : "text-white/35"}`}>
        {message}
      </p>
    </div>
  );
}
