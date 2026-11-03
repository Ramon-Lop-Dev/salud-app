// app/alerta-emergencia/page.tsx
"use client";
import { useRouter } from "next/navigation";

export default function AlertaEmergenciaPage() {
  const router = useRouter();
  const handleBack = () => {
    router.back();
  };
  return (
    <aside className="w-full bg-[#FEE2E2] px-5 py-2 text-[#991B1B] shadow-[0_1px_8px_rgba(0,0,0,0.04)]" role="alert">
      <div className="max-w-lg mx-auto flex items-start gap-2">
        <span aria-hidden="true" className="material-symbols-outlined text-[32px] shrink-0 text-[#991B1B] select-none">emergency</span>
        <div className="flex-1 flex flex-col gap-1">
          <p className="font-label-md text-label-md text-[#991B1B]">Aviso médico urgente</p>
          <p className="font-body-md text-body-md text-[#991B1B]">Si tienes desmayo, dolor fuerte de pecho o falta de aire intensa, llama a emergencias. Esta app no reemplaza la atención médica.</p>
          <div className="pt-1">
            <a className="inline-flex items-center gap-2 font-label-md text-label-md text-[#991B1B] underline min-h-[44px] py-1" href="tel:112">
              <span className="material-symbols-outlined text-[24px]">call</span>
              <span>Llamar a emergencias (112 / 911)</span>
            </a>
          </div>
        </div>
      </div>
      <div className="w-full flex flex-col gap-2 mt-2">
        <a className="w-full min-h-[56px] bg-primary-container text-on-primary rounded-xl flex items-center justify-center gap-2 px-4 shadow-md active:translate-y-0.5 no-underline" href="tel:112">
          <span className="material-symbols-outlined text-[36px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>call</span>
          <div className="flex flex-col text-left leading-tight">
            <span className="font-headline-md text-headline-md text-on-primary">Llamar a emergencias</span>
            <span className="font-label-md text-label-md text-on-primary opacity-95">Marcar 112 / 911</span>
          </div>
        </a>
        <a className="w-full min-h-[56px] bg-primary-container text-on-primary rounded-xl flex items-center justify-center gap-2 px-4 shadow-md active:translate-y-0.5 no-underline" href="tel:+34600112233">
          <span className="material-symbols-outlined text-[32px] shrink-0">contact_phone</span>
          <div className="flex flex-col text-left leading-tight">
            <span className="font-label-lg text-label-lg text-on-primary">Llamar a mi contacto</span>
            <span className="font-label-sm text-label-sm text-on-primary-container">Mariana (Hija / Cuidadora)</span>
          </div>
        </a>
      </div>
      <div className="w-full mt-2">
        <button className="w-full min-h-[56px] bg-surface-container-highest text-on-surface rounded-xl flex items-center justify-center gap-2 px-4 active:translate-y-0.5" onClick={handleBack} type="button">
          <span className="material-symbols-outlined text-[28px] text-secondary">check_circle</span>
          <span className="font-label-lg text-label-lg text-on-surface">Ya estoy bien, volver</span>
        </button>
      </div>
    </aside>
  );
}
