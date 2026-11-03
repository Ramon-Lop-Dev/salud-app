"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (password.length < 10) {
      setErrorMessage("La contraseña debe tener al menos 10 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = getBrowserSupabase();
      const { data: { user }, error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError || !user) {
        setErrorMessage("No se pudo cambiar la contraseña. Inicia sesión de nuevo e inténtalo.");
        return;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", user.id);
      if (profileError) {
        setErrorMessage("La contraseña cambió, pero no pudimos confirmar el cambio obligatorio. Inténtalo de nuevo.");
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
        <h1 className="text-3xl font-bold text-on-surface">Crea tu nueva contraseña</h1>
        <p className="my-4 text-lg text-slate-700">Por seguridad, debe tener al menos 10 caracteres.</p>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-lg font-medium text-on-surface" htmlFor="password">Nueva contraseña</label>
            <input
              autoComplete="new-password"
              className="min-h-14 w-full rounded-lg border-2 border-slate-300 px-4 text-lg focus:border-primary-container focus:outline-none"
              id="password"
              minLength={10}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>
          <div>
            <label className="mb-1 block text-lg font-medium text-on-surface" htmlFor="confirmation">Repite la contraseña</label>
            <input
              autoComplete="new-password"
              className="min-h-14 w-full rounded-lg border-2 border-slate-300 px-4 text-lg focus:border-primary-container focus:outline-none"
              id="confirmation"
              minLength={10}
              onChange={(event) => setConfirmation(event.target.value)}
              required
              type="password"
              value={confirmation}
            />
          </div>
          {errorMessage && <p className="rounded-lg bg-red-50 p-3 text-base text-red-800" role="alert">{errorMessage}</p>}
          <button className="min-h-14 w-full rounded-xl bg-primary-container px-4 text-lg font-semibold text-white disabled:opacity-60" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Guardando…" : "Guardar contraseña"}
          </button>
        </form>
      </section>
    </main>
  );
}
