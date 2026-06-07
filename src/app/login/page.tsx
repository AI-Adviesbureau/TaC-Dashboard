import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Inloggen — Talenti a Casa" };

export default function LoginPage() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      {/* Zachte achtergrond met huisstijl-accenten */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(1100px 560px at 12% -12%, var(--brand-green-50), transparent 60%), radial-gradient(900px 560px at 112% 8%, var(--brand-blue-50), transparent 55%), var(--bg)",
        }}
      />
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md animate-in">
          <div className="overflow-hidden rounded-[28px] border bg-[var(--surface)] shadow-[var(--shadow-hover)]">
            {/* Kop met logo */}
            <div className="flex flex-col items-center px-8 pt-9 pb-6 text-center">
              <Logo height={64} />
              <h1 className="mt-6 text-2xl font-extrabold tracking-tight">
                Managementdashboard
              </h1>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Inzicht in trajecten, kosten en prestaties
              </p>
            </div>

            <div className="h-px bg-[var(--border)]" />

            {/* Formulier */}
            <div className="px-8 py-7">
              <Suspense>
                <LoginForm />
              </Suspense>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-[var(--muted)]">
            Met passie, in harmonie en eerlijkheid · Talenti&nbsp;a&nbsp;Casa
          </p>
        </div>
      </div>
    </main>
  );
}
