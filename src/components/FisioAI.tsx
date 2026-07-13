import { useState, useRef, useEffect } from 'react';
import type { PatientView } from './PatientLayout';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  { icon: 'back_hand', title: 'Técnicas para dolor lumbar', desc: 'Ejercicios de descompresión y estiramiento.' },
  { icon: 'accessibility_new', title: 'Ejercicios de movilidad', desc: 'Rutinas específicas para el hombro.' },
  { icon: 'medical_services', title: 'Recomendaciones post-cirugía', desc: 'Guías de recuperación controlada.' },
];

const TIPS = [
  { title: 'Regla 20-20-20', text: 'Cada 20 minutos, mira a 20 pies de distancia durante 20 segundos para reducir la tensión cervical y ocular.' },
  { title: 'Estiramientos diarios', text: 'Dedica 10 minutos al día a estiramientos para mantener la flexibilidad y prevenir lesiones.' },
  { title: 'Core fuerte', text: 'Un core fuerte es la base de una buena postura. Incluye ejercicios de estabilidad en tu rutina.' },
  { title: 'Hidratación', text: 'La hidratación adecuada mantiene la elasticidad de los tejidos y previene calambres musculares.' },
  { title: 'Descanso activo', text: 'El descanso activo acelera la recuperación. Caminatas ligeras ayudan a la circulación.' },
  { title: 'Postura al sentarse', text: 'Mantén los pies apoyados, espalda recta y hombros relajados. Evita cruzar las piernas por largos periodos.' },
];

export function FisioAI({ onNavigate }: { onNavigate: (v: PatientView) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const welcomeMessage: ChatMessage = {
    role: 'assistant',
    content: '¡Hola! Soy Fisio, tu asistente IA de FisioMirror. Estoy aquí para ayudarte con consultas sobre ejercicios, técnicas y recomendaciones de fisioterapia y rehabilitación.\n\nRecuerda que esta información es orientativa. Siempre es importante acudir a la consulta y seguir las recomendaciones de tu Profesional de Fisioterapia.\n\n¿En qué puedo ayudarte hoy?',
  };

  useEffect(() => {
    setMessages([welcomeMessage]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError('');
    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fisio-ai-chat`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Error del servidor (${response.status})`);
      }

      const data = await response.json();

      if (data.error && !data.reply) {
        throw new Error(data.error);
      }

      const reply = data.reply || 'No recibí una respuesta. Intenta nuevamente.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error al conectar con el asistente.';
      setError(errMsg);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: 'Lo siento, tuve un problema al procesar tu consulta. Por favor, intenta nuevamente en un momento. Recuerda que siempre es importante acudir a la consulta con tu Profesional de Fisioterapia.',
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestion = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const tipOfTheDay = TIPS[new Date().getDate() % TIPS.length];

  return (
    <div>
      {/* Header */}
      <header className="bg-surface px-8 py-4 flex items-center gap-4 border-b border-outline-variant/20 sticky top-0 z-30">
        <button onClick={() => onNavigate('dashboard')} className="p-2 rounded-lg hover:bg-surface-container">
          <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
        </button>
        <span className="material-symbols-outlined text-primary" style={{ fontSize: 28 }}>smart_toy</span>
        <h1 className="text-lg font-semibold text-primary">Asistente IA - Fisio</h1>
        <div className="flex-1" />
        <button
          onClick={() => alert('Notificaciones: No hay nuevas notificaciones')}
          className="p-2 rounded-lg hover:bg-surface-container"
        >
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 22 }}>notifications</span>
        </button>
      </header>

      <div className="flex gap-6 p-6 h-[calc(100vh-73px)] overflow-hidden">
        {/* Chat Container */}
        <div className="flex-1 flex flex-col glass-card rounded-3xl overflow-hidden">
          {/* Chat Feed */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 chat-scroll">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} ${msg.role === 'user' ? 'max-w-2xl ml-auto' : 'max-w-2xl'}`}>
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  msg.role === 'assistant'
                    ? 'bg-primary'
                    : 'bg-surface-container-high border border-outline-variant'
                }`}>
                  <span
                    className={`material-symbols-outlined ${msg.role === 'assistant' ? 'text-white' : 'text-on-surface-variant'}`}
                    style={{ fontSize: 22, fontVariationSettings: msg.role === 'assistant' ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {msg.role === 'assistant' ? 'smart_toy' : 'person'}
                  </span>
                </div>

                {/* Message bubble */}
                <div className={`p-5 shadow-sm whitespace-pre-wrap ${
                  msg.role === 'assistant'
                    ? 'bg-white border border-outline-variant rounded-r-2xl rounded-bl-2xl'
                    : 'bg-primary text-white rounded-l-2xl rounded-br-2xl'
                }`}>
                  <p className={`text-sm leading-relaxed ${msg.role === 'assistant' ? 'text-on-surface' : 'text-white'}`}>
                    {msg.content}
                  </p>
                  {msg.role === 'assistant' && (
                    <span className="text-[10px] text-on-surface-variant mt-3 block uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {i === 0 ? 'ASISTENTE FISIO • AHORA' : 'FISIO IA'}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Suggestion Grid (only on first message) */}
            {messages.length === 1 && !loading && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.title}
                    onClick={() => handleSuggestion(s.title)}
                    className="flex flex-col items-start p-4 bg-white border border-outline-variant rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left group"
                  >
                    <span className="material-symbols-outlined text-primary mb-2" style={{ fontSize: 24 }}>{s.icon}</span>
                    <span className="text-sm font-semibold text-on-surface">{s.title}</span>
                    <span className="text-xs text-on-surface-variant mt-1">{s.desc}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-4 max-w-2xl">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-white animate-pulse" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
                </div>
                <div className="bg-white border border-outline-variant rounded-r-2xl rounded-bl-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-sm text-on-surface-variant ml-2">Fisio está escribiendo...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="max-w-2xl mx-auto bg-error/10 border border-error/30 rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-error" style={{ fontSize: 20 }}>error</span>
                <p className="text-sm text-error">{error}</p>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-6 bg-white/50 border-t border-outline-variant/30">
            <form onSubmit={handleSubmit} className="relative flex items-center gap-3">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribe tu consulta fisioterapéutica aquí..."
                  disabled={loading}
                  className="w-full bg-white border border-outline-variant rounded-full py-4 pl-6 pr-16 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-sm disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>send</span>
                </button>
              </div>
            </form>
            <p className="text-[10px] text-center text-on-surface-variant mt-4 uppercase tracking-widest" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              Asistente IA especializado en fisioterapia y rehabilitación
            </p>
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="w-80 flex flex-col gap-6 hidden lg:flex">
          {/* Disclaimer Card */}
          <div className="bg-primary text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-white/80" style={{ fontSize: 20 }}>health_and_safety</span>
                <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Importante</span>
              </div>
              <h4 className="font-bold text-base mb-2">Consulta Profesional</h4>
              <p className="text-sm text-white/90 leading-snug">
                La información proporcionada por Fisio IA es orientativa. Siempre acude a la consulta y sigue las recomendaciones de tu Profesional de Fisioterapia.
              </p>
            </div>
            <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-8xl text-white/10 rotate-12" style={{ fontSize: 96 }}>spa</span>
          </div>

          {/* Tip of the Day */}
          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>lightbulb</span>
              <span className="text-[10px] uppercase tracking-widest font-semibold text-on-surface-variant" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Tip del Día</span>
            </div>
            <h4 className="font-bold text-lg mb-2 text-on-surface">{tipOfTheDay.title}</h4>
            <p className="text-sm text-on-surface-variant leading-snug">{tipOfTheDay.text}</p>
          </div>

          {/* About Fisio */}
          <div className="glass-card rounded-3xl p-6">
            <h3 className="font-bold text-sm mb-4 text-on-surface">Sobre Fisio IA</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>exercise</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-on-surface">Ejercicios y Técnicas</p>
                  <p className="text-xs text-on-surface-variant">Consultas sobre fortalecimiento, estiramiento y movilidad.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>rehab</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-on-surface">Rehabilitación</p>
                  <p className="text-xs text-on-surface-variant">Guías de recuperación post-lesión y post-quirúrgica.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>accessibility</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-on-surface">Prevención</p>
                  <p className="text-xs text-on-surface-variant">Consejos de ergonomía, postura y prevención de lesiones.</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
