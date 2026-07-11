import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Patient, AccessToken } from '../lib/types';
import type { FisioView } from './FisioLayout';

export function FisioDashboard({ onNavigate }: { onNavigate: (v: FisioView) => void }) {
  const { fisio } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tokens, setTokens] = useState<AccessToken[]>([]);
  const [sessions, setSessions] = useState<{ patient_id: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCondition, setFilterCondition] = useState<string>('all');
  const [animateStats, setAnimateStats] = useState(false);

  useEffect(() => {
    if (!fisio) return;
    (async () => {
      const [{ data: p }, { data: t }, { data: s }] = await Promise.all([
        supabase.from('patients').select('*').eq('physio_id', fisio.id).order('created_at', { ascending: false }),
        supabase.from('access_tokens').select('*').eq('physio_id', fisio.id).eq('is_active', true),
        supabase.from('sessions').select('patient_id'),
      ]);
      setPatients(p as Patient[] || []);
      setTokens(t as AccessToken[] || []);
      const sessionCounts: Record<string, number> = {};
      (s || []).forEach((sess: any) => {
        sessionCounts[sess.patient_id] = (sessionCounts[sess.patient_id] || 0) + 1;
      });
      setSessions(Object.entries(sessionCounts).map(([patient_id, count]) => ({ patient_id, count })));
      setLoading(false);
      setTimeout(() => setAnimateStats(true), 100);
    })();
  }, [fisio]);

  const filteredPatients = patients.filter((p) => {
    const matchesSearch = p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.condition?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesFilter = filterCondition === 'all' || p.condition === filterCondition;
    return matchesSearch && matchesFilter;
  });

  const recentPatients = filteredPatients.slice(0, 6);
  const totalSessions = sessions.reduce((a, s) => a + s.count, 0);
  const conditions = ['all', ...new Set(patients.map((p) => p.condition).filter(Boolean))];

  const stats = [
    { label: 'Total Pacientes', value: patients.length, icon: 'groups', color: 'primary', trend: '+12%' },
    { label: 'Cumplimiento', value: '88%', icon: 'analytics', color: 'secondary', trend: '↑' },
    { label: 'Sesiones Totales', value: totalSessions, icon: 'fitness_center', color: 'tertiary', trend: '+25%' },
    { label: 'Alertas', value: 0, icon: 'warning', color: 'error', trend: '0' },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="px-4 sm:px-8 py-4 flex items-center justify-between">
          {/* Search */}
          <div className="flex-1 max-w-lg relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors" style={{ fontSize: 22 }}>search</span>
              <input
                type="text"
                placeholder="Buscar pacientes por nombre o condición..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-surface-container-low rounded-xl border-2 border-transparent focus:border-primary focus:bg-white transition-all duration-300 outline-none text-sm"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all duration-300 ${
                showFilters ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-surface-container-low hover:bg-primary/10 text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>filter_list</span>
              Filtros
              {showFilters && <span className="absolute -top-1 -right-1 w-2 h-2 bg-secondary rounded-full animate-ping" />}
            </button>

            <button className="relative p-3 rounded-xl hover:bg-primary/10 transition-all duration-300 group">
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors" style={{ fontSize: 24 }}>notifications</span>
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-error rounded-full animate-ping" />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-error rounded-full" />
            </button>

            <button className="p-3 rounded-xl hover:bg-primary/10 transition-all duration-300 group">
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors" style={{ fontSize: 24 }}>help_outline</span>
            </button>
          </div>
        </div>

        {/* Filters bar */}
        {showFilters && (
          <div className="px-4 sm:px-8 py-4 bg-surface-container-low/50 border-t border-outline-variant/10 animate-fade-in">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-on-surface-variant">Filtrar por:</span>
              <select
                value={filterCondition}
                onChange={(e) => setFilterCondition(e.target.value)}
                className="px-4 py-2 rounded-xl bg-white border border-outline-variant/30 text-sm font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              >
                {conditions.map((c) => (
                  <option key={c} value={c}>{c === 'all' ? 'Todas las condiciones' : c}</option>
                ))}
              </select>
              <button
                onClick={() => { setFilterCondition('all'); setSearchQuery(''); }}
                className="text-sm font-semibold text-primary hover:text-primary-container transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                Limpiar
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 relative">
        {/* Welcome header */}
        <div className="relative animate-fade-in-up">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-primary via-primary-container to-secondary bg-clip-text text-transparent">
            Panel de Gestión Clínica
          </h1>
          <p className="text-outline mt-2">Bienvenido, aquí está el resumen de tu práctica</p>

          {/* Decorative element */}
          <div className="absolute -top-10 right-0 w-72 h-72 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full blur-3xl -z-10" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`relative group animate-fade-in-up ${
                animateStats ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ transitionDelay: `${index * 0.1}s` }}
            >
              <div className={`relative p-6 rounded-3xl overflow-hidden transition-all duration-500 group-hover:scale-105 group-hover:shadow-xl ${
                stat.color === 'primary' ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' :
                stat.color === 'secondary' ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' :
                stat.color === 'tertiary' ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white' :
                'bg-gradient-to-br from-rose-500 to-red-600 text-white'
              }`}>
                {/* Background decoration */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                  <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/5 rounded-full blur-xl" />
                </div>

                {/* Content */}
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <span className="material-symbols-outlined fill text-white" style={{ fontSize: 28 }}>{stat.icon}</span>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold">
                      {stat.trend}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-4xl font-black tracking-tight">
                      {loading ? (
                        <span className="animate-pulse">...</span>
                      ) : (
                        stat.value
                      )}
                    </p>
                    <p className="text-sm opacity-90 font-medium">{stat.label}</p>
                  </div>
                </div>

                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </div>
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Patients Table */}
          <div className="xl:col-span-2 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="relative glass-card rounded-3xl overflow-hidden">
              <div className="p-6 border-b border-outline-variant/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-white" style={{ fontSize: 18 }}>people</span>
                      </span>
                      Lista de Pacientes
                    </h2>
                    <p className="text-sm text-outline mt-1">{filteredPatients.length} pacientes encontrados</p>
                  </div>
                  <button
                    onClick={() => onNavigate('pacientes')}
                    className="px-5 py-2.5 gradient-primary text-white rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-primary/30 hover:scale-105 transition-all duration-300"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>person_add</span>
                    Nuevo
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="h-20 rounded-2xl bg-surface-container animate-pulse" />
                  ))
                ) : recentPatients.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-surface-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-outline" style={{ fontSize: 48 }}>person_off</span>
                    </div>
                    <p className="text-lg font-semibold text-on-surface">No hay pacientes</p>
                    <p className="text-sm text-outline mt-1">Registra tu primer paciente para comenzar</p>
                    <button
                      onClick={() => onNavigate('pacientes')}
                      className="mt-6 px-6 py-3 gradient-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                    >
                      Registrar Paciente
                    </button>
                  </div>
                ) : (
                  recentPatients.map((p, index) => {
                    const token = tokens.find((t) => t.patient_id === p.id);
                    return (
                      <div
                        key={p.id}
                        className="relative group p-4 rounded-2xl bg-surface-container-low hover:bg-white hover:shadow-lg transition-all duration-300 cursor-pointer animate-fade-in-up"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="flex items-center gap-4">
                          {/* Avatar */}
                          <div className="relative">
                            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:scale-110 transition-transform">
                              {p.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-on-surface truncate text-lg">{p.full_name}</p>
                            <p className="text-sm text-outline flex items-center gap-2">
                              {p.condition || 'Sin diagnóstico'}
                              {p.age && <span className="text-xs">• {p.age} años</span>}
                            </p>
                          </div>

                          {/* Token badge */}
                          {token && (
                            <div className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
                              <span className="font-mono font-bold text-primary text-sm tracking-wider">{token.token}</span>
                            </div>
                          )}

                          {/* Status */}
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">Activo</span>
                            <button className="p-2 rounded-xl hover:bg-primary/10 transition-colors">
                              <span className="material-symbols-outlined text-outline" style={{ fontSize: 20 }}>visibility</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <div className="relative glass-card rounded-3xl p-6 overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-secondary/10 rounded-full blur-3xl" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-secondary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-secondary" style={{ fontSize: 18 }}>notifications_active</span>
                    </span>
                    Notificaciones
                  </h2>
                  <span className="px-3 py-1 rounded-full bg-error/10 text-error text-xs font-bold animate-pulse-soft">3 Nuevas</span>
                </div>

                <div className="space-y-4">
                  {[
                    { icon: 'trending_up', title: 'Nuevo hito alcanzado', desc: 'Un paciente completó 10 sesiones', color: 'primary', time: 'hace 2 min' },
                    { icon: 'sync', title: 'Token generado', desc: 'Nuevo acceso de paciente creado', color: 'secondary', time: 'hace 15 min' },
                    { icon: 'medical_services', title: 'Sesión completada', desc: 'Juan Pérez finalizó su rutina', color: 'tertiary', time: 'hace 1 hora' },
                  ].map((notif, i) => (
                    <div
                      key={i}
                      className="group p-4 rounded-2xl bg-surface-container-low hover:bg-white hover:shadow-md transition-all duration-300 cursor-pointer animate-fade-in-up"
                      style={{ animationDelay: `${0.5 + i * 0.1}s` }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          notif.color === 'primary' ? 'bg-primary/10' :
                          notif.color === 'secondary' ? 'bg-secondary/10' : 'bg-tertiary/10'
                        }`}>
                          <span className={`material-symbols-outlined fill ${
                            notif.color === 'primary' ? 'text-primary' :
                            notif.color === 'secondary' ? 'text-secondary' : 'text-tertiary'
                          }`} style={{ fontSize: 20 }}>{notif.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-on-surface text-sm">{notif.title}</p>
                          <p className="text-xs text-outline mt-0.5">{notif.desc}</p>
                        </div>
                        <span className="text-xs text-outline">{notif.time}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="w-full mt-4 py-3 rounded-xl text-sm font-semibold text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 group">
                  Ver historial completo
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform" style={{ fontSize: 18 }}>arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => onNavigate('pacientes')}
        className="fixed bottom-8 right-8 z-50 group"
      >
        <div className="absolute inset-0 gradient-primary rounded-full blur-lg opacity-50 group-hover:opacity-100 transition-opacity animate-pulse-soft" />
        <div className="relative w-16 h-16 gradient-primary rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform">
          <span className="material-symbols-outlined fill text-white" style={{ fontSize: 28 }}>person_add</span>
        </div>
        <span className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-on-surface text-white text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 scale-95 group-hover:scale-100">
          Nuevo Paciente
        </span>
      </button>
    </div>
  );
}
