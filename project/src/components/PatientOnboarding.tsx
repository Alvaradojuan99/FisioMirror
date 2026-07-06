import { useState } from 'react';

export function PatientOnboarding({ patientName, onContinue }: { patientName: string; onContinue: () => void }) {
  const [step, setStep] = useState(0);

  const steps = [
    { icon: 'celebration', title: `¡Bienvenido, ${patientName.split(' ')[0]}!`, text: 'Tu fisioterapeuta ha preparado todo para tu recuperación. Estamos aquí para acompañarte.' },
    { icon: 'target', title: 'Rutinas Personalizadas', text: 'Cada día encontrarás ejercicios diseñados específicamente para tu condición. Sigue las instrucciones de tu terapeuta.' },
    { icon: 'monitoring', title: 'Sigue tu Progreso', text: 'Gana puntos por cada sesión completada, desbloquea logros y visualiza tu evolución día a día.' },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #86efac 0%, #4ade80 100%)' }}>
      <div className="w-full max-w-md text-center animate-fade-in">
        <div className="w-24 h-24 rounded-3xl bg-white flex items-center justify-center mx-auto mb-8 shadow-lg animate-scale-in">
          <span className="material-symbols-outlined fill text-primary" style={{ fontSize: 48 }}>{current.icon}</span>
        </div>
        <h1 className="text-2xl font-bold text-on-surface mb-3">{current.title}</h1>
        <p className="text-on-surface-variant leading-relaxed mb-8">{current.text}</p>

        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-8 bg-primary' : 'w-2 bg-white/50'}`} />
          ))}
        </div>

        <button onClick={() => (isLast ? onContinue() : setStep(step + 1))} className="w-full bg-[#00966d] hover:bg-[#007a58] text-white font-bold py-3 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md uppercase">
          {isLast ? <>Comenzar <span className="material-symbols-outlined">check</span></> : <>Continuar <span className="material-symbols-outlined">arrow_forward</span></>}
        </button>

        {!isLast && (
          <button onClick={onContinue} className="mt-3 text-sm text-on-surface-variant/70 hover:text-on-surface">Saltar introducción</button>
        )}
      </div>
    </div>
  );
}
