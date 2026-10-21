"use client";

import { useActionState } from "react";

import { startDemoSession, type DemoState } from "./actions";

export function DemoEmailForm() {
  const [state, formAction, pending] = useActionState(startDemoSession, { error: "" } as DemoState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-1.5 text-left">
        <label htmlFor="email" className="text-sm font-medium text-white/70">
          Tu email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoFocus
          placeholder="vos@tuemail.com"
          className="h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder:text-white/30 outline-none focus:border-[#51c2ec]"
        />
      </div>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className="urbi-btn urbi-btn-primary h-12 justify-center text-base disabled:opacity-60">
        {pending ? "Entrando…" : "Entrar a la demo"}
      </button>
    </form>
  );
}
