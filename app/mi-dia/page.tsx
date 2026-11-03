// app/mi-dia/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";

interface SymptomCategory {
  id: string;
  name: string;
  symptoms: { id: string; label: string }[];
}

export default function MiDiaPage() {
  const router = useRouter();
  const [mood, setMood] = useState("");
  const [activity, setActivity] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<Record<string, string>>({});
  const [otherSymptom, setOtherSymptom] = useState("");
  const [pulse, setPulse] = useState("");
  const [pressure, setPressure] = useState("");
  const [weight, setWeight] = useState("");
  const [sleep, setSleep] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getBrowserSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const entry = {
      user_id: user.id,
      date: new Date().toISOString().split("T")[0],
      mood,
      activity,
      pulse: pulse ? Number(pulse) : null,
      pressure,
      weight: weight ? Number(weight) : null,
      sleep,
      notes,
    };
    const response = await fetch("/api/daily_entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    const result = await response.json();
    if (result.alert) {
      router.push("/alerta-emergencia");
    } else {
      router.refresh();
    }
  };

  // Placeholder categories – actual data should be fetched from Supabase
  const categories: SymptomCategory[] = [];

  return (
    <main className="flex-1 flex flex-col w-full bg-surface p-4 pt-safe pb-safe">
      <h1 className="font-headline-lg text-headline-lg text-on-surface mb-4">Mi Día</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Ánimo */}
        <div>
          <label className="block font-label-md text-label-md text-on-surface mb-1">Ánimo</label>
          <input
            type="text"
            value={mood}
            onChange={e => setMood(e.target.value)}
            className="w-full min-h-[56px] rounded-lg border-2 border-surface-container-low focus:border-primary-container px-4"
            required
          />
        </div>
        {/* Actividad del día */}
        <div>
          <label className="block font-label-md text-label-md text-on-surface mb-1">Actividad del día</label>
          <input
            type="text"
            value={activity}
            onChange={e => setActivity(e.target.value)}
            className="w-full min-h-[56px] rounded-lg border-2 border-surface-container-low focus:border-primary-container px-4"
            required
          />
        </div>
        {/* Síntomas por categoría */}
        {categories.map(cat => (
          <details key={cat.id} className="border rounded-lg p-2">
            <summary className="font-label-lg text-label-lg text-on-surface">{cat.name}</summary>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {cat.symptoms.map(sym => (
                <button
                  key={sym.id}
                  type="button"
                  onClick={() => setSelectedSymptoms(prev => ({ ...prev, [sym.id]: sym.id }))}
                  className={`min-h-[56px] rounded-lg border-2 ${selectedSymptoms[sym.id] ? "border-primary-container" : "border-surface-container-low"}`}
                >
                  {sym.label}
                </button>
              ))}
            </div>
          </details>
        ))}
        {/* Otro síntoma */}
        <div>
          <label className="block font-label-md text-label-md text-on-surface mb-1">Otro: escribir qué pasó</label>
          <textarea
            value={otherSymptom}
            onChange={e => setOtherSymptom(e.target.value)}
            className="w-full min-h-[120px] rounded-lg border-2 border-surface-container-low focus:border-primary-container p-2"
          />
        </div>
        {/* Vitals */}
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Pulso"
            value={pulse}
            onChange={e => setPulse(e.target.value)}
            className="min-h-[56px] rounded-lg border-2 border-surface-container-low focus:border-primary-container px-4"
          />
          <input
            type="text"
            placeholder="Presión"
            value={pressure}
            onChange={e => setPressure(e.target.value)}
            className="min-h-[56px] rounded-lg border-2 border-surface-container-low focus:border-primary-container px-4"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Peso (kg)"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            className="min-h-[56px] rounded-lg border-2 border-surface-container-low focus:border-primary-container px-4"
          />
          <input
            type="number"
            placeholder="Sueño (h)"
            value={sleep}
            onChange={e => setSleep(e.target.value)}
            className="min-h-[56px] rounded-lg border-2 border-surface-container-low focus:border-primary-container px-4"
          />
        </div>
        {/* Comentario */}
        <div>
          <label className="block font-label-md text-label-md text-on-surface mb-1">¿Qué pasó hoy?</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full min-h-[120px] rounded-lg border-2 border-surface-container-low focus:border-primary-container p-2"
          />
        </div>
        {/* Guardar */}
        <button
          type="submit"
          className="w-full min-h-[56px] bg-primary-container text-on-primary-container rounded-xl flex items-center justify-center font-label-lg"
        >
          Guardar mi día
        </button>
      </form>
    </main>
  );
}
