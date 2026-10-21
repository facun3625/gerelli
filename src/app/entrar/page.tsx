import { Suspense } from "react";

import { EntrarContent } from "./entrar-content";

export default function EntrarPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030712] px-4 text-white">
      <Suspense>
        <EntrarContent />
      </Suspense>
    </main>
  );
}
