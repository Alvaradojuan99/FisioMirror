import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Routine, Exercise, SessionRecord } from '../lib/types';
import type { PatientView } from './PatientLayout';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function PatientDashboard({ onNavigate }: { onNavigate: (v: PatientView, opts?: { autoStart?: boolean }) => void }) {
  const { patient } = useAuth();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [painLevel, setPainLevel] = useState(5);
  const [painMessage, setPainMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [notified, setNotified] = useState(false);

  const today = new Date().getDay();

  useEffect(() => {
    if (!patient) return;
    (async () => {
      const [{ data: r }, { data: s }] = await Promise.all([
        supabase.from('routines').select('*').eq('patient_id', patient.patient_id),
        supabase.from('sessions').select('*').eq('patient_id', patient.patient_id).order('created_at', { ascending: false }),
      ]);
      setRoutines(r as Routine[] || []);
      setSessions((s as SessionRecord[]) || []);
      setLoading(false);
    })();
  }, [patient]);

  const todayRoutines = routines.filter((r) => r.day_of_week === today);
  const completedToday = sessions.filter((s) => new Date(s.created_at).toDateString() === new Date().toDateString()).length;
  const totalMinutes = sessions.reduce((a, s) => a + s.duration_minutes, 0);
  const avgPrecision = sessions.length > 0 ? Math.round(sessions.reduce((a, s) => a + (s.total_exercises > 0 ? (s.completed_exercises / s.total_exercises) * 100 : 0), 0) / sessions.length) : 0;

  const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const weekData = weekDays.map((d, i) => {
    const daySessions = sessions.filter((s) => {
      const sd = new Date(s.created_at);
      return sd.getDay() === (i + 1) % 7;
    });
    return { day: d, count: daySessions.length };
  });
  const maxWeek = Math.max(...weekData.map((w) => w.count), 1);

  const handleNotify = async () => {
    if (!patient) return;
    setSending(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      setNotified(true);
      setTimeout(() => {
        setShowNotifyModal(false);
        setNotified(false);
        setPainMessage('');
        setPainLevel(5);
      }, 2000);
    } catch (err) {
      alert('Error al enviar notificación');
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="relative">
        <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="lg:hidden w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-white" style={{ fontSize: 24 }}>monitor_heart</span>
            </div>
            <div className="hidden lg:block">
              <p className="text-xs text-outline font-medium">{DAYS[today]}, {new Date().toLocaleDateString('es', { day: 'numeric', month: 'long' })}</p>
            </div>
          </div>

          {/* Streak badge */}
          <div className="relative group">
            <div className="absolute inset-0 bg-error/20 rounded-full blur-lg animate-pulse-soft" />
            <div className="relative px-5 py-2.5 rounded-full bg-gradient-to-r from-error via-orange-500 to-amber-500 text-white flex items-center gap-2 shadow-lg">
              <span className="material-symbols-outlined fill animate-float-slow" style={{ fontSize: 22 }}>local_fire_department</span>
              <span className="text-3xl font-black">{sessions.length}</span>
              <span className="text-xs font-bold opacity-90">DÍAS</span>
            </div>
          </div>

          {/* User avatar */}
          <button className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 24 }}>account_circle</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="px-6 lg:px-8 py-8 space-y-8 relative">
        {/* Welcome section */}
        <div className="relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
          <div className="animate-fade-in-up">
            <h1 className="text-4xl lg:text-5xl font-black text-on-surface">
              Hola, <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{patient?.full_name.split(' ')[0]}</span>
            </h1>
            <p className="text-lg text-outline mt-2">Tus rutinas de hoy te esperan</p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Hero CTA Card */}
          <div className="col-span-12 lg:col-span-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="relative overflow-hidden rounded-3xl min-h-[450px]">
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-emerald-600 to-teal-700" />

              {/* Decorative shapes */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-float" />
                <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-secondary/20 rounded-full blur-2xl animate-float-slow" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-white/10 rounded-full animate-spin-slow" />
              </div>

              {/* Pattern overlay */}
              <div className="absolute inset-0 pattern-dots opacity-20" />

              {/* Content */}
              <div className="relative z-10 p-10 h-full flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-6 animate-fade-in">
                    <span className="material-symbols-outlined text-white" style={{ fontSize: 18 }}>today</span>
                    <span className="text-white font-semibold text-sm">SESIÓN RECOMENDADA</span>
                  </div>

                  {todayRoutines.length > 0 ? (
                    <>
                      <h2 className="text-4xl lg:text-5xl font-black text-white mb-4 animate-fade-in-up">
                        {todayRoutines[0].title}
                      </h2>
                      <p className="text-xl text-white/80 max-w-lg">
                        {todayRoutines[0].description || 'Completa tu rutina de hoy para mantener tu progreso'}
                      </p>

                      {/* Exercise preview */}
                      <div className="mt-6 flex items-center gap-6 text-white/90">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>timer</span>
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{(todayRoutines[0].exercises as Exercise[]).reduce((a, e) => a + e.duration_sec, 0)}s</p>
                            <p className="text-sm opacity-80">Duración</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>fitness_center</span>
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{(todayRoutines[0].exercises as Exercise[]).length}</p>
                            <p className="text-sm opacity-80">Ejercicios</p>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="text-4xl lg:text-5xl font-black text-white mb-4">
                        No hay rutinas para hoy
                      </h2>
                      <p className="text-xl text-white/80">
                        Tu fisioterapeuta asignará ejercicios pronto. ¡Revisa más tarde!
                      </p>
                    </>
                  )}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => onNavigate('sesiones', { autoStart: true })}
                  className="group relative self-start bg-white text-primary px-10 py-5 rounded-2xl font-bold text-lg flex items-center gap-3 hover:shadow-2xl hover:shadow-white/30 hover:scale-105 active:scale-100 transition-all duration-300 animate-fade-in-up"
                  style={{ animationDelay: '0.3s' }}
                >
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined fill text-white" style={{ fontSize: 28 }}>play_arrow</span>
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-black">Comenzar</p>
                    <p className="text-sm text-outline -mt-1">Sesión AR</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Weekly Progress */}
            <div className="glass-card rounded-3xl p-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-on-surface flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-secondary" style={{ fontSize: 18 }}>calendar_month</span>
                  </span>
                  Progreso Semanal
                </h3>
                <div className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-bold">
                  {weekData.reduce((a, w) => a + w.count, 0)} sesiones
                </div>
              </div>

              <div className="flex items-end justify-between gap-2 h-36">
                {weekData.map((w, i) => {
                  const isToday = i === ((today + 6) % 7);
                  const height = Math.max((w.count / maxWeek) * 100, 8);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="w-full flex-1 flex items-end justify-center">
                        <div
                          className={`w-full max-w-[32px] rounded-xl transition-all duration-500 relative ${
                            isToday
                              ? 'bg-gradient-to-t from-secondary to-cyan-400 shadow-lg shadow-secondary/30'
                              : w.count > 0
                                ? 'bg-gradient-to-t from-primary/60 to-primary/40'
                                : 'bg-surface-container group-hover:bg-primary/20'
                          }`}
                          style={{ height: `${height}%` }}
                        >
                          {isToday && w.count > 0 && (
                            <div className="absolute inset-0 bg-white/30 rounded-xl animate-pulse-soft" />
                          )}
                        </div>
                      </div>
                      <span className={`text-xs font-semibold ${isToday ? 'text-secondary' : 'text-outline'}`}>
                        {w.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pain notification card */}
            <div className="glass-card rounded-3xl p-6 overflow-hidden relative animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-error/10 rounded-full blur-2xl" />

              <div className="relative z-10">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-error/20 to-orange-500/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-error" style={{ fontSize: 28 }}>healing</span>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">¿Sientes dolor?</p>
                    <p className="text-sm text-outline">Notifica a tu fisioterapeuta</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowNotifyModal(true)}
                  className="w-full py-3.5 rounded-xl border-2 border-error/30 text-error font-bold hover:bg-error/5 hover:border-error transition-all duration-300 flex items-center justify-center gap-2 group"
                >
                  <span className="material-symbols-outlined group-hover:animate-pulse-soft" style={{ fontSize: 22 }}>send</span>
                  Notificar al Clínico
                </button>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: 'check_circle', label: 'Completado', value: `${completedToday} hoy`, color: 'primary', gradient: 'from-emerald-400 to-teal-500' },
              { icon: 'timer', label: 'Tiempo Total', value: `${totalMinutes} min`, color: 'secondary', gradient: 'from-blue-400 to-indigo-500' },
              { icon: 'monitoring', label: 'Precisión Media', value: `${avgPrecision}%`, color: 'tertiary', gradient: 'from-amber-400 to-orange-500' },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="glass-card rounded-3xl p-5 flex items-center gap-4 hover:scale-105 transition-transform duration-300 animate-fade-in-up group cursor-pointer"
                style={{ animationDelay: `${0.4 + i * 0.1}s` }}
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                  <span className="material-symbols-outlined fill" style={{ fontSize: 28 }}>{stat.icon}</span>
                </div>
                <div>
                  <p className="text-sm text-outline">{stat.label}</p>
                  <p className="text-2xl font-black text-on-surface">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pain Notification Modal */}
      {showNotifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowNotifyModal(false)}>
          <div className="relative glass-card rounded-3xl p-8 w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="absolute -right-20 -top-20 w-60 h-60 bg-error/10 rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-error/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-error" style={{ fontSize: 28 }}>healing</span>
                  </div>
                  <h2 className="text-xl font-bold text-on-surface">Notificar al Clínico</h2>
                </div>
                <button onClick={() => setShowNotifyModal(false)} className="p-2 rounded-xl hover:bg-surface-container transition-colors">
                  <span className="material-symbols-outlined text-outline">close</span>
                </button>
              </div>

              {notified ? (
                <div className="text-center py-10 animate-fade-in-scale">
                  <div className="relative mx-auto mb-4">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse-soft" />
                    <div className="relative w-24 h-24 rounded-full gradient-primary flex items-center justify-center">
                      <span className="material-symbols-outlined fill text-white" style={{ fontSize: 48 }}>check</span>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-on-surface">¡Mensaje enviado!</p>
                  <p className="text-sm text-outline mt-2">Tu fisioterapeuta ha sido notificado</p>
                </div>
              ) : (
                <>
                  {/* Pain level slider */}
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-on-surface">Nivel de Dolor/Molestia</label>
                      <div className={`px-4 py-2 rounded-xl font-black text-lg ${
                        painLevel <= 3 ? 'bg-green-100 text-green-700' :
                        painLevel <= 6 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {painLevel}/10
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={painLevel}
                        onChange={(e) => setPainLevel(parseInt(e.target.value))}
                        className="w-full accent-error appearance-none"
                        style={{
                          background: `linear-gradient(to right,
                            ${painLevel <= 3 ? '#22c55e' : painLevel <= 6 ? '#eab308' : '#ef4444'} 0%,
                            #e5e7eb ${(painLevel / 10) * 100}%
                          )`
                        }}
                      />
                    </div>

                    <div className="flex justify-between text-xs text-outline font-medium">
                      <span>Leve</span>
                      <span>Moderado</span>
                      <span>Severo</span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2 mb-6">
                    <label className="block font-semibold text-on-surface">Describe tu molestia</label>
                    <textarea
                      value={painMessage}
                      onChange={(e) => setPainMessage(e.target.value)}
                      placeholder="¿Dónde te duele? ¿Qué movimiento causa molestia?"
                      rows={4}
                      className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm outline-none focus:ring-2 focus:ring-error/30 resize-none transition-all"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowNotifyModal(false)}
                      className="flex-1 py-3.5 rounded-xl border-2 border-outline-variant text-sm font-semibold hover:bg-surface-container transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleNotify}
                      disabled={sending}
                      className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-red-500/30 transition-all disabled:opacity-50"
                    >
                      {sending ? (
                        <span className="material-symbols-outlined animate-spin" style={{ fontSize: 22 }}>progress_activity</span>
                      ) : (
                        <>
                          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>send</span>
                          Enviar
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
