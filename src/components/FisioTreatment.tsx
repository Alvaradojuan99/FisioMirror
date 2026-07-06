import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Patient, Routine, Exercise } from '../lib/types';
import type { FisioView } from './FisioLayout';

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function FisioTreatment({ onNavigate }: { onNavigate: (v: FisioView) => void }) {
  const { fisio } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState({ title: '', description: '', day_of_week: 1 });
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!fisio) return;
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from('patients').select('*').eq('physio_id', fisio.id).order('full_name'),
      supabase.from('routines').select('*').eq('physio_id', fisio.id).order('created_at', { ascending: false }),
    ]);
    setPatients(p as Patient[] || []);
    setRoutines(r as Routine[] || []);
    if (p && p.length > 0 && !selectedPatient) setSelectedPatient((p[0] as Patient).id);
    setLoading(false);
  };

  useEffect(() => { load(); }, [fisio]);

  // Filter routines by search
  const patientRoutines = routines
    .filter((r) => r.patient_id === selectedPatient)
    .filter((r) => {
      if (!searchQuery) return true;
      return r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    });
  const selectedPatientObj = patients.find((p) => p.id === selectedPatient);

  const addExercise = () => setExercises([...exercises, { id: crypto.randomUUID(), name: '', description: '', reps: 10, duration_sec: 30 }]);
  const updateExercise = (id: string, field: keyof Exercise, value: string | number) => setExercises(exercises.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  const removeExercise = (id: string) => setExercises(exercises.filter((e) => e.id !== id));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fisio || !selectedPatient || form.title.trim().length < 3 || exercises.length === 0) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('routines').insert({
        patient_id: selectedPatient, physio_id: fisio.id,
        title: form.title.trim(), description: form.description.trim() || null,
        exercises, day_of_week: form.day_of_week,
      });
      if (error) throw error;
      setForm({ title: '', description: '', day_of_week: 1 });
      setExercises([]);
      setShowForm(false);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta rutina?')) return;
    await supabase.from('routines').delete().eq('id', id);
    await load();
  };

  if (loading) return <div className="h-40 m-8 rounded-xl bg-surface-container animate-pulse" />;

  return (
    <div>
      {/* Header */}
      <header className="bg-surface px-8 py-4 flex items-center gap-4 border-b border-outline-variant/20 sticky top-0 z-30">
        <button onClick={() => onNavigate('dashboard')} className="p-2 rounded-lg hover:bg-surface-container">
          <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
        </button>
        <h1 className="text-lg font-semibold text-on-surface">Configuración de Tratamiento</h1>
        <div className="flex-1 max-w-md relative ml-auto">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline" style={{ fontSize: 20 }}>search</span>
          <input
            type="text"
            placeholder="Buscar rutinas..."
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
          onClick={() => alert('Notificaciones: No hay nuevas notificaciones')}
          className="p-2 rounded-lg hover:bg-surface-container"
        >
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 22 }}>notifications</span>
        </button>
      </header>

      <div className="p-8 space-y-8 max-w-6xl">
        {patients.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-4xl p-12 text-center border border-outline-variant/20">
            <span className="material-symbols-outlined text-outline mx-auto mb-3" style={{ fontSize: 48 }}>contact_page</span>
            <p className="font-medium text-on-surface mb-1">No hay pacientes registrados</p>
            <p className="text-sm text-outline">Registra pacientes primero para asignar rutinas</p>
            <button onClick={() => onNavigate('pacientes')} className="mt-4 bg-primary text-on-primary font-bold py-2.5 px-6 rounded-full">Ir a Pacientes</button>
          </div>
        ) : (
          <>
            {/* Patient selector + info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Patient info */}
              <div className="bg-surface-container-lowest rounded-4xl p-6 border border-outline-variant/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 24 }}>contact_page</span>
                  </div>
                  <h2 className="font-semibold text-on-surface">Información Personal</h2>
                </div>
                <select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)} className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm outline-none mb-3">
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
                <div className="space-y-2">
                  <div className="px-4 py-2.5 bg-surface-container-low rounded-xl">
                    <p className="text-xs text-outline">Paciente</p>
                    <p className="text-sm font-medium text-on-surface">{selectedPatientObj?.full_name}</p>
                  </div>
                  <div className="px-4 py-2.5 bg-surface-container-low rounded-xl">
                    <p className="text-xs text-outline">Edad</p>
                    <p className="text-sm font-medium text-on-surface">{selectedPatientObj?.age ? `${selectedPatientObj.age} años` : 'N/A'}</p>
                  </div>
                  <div className="px-4 py-2.5 bg-surface-container-low rounded-xl">
                    <p className="text-xs text-outline">Condición</p>
                    <p className="text-sm font-medium text-on-surface">{selectedPatientObj?.condition || 'Sin diagnóstico'}</p>
                  </div>
                </div>
              </div>

              {/* Routines */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-primary">Plan de Tratamiento</h2>
                  <button onClick={() => setShowForm(true)} className="bg-primary text-on-primary font-bold py-2.5 px-6 rounded-full flex items-center gap-2 hover:bg-primary-container active:scale-95 shadow-md">
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span> Nueva Rutina
                  </button>
                </div>

                {patientRoutines.length === 0 ? (
                  <div className="bg-surface-container-lowest rounded-4xl p-8 text-center border border-outline-variant/20">
                    <span className="material-symbols-outlined text-outline mx-auto mb-2" style={{ fontSize: 40 }}>fitness_center</span>
                    <p className="text-sm text-outline mb-4">Sin rutinas asignadas</p>
                    <button onClick={() => setShowForm(true)} className="bg-primary text-on-primary font-bold py-2.5 px-6 rounded-full">Crear Rutina</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {patientRoutines.map((r) => (
                      <div key={r.id} className="bg-surface-container-lowest rounded-3xl p-5 border border-outline-variant/20">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-on-surface">{r.title}</h3>
                              <span className="px-2 py-0.5 rounded-full bg-primary-fixed/30 text-primary text-xs font-medium">{DAYS[r.day_of_week]}</span>
                            </div>
                            {r.description && <p className="text-sm text-outline">{r.description}</p>}
                          </div>
                          <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg text-error hover:bg-error/10">
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {(r.exercises as Exercise[]).map((ex, i) => (
                            <div key={ex.id || i} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-container-low">
                              <span className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">{i + 1}</span>
                              <span className="flex-1 text-sm font-medium text-on-surface">{ex.name || `Ejercicio ${i + 1}`}</span>
                              <span className="text-xs text-outline">{ex.reps} reps · {ex.duration_sec}s</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Routine form modal */}
      {showForm && selectedPatientObj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="bg-surface-container-lowest rounded-4xl p-8 w-full max-w-2xl animate-scale-in my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-on-surface">Nueva Rutina para {selectedPatientObj.full_name}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-surface-container"><span className="material-symbols-outlined text-outline">close</span></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-600 ml-1">Título de la Rutina</label>
                <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Rutina de Hombro - Fase 1" className="w-full px-4 py-3 bg-[#e8f5ed] border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-[#10b981] transition-all outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-600 ml-1">Descripción</label>
                  <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Fortalecimiento" className="w-full px-4 py-3 bg-[#e8f5ed] border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-[#10b981] transition-all outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-600 ml-1">Día de la Semana</label>
                  <select value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: parseInt(e.target.value) })} className="w-full px-4 py-3 bg-[#e8f5ed] border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-[#10b981] transition-all outline-none">
                    {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-600 ml-1">Ejercicios</label>
                  <button type="button" onClick={addExercise} className="text-sm font-medium text-primary flex items-center gap-1 hover:underline">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span> Agregar
                  </button>
                </div>
                <div className="space-y-2">
                  {exercises.map((ex, i) => (
                    <div key={ex.id} className="p-3 rounded-xl border border-outline-variant/30 bg-surface-container-low">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-outline">Ejercicio {i + 1}</span>
                        <button type="button" onClick={() => removeExercise(ex.id)} className="ml-auto p-1 text-error hover:bg-error/10 rounded"><span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span></button>
                      </div>
                      <input type="text" required value={ex.name} onChange={(e) => updateExercise(ex.id, 'name', e.target.value)} placeholder="Nombre del ejercicio" className="w-full px-3 py-2 mb-2 bg-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-outline" style={{ fontSize: 16 }}>repeat</span>
                          <input type="number" min={1} value={ex.reps} onChange={(e) => updateExercise(ex.id, 'reps', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 bg-white rounded-lg text-sm outline-none" />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-outline" style={{ fontSize: 16 }}>timer</span>
                          <input type="number" min={1} value={ex.duration_sec} onChange={(e) => updateExercise(ex.id, 'duration_sec', parseInt(e.target.value) || 0)} className="w-full px-3 py-2 bg-white rounded-lg text-sm outline-none" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {exercises.length === 0 && <p className="text-sm text-outline text-center py-3">Agrega al menos un ejercicio</p>}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-full border border-outline-variant text-sm font-medium text-on-surface-variant hover:bg-surface-container">Cancelar</button>
                <button type="submit" disabled={saving || exercises.length === 0} className="flex-1 bg-[#00966d] hover:bg-[#007a58] text-white font-bold py-3 rounded-full flex items-center justify-center gap-2 active:scale-95 shadow-md uppercase disabled:opacity-50">
                  {saving ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: 20 }}>progress_activity</span> : <>Guardar <span className="material-symbols-outlined">save</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
