import { useEffect, useState, useRef } from 'react';
import { supabase, generateToken } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Patient, AccessToken, Exercise } from '../lib/types';
import type { FisioView } from './FisioLayout';
import { extractRecipeData, type ExtractedRecipeData } from '../lib/recipeOcr';

export function FisioPatients({ onNavigate }: { onNavigate: (v: FisioView) => void }) {
  const { fisio } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tokens, setTokens] = useState<Record<string, AccessToken>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Recipe upload states
  const [showRecipeUpload, setShowRecipeUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [ocrProgress, setOcrProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ full_name: '', age: '', condition: '', notes: '' });
  const [extractedExercises, setExtractedExercises] = useState<Exercise[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Formato no válido. Use PNG o JPG para extracción con IA.');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('El archivo es demasiado grande. Máximo 10MB.');
      return;
    }

    setSelectedFile(file);
    setUploadError('');
    setOcrProgress(0);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview('pdf');
    }
  };

  // Extract data from recipe image using OCR (Tesseract.js)
  const extractDataFromDocument = async (file: File): Promise<ExtractedRecipeData> => {
    setExtracting(true);
    setOcrProgress(0);

    try {
      const data = await extractRecipeData(file);
      setOcrProgress(100);
      return data;
    } finally {
      setExtracting(false);
    }
  };

  // Process recipe with OCR and auto-fill form
  const handleRecipeProcess = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadError('');

    try {
      const data = await extractDataFromDocument(selectedFile);

      // Auto-fill form with extracted data
      setForm({
        full_name: data.full_name || '',
        age: data.age || '',
        condition: data.condition || '',
        notes: data.notes || '',
      });
      setExtractedExercises(data.exercises || []);

      // Close upload modal and open form
      setShowRecipeUpload(false);
      setShowForm(true);
      resetRecipeUpload();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al procesar el documento. Intente nuevamente.');
    } finally {
      setUploading(false);
    }
  };

  // Reset recipe upload state
  const resetRecipeUpload = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setUploadError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Open recipe upload modal
  const openRecipeUpload = () => {
    setShowRecipeUpload(true);
    setGeneratedToken(null);
    setExtractedExercises([]);
  };

  // Load patients data
  const load = async () => {
    if (!fisio) return;
    const [{ data: p }, { data: t }] = await Promise.all([
      supabase.from('patients').select('*').eq('physio_id', fisio.id).order('created_at', { ascending: false }),
      supabase.from('access_tokens').select('*').eq('physio_id', fisio.id).eq('is_active', true),
    ]);
    setPatients(p as Patient[] || []);
    const tm: Record<string, AccessToken> = {};
    (t as AccessToken[] || []).forEach((tok) => { tm[tok.patient_id] = tok; });
    setTokens(tm);
    setLoading(false);
  };

  useEffect(() => { load(); }, [fisio]);

  // Filter patients based on search
  const filteredPatients = patients.filter((p) => {
    const matchesSearch = p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.condition?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (p.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesSearch;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fisio) return;
    setError('');
    if (form.full_name.trim().length < 3) return setError('El nombre del paciente es obligatorio.');
    setSaving(true);
    try {
      const { data: patient, error: pErr } = await supabase
        .from('patients')
        .insert({ physio_id: fisio.id, full_name: form.full_name.trim(), age: form.age ? parseInt(form.age) : null, condition: form.condition.trim() || null, notes: form.notes.trim() || null })
        .select().single();
      if (pErr) throw pErr;

      // Auto-create routine with extracted exercises (if any)
      if (extractedExercises.length > 0) {
        const { error: rErr } = await supabase.from('routines').insert({
          patient_id: patient.id,
          physio_id: fisio.id,
          title: `Rutina extraída del récipe - ${form.full_name.trim()}`,
          description: 'Generada automáticamente desde el documento cargado',
          exercises: extractedExercises,
          day_of_week: new Date().getDay(),
        });
        if (rErr) console.error('Error creating routine from recipe:', rErr);
      }

      let token = generateToken(6);
      let attempts = 0;
      while (attempts < 10) {
        const { data: existing } = await supabase.from('access_tokens').select('id').eq('token', token).maybeSingle();
        if (!existing) break;
        token = generateToken(6);
        attempts++;
      }

      const { error: tErr } = await supabase.from('access_tokens').insert({ token, patient_id: patient.id, physio_id: fisio.id, is_active: true });
      if (tErr) throw tErr;

      setGeneratedToken(token);
      setForm({ full_name: '', age: '', condition: '', notes: '' });
      setExtractedExercises([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar paciente');
    } finally {
      setSaving(false);
    }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDelete = async (patientId: string) => {
    setDeleting(true);
    try {
      await supabase.from('patients').delete().eq('id', patientId);
      await load();
      setDeleteConfirm(null);
    } catch (err) {
      alert('Error al eliminar paciente');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <header className="bg-surface px-4 sm:px-8 py-4 flex items-center gap-4 border-b border-outline-variant/20">
        <button onClick={() => onNavigate('dashboard')} className="p-2 rounded-lg hover:bg-surface-container">
          <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
        </button>
        <h1 className="text-lg font-semibold text-on-surface">Gestión de Pacientes</h1>
        <div className="flex-1 max-w-md relative ml-auto">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline" style={{ fontSize: 20 }}>search</span>
          <input
            type="text"
            placeholder="Buscar por nombre, condición..."
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
        <button className="p-2 rounded-lg hover:bg-surface-container"><span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 22 }}>notifications</span></button>
        <button className="p-2 rounded-lg hover:bg-surface-container"><span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 22 }}>help_outline</span></button>
      </header>

      <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-w-6xl">
        {/* Generated Token Highlight */}
        {generatedToken && (
          <div className="bg-surface-container-lowest rounded-4xl p-8 border border-outline-variant/20 shadow-lg animate-scale-in relative overflow-hidden">
            <span className="material-symbols-outlined absolute top-4 right-4 text-primary opacity-10" style={{ fontSize: 120 }}>verified_user</span>
            <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
              <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined fill text-primary" style={{ fontSize: 32 }}>check_circle</span>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-sm font-medium text-primary mb-1">Vínculo Seguro Activo</p>
                <h2 className="text-lg font-semibold text-on-surface mb-3">Código de Enlace de Paciente</h2>
                <div className="inline-flex items-center gap-3 bg-surface-container-low rounded-2xl px-6 py-3">
                  <span className="text-4xl font-black font-mono text-primary tracking-widest">{generatedToken}</span>
                  <button onClick={() => copyToken(generatedToken)} className="p-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container">
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{copied ? 'check' : 'content_copy'}</span>
                  </button>
                </div>
                <p className="text-xs text-outline mt-3">Comparte este código con el paciente para que pueda acceder</p>
              </div>
              <button onClick={() => setGeneratedToken(null)} className="p-2 rounded-lg hover:bg-surface-container">
                <span className="material-symbols-outlined text-outline">close</span>
              </button>
            </div>
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-primary">Pacientes Registrados</h2>
            <p className="text-sm text-outline mt-1">
              {searchQuery ? `${filteredPatients.length} de ${patients.length} pacientes` : `${patients.length} pacientes activos`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openRecipeUpload}
              className="bg-secondary text-on-secondary font-bold py-2.5 px-6 rounded-full flex items-center gap-2 hover:bg-secondary-container transition-all active:scale-95 shadow-md"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>upload_file</span>
              Cargar Récipe
            </button>
            <button onClick={() => { setShowForm(true); setGeneratedToken(null); }} className="bg-primary text-on-primary font-bold py-2.5 px-6 rounded-full flex items-center gap-2 hover:bg-primary-container transition-all active:scale-95 shadow-md">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>person_add</span>
              Nuevo Paciente
            </button>
          </div>
        </div>

        {/* Patient list */}
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-surface-container animate-pulse" />)}</div>
        ) : filteredPatients.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl p-12 text-center border border-outline-variant/20">
            <span className="material-symbols-outlined text-outline mx-auto mb-3" style={{ fontSize: 48 }}>person_off</span>
            <p className="font-medium text-on-surface mb-1">{searchQuery ? 'No se encontraron pacientes' : 'No hay pacientes registrados'}</p>
            <p className="text-sm text-outline mb-4">{searchQuery ? 'Intenta con otra búsqueda' : 'Comienza registrando tu primer paciente'}</p>
            {searchQuery ? (
              <button onClick={() => setSearchQuery('')} className="bg-surface-container text-on-surface font-bold py-2.5 px-6 rounded-full inline-flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span> Limpiar búsqueda
              </button>
            ) : (
              <button onClick={() => setShowForm(true)} className="bg-primary text-on-primary font-bold py-2.5 px-6 rounded-full inline-flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>person_add</span> Registrar Paciente
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPatients.map((p) => {
              const token = tokens[p.id];
              return (
                <div key={p.id} className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/20 bento-card">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary-container flex items-center justify-center text-on-primary font-semibold text-lg shrink-0">
                      {p.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-on-surface truncate">{p.full_name}</p>
                      <p className="text-xs text-outline">{p.age ? `${p.age} años` : 'Edad N/A'} · {new Date(p.created_at).toLocaleDateString()}</p>
                      {p.condition && <p className="text-sm text-on-surface-variant mt-1">{p.condition}</p>}
                    </div>
                    <button
                      onClick={() => setDeleteConfirm(p.id)}
                      className="p-1.5 rounded-lg text-outline hover:bg-error/10 hover:text-error transition-all"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                    </button>
                  </div>
                  {token ? (
                    <div className="mt-3 flex items-center gap-2 bg-primary-fixed/20 rounded-xl px-3 py-2">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>verified_user</span>
                      <span className="font-mono font-bold text-primary tracking-wider">{token.token}</span>
                      <button onClick={() => copyToken(token.token)} className="ml-auto p-1 rounded text-primary hover:bg-primary/10">
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{copied === token.token ? 'check' : 'content_copy'}</span>
                      </button>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-error">Sin token activo</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-surface-container-lowest rounded-4xl p-8 w-full max-w-lg animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-on-surface">Registrar Nuevo Paciente</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-surface-container">
                <span className="material-symbols-outlined text-outline">close</span>
              </button>
            </div>
            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-container px-4 py-3">
                <span className="material-symbols-outlined text-error" style={{ fontSize: 20 }}>error</span>
                <p className="text-sm text-error">{error}</p>
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              {extractedExercises.length > 0 && (
                <div className="mb-4 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>auto_awesome</span>
                    <p className="text-sm font-medium text-primary">Ejercicios extraídos del récipe ({extractedExercises.length})</p>
                  </div>
                  <div className="space-y-1.5">
                    {extractedExercises.map((ex, i) => (
                      <div key={ex.id || i} className="flex items-center gap-2 text-xs text-on-surface-variant">
                        <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center font-semibold text-primary">{i + 1}</span>
                        <span className="flex-1 font-medium">{ex.name}</span>
                        <span className="text-outline">{ex.reps} reps · {ex.duration_sec}s</span>
                        <button type="button" onClick={() => setExtractedExercises(extractedExercises.filter((_, idx) => idx !== i))}
                          className="p-0.5 text-error hover:bg-error/10 rounded">
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-outline mt-2">Se creará una rutina con estos ejercicios al registrar al paciente.</p>
                </div>
              )}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-600 ml-1">Nombre Completo</label>
                <input type="text" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="María González" className="w-full px-4 py-3 bg-[#e8f5ed] border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-[#10b981] transition-all duration-200 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-600 ml-1">Edad</label>
                  <input type="number" min={0} max={120} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="45" className="w-full px-4 py-3 bg-[#e8f5ed] border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-[#10b981] transition-all duration-200 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-600 ml-1">Condición</label>
                  <input type="text" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} placeholder="Lumbalgia" className="w-full px-4 py-3 bg-[#e8f5ed] border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-[#10b981] transition-all duration-200 outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-600 ml-1">Notas Clínicas</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observaciones..." rows={3} className="w-full px-4 py-3 bg-[#e8f5ed] border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-[#10b981] transition-all duration-200 outline-none resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setExtractedExercises([]); }} className="flex-1 py-3 rounded-full border border-outline-variant text-sm font-medium text-on-surface-variant hover:bg-surface-container">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-[#00966d] hover:bg-[#007a58] text-white font-bold py-3 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md uppercase disabled:opacity-50">
                  {saving ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: 20 }}>progress_activity</span> : <>Registrar <span className="material-symbols-outlined">arrow_forward</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-surface-container-lowest rounded-4xl p-8 w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-error" style={{ fontSize: 32 }}>warning</span>
              </div>
              <h2 className="text-xl font-bold text-on-surface">¿Eliminar paciente?</h2>
              <p className="text-sm text-outline mt-2">Esta acción eliminará al paciente y su token de acceso. No se puede deshacer.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 py-3 rounded-full border border-outline-variant text-sm font-medium text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="flex-1 bg-error text-on-error font-bold py-3 rounded-full flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-error/90"
              >
                {deleting ? (
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: 20 }}>progress_activity</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Upload Modal */}
      {showRecipeUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => { setShowRecipeUpload(false); resetRecipeUpload(); }}>
          <div className="bg-surface-container-lowest rounded-4xl p-8 w-full max-w-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary" style={{ fontSize: 28 }}>medical_services</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-on-surface">Cargar Récipe Médico</h2>
                  <p className="text-sm text-outline">La IA extraerá los datos automáticamente</p>
                </div>
              </div>
              <button onClick={() => { setShowRecipeUpload(false); resetRecipeUpload(); }} className="p-2 rounded-lg hover:bg-surface-container">
                <span className="material-symbols-outlined text-outline">close</span>
              </button>
            </div>

            {uploadError && (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-container px-4 py-3">
                <span className="material-symbols-outlined text-error" style={{ fontSize: 20 }}>error</span>
                <p className="text-sm text-error">{uploadError}</p>
              </div>
            )}

            {/* Upload area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                selectedFile
                  ? 'border-primary bg-primary/5'
                  : 'border-outline-variant hover:border-primary hover:bg-primary/5'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg"
                onChange={handleFileSelect}
                className="hidden"
              />

              {filePreview ? (
                <div className="space-y-4">
                  {filePreview === 'pdf' ? (
                    <div className="flex items-center justify-center gap-3">
                      <span className="material-symbols-outlined text-error" style={{ fontSize: 48 }}>picture_as_pdf</span>
                      <div className="text-left">
                        <p className="font-medium text-on-surface">{selectedFile?.name}</p>
                        <p className="text-sm text-outline">{selectedFile && (selectedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                  ) : filePreview ? (
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="max-h-64 mx-auto rounded-xl shadow-md"
                    />
                  ) : null}
                  <p className="text-sm text-primary">Click para cambiar archivo</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-surface-container mx-auto flex items-center justify-center">
                    <span className="material-symbols-outlined text-outline" style={{ fontSize: 32 }}>upload_file</span>
                  </div>
                  <div>
                    <p className="font-medium text-on-surface">Arrastra tu archivo aquí o haz click</p>
                    <p className="text-sm text-outline mt-1">PNG o JPG hasta 10MB</p>
                  </div>
                </div>
              )}
            </div>

            {/* Processing indicator */}
            {(extracting || uploading) && (
              <div className="mt-6 bg-primary/10 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary animate-spin" style={{ fontSize: 24 }}>progress_activity</span>
                  <div>
                    <p className="font-medium text-primary">{extracting ? 'Procesando documento con OCR...' : 'Procesando...'}</p>
                    <p className="text-sm text-outline">Extrayendo nombre, edad, patología y ejercicios del récipe médico</p>
                  </div>
                </div>
                {ocrProgress > 0 && ocrProgress < 100 && (
                  <div className="mt-3 h-1.5 bg-primary/20 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${ocrProgress}%` }} />
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowRecipeUpload(false); resetRecipeUpload(); }}
                disabled={uploading || extracting}
                className="flex-1 py-3 rounded-full border border-outline-variant text-sm font-medium text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRecipeProcess}
                disabled={!selectedFile || uploading || extracting}
                className="flex-1 bg-secondary text-on-secondary font-bold py-3 rounded-full flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-secondary-container transition-all"
              >
                {uploading || extracting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: 20 }}>progress_activity</span>
                    Procesando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>auto_awesome</span>
                    Extraer Datos con IA
                  </>
                )}
              </button>
            </div>

            {/* Info */}
            <div className="mt-4 flex items-start gap-2 text-xs text-outline">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>info</span>
              <p>El OCR analizará la imagen del documento y extraerá los datos del paciente y los ejercicios prescritos. Podrás editarlos antes de guardar.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
