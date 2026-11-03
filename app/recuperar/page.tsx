"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/cambiar-contrasena`,
      });

      setMessage(error
        ? "No se pudo enviar el correo. Revisa la dirección e inténtalo de nuevo."
        : "Si el correo está asociado a una cuenta, recibirás instrucciones para recuperar la contraseña.");
    } catch {
      setMessage("No se pudo conectar. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <h1 className="text-3xl font-bold text-on-surface">Recuperar contraseña</h1>
        <p className="my-4 text-lg text-slate-700">Te enviaremos instrucciones al correo de tu cuenta.</p>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-lg font-medium text-on-surface" htmlFor="email">Correo electrónico</label>
            <input
              autoComplete="email"
              className="min-h-14 w-full rounded-lg border-2 border-slate-300 px-4 text-lg focus:border-primary-container focus:outline-none"
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </div>
          {message && <p className="rounded-lg bg-blue-50 p-3 text-base text-blue-900" role="status">{message}</p>}
          <button className="min-h-14 w-full rounded-xl bg-primary-container px-4 text-lg font-semibold text-white disabled:opacity-60" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Enviando…" : "Enviar instrucciones"}
          </button>
        </form>
        <p className="mt-5 text-center text-base"><Link className="font-semibold text-primary-container underline" href="/login">Volver a iniciar sesión</Link></p>
      </section>
    </main>
  );
}
