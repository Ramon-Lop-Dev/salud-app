"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage("No pudimos iniciar sesión. Revisa tu correo y contraseña e inténtalo de nuevo.");
        return;
      }

      const redirectTo = new URLSearchParams(window.location.search).get("redirect_to");
      const safeRedirect = redirectTo?.startsWith("/") && !redirectTo.startsWith("//")
        ? redirectTo
        : "/";
      router.replace(safeRedirect);
      router.refresh();
    } catch {
      setErrorMessage("No se pudo conectar. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <header className="mb-6">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary-container">Salud Mayor Móvil</p>
          <h1 className="text-3xl font-bold text-on-surface">Iniciar sesión</h1>
          <p className="mt-2 text-lg text-slate-700">Escribe el correo y la contraseña de tu cuenta.</p>
        </header>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-lg font-medium text-on-surface" htmlFor="email">Correo electrónico</label>
            <input
              autoComplete="username"
              className="min-h-14 w-full rounded-lg border-2 border-slate-300 px-4 text-lg focus:border-primary-container focus:outline-none"
              id="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </div>

          <div>
            <label className="mb-1 block text-lg font-medium text-on-surface" htmlFor="password">Contraseña</label>
            <input
              autoComplete="current-password"
              className="min-h-14 w-full rounded-lg border-2 border-slate-300 px-4 text-lg focus:border-primary-container focus:outline-none"
              id="password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>

          {errorMessage && (
            <p className="rounded-lg bg-red-50 p-3 text-base text-red-800" role="alert">
              {errorMessage}
            </p>
          )}

          <button
            className="min-h-14 w-full rounded-xl bg-primary-container px-4 text-lg font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <p className="mt-5 text-center text-base text-slate-700">
          ¿Olvidaste tu contraseña?{" "}
          <a className="font-semibold text-primary-container underline" href="/recuperar">Recupérala aquí</a>
        </p>
      </section>
    </main>
  );
}
