import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { SessionRecord } from '../lib/types';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  threshold: number;
  metric: 'sessions' | 'score' | 'exercises';
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first', title: 'Primer Paso', description: 'Completa tu primera sesión', icon: 'calendar_today', threshold: 1, metric: 'sessions' },
  { id: 'five', title: 'Constante', description: 'Completa 5 sesiones', icon: 'self_improvement', threshold: 5, metric: 'sessions' },
  { id: 'ten', title: 'Dedicado', description: 'Completa 10 sesiones', icon: 'sunny', threshold: 10, metric: 'sessions' },
  { id: 'score100', title: 'Centenario', description: 'Acumula 100 puntos', icon: 'balance', threshold: 100, metric: 'score' },
  { id: 'score500', title: 'Quinientos', description: 'Acumula 500 puntos', icon: 'bolt', threshold: 500, metric: 'score' },
  { id: 'score1000', title: 'Mil Puntos', description: 'Acumula 1000 puntos', icon: 'workspace_premium', threshold: 1000, metric: 'score' },
];

export function PatientAchievements() {
  const { patient } = useAuth();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patient) return;
    supabase.from('sessions').select('*').eq('patient_id', patient.patient_id).order('created_at', { ascending: false }).then(({ data }) => {
      setSessions((data as SessionRecord[]) || []);
      setLoading(false);
    });
  }, [patient]);

  const totalScore = sessions.reduce((a, s) => a + s.score, 0);
  const totalExercises = sessions.reduce((a, s) => a + s.completed_exercises, 0);
  const totalSessions = sessions.length;

  const getMetric = (m: Achievement['metric']) => m === 'sessions' ? totalSessions : m === 'score' ? totalScore : totalExercises;
  const unlocked = ACHIEVEMENTS.filter((a) => getMetric(a.metric) >= a.threshold);
  const locked = ACHIEVEMENTS.filter((a) => getMetric(a.metric) < a.threshold);

  const level = Math.floor(totalScore / 200) + 1;

  // Weekly activity
  const weekDays = ['LUN', 'MAR', 'MIÉ', 'JUE', 'HOY', 'SÁB', 'DOM'];
  const weekData = weekDays.map((d, i) => {
    const daySessions = sessions.filter((s) => {
      const sd = new Date(s.created_at);
      const today = new Date().getDay();
      const targetDay = (today + i - 4 + 7) % 7;
      return sd.getDay() === targetDay;
    });
    return { day: d, pct: daySessions.length > 0 ? Math.min(100, daySessions.length * 30 + 40) : 10 };
  });

  if (loading) return <div className="h-40 m-8 rounded-xl bg-surface-container animate-pulse" />;

  return (
    <div>
      {/* Header */}
      <header className="bg-surface px-4 sm:px-8 py-4 flex items-center justify-between border-b border-outline-variant/20 sticky top-0 z-30">
        <h1 className="text-lg font-semibold text-on-surface">Progreso y Logros</h1>
        <div className="bg-primary-fixed rounded-full px-4 py-1.5 flex items-center gap-2">
          <span className="material-symbols-outlined fill text-primary" style={{ fontSize: 18 }}>local_fire_department</span>
          <span className="text-sm font-bold text-primary">{totalSessions} Días de Racha</span>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 28 }}>account_circle</span>
      </header>

      <div className="p-4 sm:p-8 space-y-6 max-w-7xl">
        {/* Hero */}
        <div className="bg-primary-container rounded-3xl p-8 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-primary-fixed flex items-center justify-center border-4 border-white/30 animate-celebrate">
              <span className="material-symbols-outlined fill text-primary" style={{ fontSize: 48 }}>emoji_events</span>
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold text-on-primary-container">¡Has mejorado un 10% esta semana!</h2>
              <p className="text-on-primary-container/80 mt-1">Tu dedicación está dando resultados</p>
              <p className="text-lg font-semibold text-on-primary-container mt-2">Nivel {level} Alcanzado</p>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Analytics */}
          <div className="col-span-12 lg:col-span-7 space-y-4">
            <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/20">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>monitoring</span>
                <h3 className="font-semibold text-on-surface">Mejora de Biomecánica</h3>
              </div>
              <div className="space-y-4">
                <ProgressBar label="Flexibilidad Lumbar" value={75} display="+15%" color="bg-primary" />
                <ProgressBar label="Tiempo de Reacción" value={88} display="-120ms" color="bg-tertiary-container" />
                <ProgressBar label="Simetría de Carga" value={98} display="98%" color="bg-primary" />
              </div>
            </div>

            {/* Recent sessions */}
            <div className="glass-panel rounded-3xl p-5">
              <h3 className="font-semibold text-on-surface mb-3">Sesiones Recientes</h3>
              {sessions.length === 0 ? (
                <p className="text-sm text-outline text-center py-4">Sin sesiones registradas</p>
              ) : (
                <div className="space-y-2">
                  {sessions.slice(0, 3).map((s) => (
                    <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/50">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>check_circle</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-on-surface">{s.completed_exercises}/{s.total_exercises} ejercicios</p>
                        <p className="text-xs text-outline">{new Date(s.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className="text-sm font-bold text-primary">{s.score}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Achievements wall */}
          <div className="col-span-12 lg:col-span-5 bg-surface-container-high rounded-3xl p-6">
            <h3 className="font-semibold text-on-surface mb-4">Muro de Logros</h3>
            <div className="grid grid-cols-2 gap-3">
              {unlocked.map((a) => (
                <div key={a.id} className="bg-surface-container-lowest rounded-2xl p-4 text-center border-2 border-primary-fixed">
                  <div className="w-14 h-14 rounded-2xl bg-primary-fixed flex items-center justify-center mx-auto mb-2">
                    <span className="material-symbols-outlined fill text-primary" style={{ fontSize: 28 }}>{a.icon}</span>
                  </div>
                  <p className="text-sm font-semibold text-on-surface">{a.title}</p>
                  <p className="text-xs text-outline mt-0.5">{a.description}</p>
                  <span className="text-xs font-bold text-primary mt-1 block">Desbloqueado</span>
                </div>
              ))}
              {locked.map((a) => {
                const current = getMetric(a.metric);
                const pct = Math.min(100, (current / a.threshold) * 100);
                return (
                  <div key={a.id} className="bg-surface-container rounded-2xl p-4 text-center opacity-60">
                    <div className="w-14 h-14 rounded-2xl bg-surface-container-high flex items-center justify-center mx-auto mb-2">
                      <span className="material-symbols-outlined text-outline" style={{ fontSize: 28 }}>{a.icon}</span>
                    </div>
                    <p className="text-sm font-semibold text-on-surface-variant">{a.title}</p>
                    <p className="text-xs text-outline mt-0.5">{a.description}</p>
                    <div className="w-full h-1.5 rounded-full bg-surface-container-highest mt-2">
                      <div className="h-full bg-outline rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                    <p className="text-[10px] text-outline mt-1">{current}/{a.threshold}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Weekly activity */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/20">
          <h3 className="font-semibold text-on-surface mb-4">Actividad Semanal</h3>
          <div className="flex items-end justify-between gap-2 h-48">
            {weekData.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex-1 flex items-end">
                  <div className={`w-full rounded-t-lg transition-all ${i === 4 ? 'bg-primary-fixed-dim animate-pulse' : w.pct > 20 ? 'bg-primary' : 'bg-surface-container'}`} style={{ height: `${w.pct}%`, boxShadow: i === 4 ? '0 0 12px rgba(103, 219, 173, 0.5)' : 'none' }}></div>
                </div>
                <span className="text-[10px] text-outline">{w.day}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary"></span> Completado</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-surface-container"></span> Programado</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ label, value, display, color }: { label: string; value: number; display: string; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-on-surface-variant">{label}</span>
        <span className="text-sm font-bold text-on-surface">{display}</span>
      </div>
      <div className="w-full h-6 rounded-full bg-surface-container overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }}></div>
      </div>
    </div>
  );
}
