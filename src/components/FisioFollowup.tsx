import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Patient, SessionRecord } from '../lib/types';
import type { FisioView } from './FisioLayout';

export function FisioFollowup({ onNavigate }: { onNavigate: (v: FisioView) => void }) {
  const { fisio } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!fisio) return;
    (async () => {
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from('patients').select('*').eq('physio_id', fisio.id).order('full_name'),
        supabase.from('sessions').select('*, patients!inner(physio_id)').eq('patients.physio_id', fisio.id).order('created_at', { ascending: false }),
      ]);
      setPatients(p as Patient[] || []);
      setSessions((s as SessionRecord[]) || []);
      setLoading(false);
    })();
  }, [fisio]);

  const patientSessions = selectedPatient ? sessions.filter((s) => s.patient_id === selectedPatient) : sessions;
  const selectedPatientObj = patients.find((p) => p.id === selectedPatient);

  // Filter patients by search
  const filteredPatients = patients.filter((p) => {
    if (!searchQuery) return true;
    return p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.condition?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
  });

  const totalSessions = patientSessions.length;
  const avgScore = totalSessions > 0 ? Math.round(patientSessions.reduce((a, s) => a + s.score, 0) / totalSessions) : 0;
  const totalMinutes = patientSessions.reduce((a, s) => a + s.duration_minutes, 0);
  const totalExercises = patientSessions.reduce((a, s) => a + s.completed_exercises, 0);

  const recentSessions = [...patientSessions].slice(0, 7).reverse();
  const maxScore = Math.max(...recentSessions.map((s) => s.score), 100);

  if (loading) return <div className="h-40 m-8 rounded-xl bg-surface-container animate-pulse" />;

  return (
    <div>
      {/* Header */}
      <header className="bg-surface px-4 sm:px-8 py-4 flex items-center gap-4 border-b border-outline-variant/20 sticky top-0 z-40">
        <button onClick={() => onNavigate('dashboard')} className="p-2 rounded-lg hover:bg-surface-container">
          <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
        </button>
        <h1 className="text-lg font-semibold text-on-surface">Expediente del Paciente</h1>
        <div className="flex-1 max-w-md relative ml-auto">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline" style={{ fontSize: 20 }}>search</span>
          <input
            type="text"
            placeholder="Buscar pacientes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-container-low rounded-full text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          )}
        </div>
        <button
          onClick={() => alert('Notificaciones: No hay nuevas alertas de pacientes')}
          className="p-2 rounded-lg hover:bg-surface-container"
        >
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 22 }}>notifications</span>
        </button>
      </header>

      <div className="p-4 sm:p-8 space-y-6 max-w-7xl">
        {patients.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-4xl p-12 text-center border border-outline-variant/20">
            <span className="material-symbols-outlined text-outline mx-auto mb-3" style={{ fontSize: 48 }}>monitoring</span>
            <p className="font-medium text-on-surface mb-1">No hay datos de seguimiento</p>
            <p className="text-sm text-outline">Registra pacientes para ver el progreso</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Patient list */}
            <div className="bg-surface-container-lowest rounded-4xl p-4 border border-outline-variant/20">
              <h2 className="font-semibold text-on-surface mb-3 text-sm px-2">Pacientes</h2>
              <div className="space-y-1.5">
                <button onClick={() => setSelectedPatient(null)} className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${!selectedPatient ? 'bg-primary/10 border border-primary/20' : 'hover:bg-surface-container border border-transparent'}`}>
                  <div className="w-9 h-9 rounded-lg bg-primary-container flex items-center justify-center text-on-primary shrink-0">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>trending_up</span>
                  </div>
                  <div><p className="text-sm font-medium text-on-surface">Vista general</p><p className="text-xs text-outline">Todos</p></div>
                </button>
                {filteredPatients.map((p) => {
                  const count = sessions.filter((s) => s.patient_id === p.id).length;
                  return (
                    <button key={p.id} onClick={() => setSelectedPatient(p.id)} className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${selectedPatient === p.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-surface-container border border-transparent'}`}>
                      <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary font-semibold text-sm shrink-0">{p.full_name.charAt(0).toUpperCase()}</div>
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium text-on-surface truncate">{p.full_name}</p><p className="text-xs text-outline">{count} sesiones</p></div>
                      <span className="material-symbols-outlined text-outline" style={{ fontSize: 18 }}>chevron_right</span>
                    </button>
                  );
                })}
                {searchQuery && filteredPatients.length === 0 && (
                  <p className="text-sm text-outline text-center py-4">No se encontraron pacientes</p>
                )}
              </div>
            </div>

            {/* Progress detail */}
            <div className="lg:col-span-2 space-y-5">
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatBox icon="analytics" label="Sesiones" value={totalSessions} color="primary" />
                <StatBox icon="emoji_events" label="Puntaje Prom." value={avgScore} color="tertiary" />
                <StatBox icon="timer" label="Minutos" value={totalMinutes} color="secondary" />
                <StatBox icon="check_circle" label="Ejercicios" value={totalExercises} color="primary" />
              </div>

              {/* Chart */}
              <div className="bg-surface-container-lowest rounded-4xl p-6 border border-outline-variant/20">
                <h2 className="font-semibold text-on-surface mb-4">{selectedPatientObj ? `Progreso de ${selectedPatientObj.full_name}` : 'Progreso General'}</h2>
                {recentSessions.length === 0 ? (
                  <div className="text-center py-10">
                    <span className="material-symbols-outlined text-outline mx-auto mb-2" style={{ fontSize: 32 }}>monitoring</span>
                    <p className="text-sm text-outline">Sin sesiones registradas</p>
                  </div>
                ) : (
                  <div className="flex items-end justify-between gap-2 h-48">
                    {recentSessions.map((s, i) => {
                      const h = (s.score / maxScore) * 100;
                      return (
                        <div key={s.id} className="flex-1 flex flex-col items-center gap-2">
                          <div className="w-full flex-1 flex items-end">
                            <div className="w-full rounded-t-lg bg-gradient-to-t from-primary to-primary-fixed-dim transition-all hover:opacity-80 relative group" style={{ height: `${Math.max(h, 5)}%` }}>
                              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-on-surface text-white text-xs rounded px-2 py-1 whitespace-nowrap transition-opacity">{s.score} pts</div>
                            </div>
                          </div>
                          <span className="text-[10px] text-outline">S{i + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Session log */}
              {patientSessions.length > 0 && (
                <div className="bg-surface-container-lowest rounded-4xl p-6 border border-outline-variant/20">
                  <h2 className="font-semibold text-on-surface mb-3">Registro de Sesiones</h2>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {patientSessions.slice(0, 10).map((s) => {
                      const patient = patients.find((p) => p.id === s.patient_id);
                      return (
                        <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{s.score}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-on-surface truncate">{!selectedPatient && patient ? `${patient.full_name} · ` : ''}{s.completed_exercises}/{s.total_exercises} ejercicios</p>
                            <p className="text-xs text-outline">{s.duration_minutes} min · {new Date(s.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="w-24 h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${s.total_exercises > 0 ? (s.completed_exercises / s.total_exercises) * 100 : 0}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/10 text-secondary',
    tertiary: 'bg-tertiary-container/30 text-tertiary',
  };
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/20">
      <div className={`w-9 h-9 rounded-lg ${colors[color]} flex items-center justify-center mb-2`}>
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <p className="text-xl font-bold text-on-surface">{value}</p>
      <p className="text-xs text-outline">{label}</p>
    </div>
  );
}
