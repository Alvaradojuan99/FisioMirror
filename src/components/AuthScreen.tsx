import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { AlertCircle, Loader2, ArrowRight, LogIn, UserPlus } from 'lucide-react';

type Tab = 'paciente' | 'fisioterapeuta';

// Estimate how long the GIF plays (ms). Adjust if the GIF is shorter/longer.
const GIF_DURATION_MS = 4000;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function AuthScreen() {
  const { signInFisio, signUpFisio, signInPatient, pauseNavigation, resumeNavigation } = useAuth();

  const [tab, setTab] = useState<Tab>('paciente');
  const [showFisioRegister, setShowFisioRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gifPhase, setGifPhase] = useState<'idle' | 'fadeOut' | 'showGif'>('idle');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regPass2, setRegPass2] = useState('');
  const [regUniv, setRegUniv] = useState('');
  const [token, setToken] = useState('');
  const [hoverChar, setHoverChar] = useState<Tab | null>(null);

  // Hover overrides the active tab for the illustration highlight
  const activeHighlight: Tab = hoverChar ?? tab;

  const reset = () => setError('');

  const startGif = () => {
    setGifPhase('fadeOut');
    setTimeout(() => setGifPhase('showGif'), 500);
  };

  const waitForGif = async (gifShowsAt: number) => {
    const elapsed = Date.now() - gifShowsAt;
    const remaining = Math.max(0, GIF_DURATION_MS - elapsed);
    await sleep(remaining);
  };

  const handlePatientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    if (token.trim().length < 5) return setError('Ingresa el token de acceso proporcionado por tu fisioterapeuta.');
    setLoading(true);
    pauseNavigation();
    const gifShowsAt = Date.now() + 500;
    startGif();
    try {
      await signInPatient(token);
      setLoading(false);
      await waitForGif(gifShowsAt);
      resumeNavigation();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al validar el token');
      setGifPhase('idle');
      setLoading(false);
      resumeNavigation();
    }
  };

  const handleFisioLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    setLoading(true);
    pauseNavigation();
    const gifShowsAt = Date.now() + 500;
    startGif();
    try {
      await signInFisio(loginEmail.trim(), loginPass);
      setLoading(false);
      await waitForGif(gifShowsAt);
      resumeNavigation();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
      setGifPhase('idle');
      setLoading(false);
      resumeNavigation();
    }
  };

  const handleFisioRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    if (regName.trim().length < 3) return setError('El nombre completo debe tener al menos 3 caracteres.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) return setError('Ingresa un correo electrónico válido.');
    if (regPass.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    if (regPass !== regPass2) return setError('Las contraseñas no coinciden.');
    if (regUniv.trim().length < 3) return setError('Indica tu universidad o instituto de egreso.');
    setLoading(true);
    pauseNavigation();
    const gifShowsAt = Date.now() + 500;
    startGif();
    try {
      await signUpFisio(regName.trim(), regEmail.trim(), regPass, regUniv.trim());
      setLoading(false);
      await waitForGif(gifShowsAt);
      resumeNavigation();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar');
      setGifPhase('idle');
      setLoading(false);
      resumeNavigation();
    }
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setShowFisioRegister(false);
    reset();
    if (gifPhase !== 'idle') setGifPhase('idle');
  };

  const getTitle = () => {
    if (tab === 'paciente') return 'Acceso Paciente';
    if (showFisioRegister) return 'Crear Cuenta';
    return 'Iniciar Sesión';
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#4ade80' }}
    >
      {/* Card */}
      <div className="w-full max-w-[920px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row min-h-[560px]">

        {/* ── LEFT: FORM PANEL ── */}
        <div className="flex-1 flex flex-col px-10 py-10">

          {/* Brand */}
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined fill text-primary" style={{ fontSize: 32 }}>monitor_heart</span>
              <span className="text-xl font-bold text-primary">FisioMirror</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{getTitle()}</h1>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-full p-1 mb-6">
            <button
              type="button"
              onClick={() => switchTab('paciente')}
              className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                tab === 'paciente' ? 'bg-primary text-white shadow' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Paciente
            </button>
            <button
              type="button"
              onClick={() => switchTab('fisioterapeuta')}
              className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                tab === 'fisioterapeuta' ? 'bg-primary text-white shadow' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Fisioterapeuta
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* ── PATIENT FORM ── */}
          {tab === 'paciente' && (
            <form onSubmit={handlePatientLogin} className="flex flex-col gap-5 flex-1">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Token de Activación <span className="text-gray-400">(Proporcionado por tu terapeuta)</span>
                </label>
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                  placeholder="INGRESE SU CÓDIGO ALFANUMÉRICO"
                  maxLength={10}
                  className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm font-mono tracking-wider text-center text-primary font-bold placeholder:text-gray-400 placeholder:font-normal placeholder:tracking-normal outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !token.trim()}
                className="w-full bg-primary hover:bg-primary-container text-white rounded-full py-3.5 font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>ACCEDER <ArrowRight className="w-5 h-5" /></>
                )}
              </button>

              <p className="text-center text-sm text-gray-500">
                ¿No tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => { setTab('fisioterapeuta'); setShowFisioRegister(true); reset(); }}
                  className="text-primary font-semibold hover:underline"
                >
                  Regístrate aquí
                </button>
              </p>
            </form>
          )}

          {/* ── FISIO LOGIN ── */}
          {tab === 'fisioterapeuta' && !showFisioRegister && (
            <form onSubmit={handleFisioLogin} className="flex flex-col gap-4 flex-1">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Contraseña</label>
                <input
                  type="password"
                  required
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-container text-white rounded-full py-3.5 font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>INICIAR SESIÓN <LogIn className="w-5 h-5" /></>
                )}
              </button>

              <p className="text-center text-sm text-gray-500">
                ¿No tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => { setShowFisioRegister(true); reset(); }}
                  className="text-primary font-semibold hover:underline"
                >
                  Regístrate aquí
                </button>
              </p>
            </form>
          )}

          {/* ── FISIO REGISTER ── */}
          {tab === 'fisioterapeuta' && showFisioRegister && (
            <form onSubmit={handleFisioRegister} className="flex flex-col gap-3.5 flex-1">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Nombre Completo</label>
                <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Dr. Juan Pérez"
                  className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
                <input type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="tu@correo.com"
                  className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Contraseña</label>
                  <input type="password" required value={regPass} onChange={(e) => setRegPass(e.target.value)} placeholder="••••••••"
                    className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Confirmar</label>
                  <input type="password" required value={regPass2} onChange={(e) => setRegPass2(e.target.value)} placeholder="••••••••"
                    className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Universidad o Instituto</label>
                <input type="text" required value={regUniv} onChange={(e) => setRegUniv(e.target.value)} placeholder="Universidad Nacional"
                  className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-container text-white rounded-full py-3.5 font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-50 mt-1"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>CREAR CUENTA <UserPlus className="w-5 h-5" /></>
                )}
              </button>

              <p className="text-center text-sm text-gray-500">
                ¿Ya tienes cuenta?{' '}
                <button type="button" onClick={() => { setShowFisioRegister(false); reset(); }}
                  className="text-primary font-semibold hover:underline">
                  Inicia sesión aquí
                </button>
              </p>
            </form>
          )}
        </div>

        {/* ── RIGHT: ILLUSTRATION PANEL ── */}
        <div
          className="relative lg:w-[420px] min-h-[300px] lg:min-h-auto flex-shrink-0 hidden lg:block overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #dcfce7 60%, #bbf7d0 100%)' }}
        >
          {/*
           * Layer stack (bottom → top):
           * 1. Base image — slightly dimmed when a highlight is active
           * 2. Inactive dim overlay (gradient, per character zone)
           * 3. Neon glow layers — mask-image constrains the zone, drop-shadow
           *    traces the actual alpha channel of each character's silhouette
           * 4. GIF — replaces everything on submit
           * 5. Hover zones — transparent interactive areas
           */}

          {/* 1 — Base image */}
          <img
            src="/Gemini_Generated_Image_xslwpzxslwpzxslw_(1).png"
            alt="Rehabilitación"
            className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
            style={{
              opacity: gifPhase === 'idle' ? 1 : 0,
              transform: gifPhase === 'idle' ? 'scale(1)' : 'scale(0.94)',
              filter: gifPhase === 'idle' ? 'brightness(0.78) saturate(0.85)' : 'none',
              transition: 'opacity 0.5s ease, transform 0.5s ease, filter 0.5s ease',
            }}
            draggable={false}
          />

          {/* 2 — Dim overlay for therapist zone when paciente is active */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(to right, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.22) 44%, transparent 65%)',
              opacity: gifPhase === 'idle' && activeHighlight === 'paciente' ? 1 : 0,
              transition: 'opacity 0.45s ease',
            }}
          />

          {/* 2 — Dim overlay for patient zone when fisioterapeuta is active */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(to left, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.22) 40%, transparent 63%)',
              opacity: gifPhase === 'idle' && activeHighlight === 'fisioterapeuta' ? 1 : 0,
              transition: 'opacity 0.45s ease',
            }}
          />

          {/*
           * 3 — FISIOTERAPEUTA neon glow
           *
           * How it works:
           * - The img renders at full size with filter: drop-shadow, which uses
           *   the PNG's alpha channel to trace the exact silhouette of all pixels.
           * - mask-image creates a LEFT-to-RIGHT soft fade, constraining the
           *   visible glow to the therapist's zone without a hard geometric cut.
           * - The wrapper's opacity transitions animate the whole effect.
           */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              WebkitMaskImage: 'linear-gradient(to right, black 0%, black 42%, rgba(0,0,0,0.6) 54%, transparent 68%)',
              maskImage:       'linear-gradient(to right, black 0%, black 42%, rgba(0,0,0,0.6) 54%, transparent 68%)',
              opacity: gifPhase === 'idle' && activeHighlight === 'fisioterapeuta' ? 1 : 0,
              transition: 'opacity 0.45s ease',
            }}
          >
            <img
              src="/Gemini_Generated_Image_xslwpzxslwpzxslw_(1).png"
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-contain select-none"
              style={{
                filter: [
                  'brightness(1.08)',
                  'drop-shadow(0 0 2px #4ade80)',
                  'drop-shadow(0 0 6px #4ade80)',
                  'drop-shadow(0 0 14px #22c55e)',
                  'drop-shadow(0 0 26px #16a34a)',
                  'drop-shadow(0 0 42px rgba(22,163,74,0.55))',
                ].join(' '),
              }}
              draggable={false}
            />
          </div>

          {/*
           * 3 — PACIENTE neon glow
           *
           * Same technique mirrored: mask fades left-to-right from transparent
           * on the left to opaque on the right, isolating the patient's zone.
           */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              WebkitMaskImage: 'linear-gradient(to left, black 0%, black 38%, rgba(0,0,0,0.6) 52%, transparent 66%)',
              maskImage:       'linear-gradient(to left, black 0%, black 38%, rgba(0,0,0,0.6) 52%, transparent 66%)',
              opacity: gifPhase === 'idle' && activeHighlight === 'paciente' ? 1 : 0,
              transition: 'opacity 0.45s ease',
            }}
          >
            <img
              src="/Gemini_Generated_Image_xslwpzxslwpzxslw_(1).png"
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-contain select-none"
              style={{
                filter: [
                  'brightness(1.08)',
                  'drop-shadow(0 0 2px #4ade80)',
                  'drop-shadow(0 0 6px #4ade80)',
                  'drop-shadow(0 0 14px #22c55e)',
                  'drop-shadow(0 0 26px #16a34a)',
                  'drop-shadow(0 0 42px rgba(22,163,74,0.55))',
                ].join(' '),
              }}
              draggable={false}
            />
          </div>

          {/* 4 — GIF (replaces everything on submit) */}
          <img
            src="/output-onlinegiftools.gif"
            alt="FisioMirror animado"
            className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
            style={{
              opacity: gifPhase === 'showGif' ? 1 : 0,
              transform: gifPhase === 'showGif' ? 'scale(1)' : 'scale(1.05)',
              transition: 'opacity 0.6s ease, transform 0.6s ease',
            }}
            draggable={false}
          />

          {/* 5 — Invisible hover zones (only when idle, not during GIF) */}
          {gifPhase === 'idle' && (
            <>
              <div
                className="absolute inset-y-0 left-0 cursor-default"
                style={{ width: '54%', zIndex: 10 }}
                onMouseEnter={() => setHoverChar('fisioterapeuta')}
                onMouseLeave={() => setHoverChar(null)}
              />
              <div
                className="absolute inset-y-0 right-0 cursor-default"
                style={{ width: '54%', zIndex: 10 }}
                onMouseEnter={() => setHoverChar('paciente')}
                onMouseLeave={() => setHoverChar(null)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
