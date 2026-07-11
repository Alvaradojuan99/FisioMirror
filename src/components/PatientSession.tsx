import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Routine, Exercise } from '../lib/types';
import { usePoseDetection, type PoseLandmark, type ExerciseInfo } from '../lib/usePoseDetection';

function calculateAngle(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * (180 / Math.PI));
  if (angle > 180) angle = 360 - angle;
  return Math.round(angle);
}

// Voice feedback using Web Speech API
const speak = (text: string) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
};

export function PatientSession({ autoStart = false }: { autoStart?: boolean }) {
  const { patient } = useAuth();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);
  const [currentEx, setCurrentEx] = useState(0);
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [formQuality, setFormQuality] = useState(0);
  const [feedback, setFeedback] = useState('Posiciónate frente a la cámara');
  const [repCount, setRepCount] = useState(0);
  const [angleDisplay, setAngleDisplay] = useState<number | null>(null);
  const [targetAngle, setTargetAngle] = useState(90);
  const [movementDirection, setMovementDirection] = useState<'up' | 'down'>('down');
  const [lastSpoke, setLastSpoke] = useState(0);

  const lastAngleRef = useRef<number>(0);
  const repDirRef = useRef<'up' | 'down'>('down');

  const { videoRef, canvasRef, poseData, cameraActive, startCamera, stopCamera, drawSkeleton } = usePoseDetection();

  const today = new Date().getDay();

  useEffect(() => {
    if (!patient) return;
    supabase.from('routines').select('*').eq('patient_id', patient.patient_id).then(({ data }) => {
      setRoutines((data as Routine[]) || []);
      setLoading(false);
    });
  }, [patient]);

  // Auto-start AR session if navigated from dashboard
  useEffect(() => {
    if (autoStart && !loading && routines.length > 0 && !activeRoutine) {
      const todayR = routines.filter((r) => r.day_of_week === today);
      if (todayR.length > 0) {
        startRoutine(todayR[0]);
      }
    }
  }, [autoStart, loading, routines, activeRoutine, today]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [running]);

  // Draw skeleton with exercise info
  const drawSkeletonWithInfo = useCallback((landmarks: PoseLandmark[], exInfo: ExerciseInfo) => {
    drawSkeleton(landmarks, exInfo);
  }, [drawSkeleton]);

  // Pose-based rep counting and form quality with improved feedback
  useEffect(() => {
    if (!poseData.landmarks || !running) return;
    const lm = poseData.landmarks;
    const now = Date.now();

    // Right arm angle (shoulder 12, elbow 14, wrist 16)
    let angle: number | null = null;
    let activeArm = 'right';

    if (lm[12] && lm[14] && lm[16] && lm[12].visibility > 0.5 && lm[14].visibility > 0.5 && lm[16].visibility > 0.5) {
      angle = calculateAngle(lm[12], lm[14], lm[16]);
    } else if (lm[11] && lm[13] && lm[15] && lm[11].visibility > 0.5 && lm[13].visibility > 0.5 && lm[15].visibility > 0.5) {
      angle = calculateAngle(lm[11], lm[13], lm[15]);
      activeArm = 'left';
    }

    if (angle !== null) {
      setAngleDisplay(angle);

      // Form quality based on angle range (extended = 170°, bent = 40°)
      // Optimal movement is between these ranges
      const inExtendedRange = angle > 140; // arm extended
      const inBentRange = angle < 60; // arm bent

      // Quality calculation: reward being in the target ranges
      let quality = 50;
      if (inExtendedRange || inBentRange) {
        quality = 100;
      } else if (angle > 100 || angle < 80) {
        quality = 80;
      }
      setFormQuality(quality);

      // Determine current phase and direction
      const direction: 'up' | 'down' = angle > lastAngleRef.current ? 'up' : 'down';
      setMovementDirection(direction);

      // Exercise info for skeleton drawing
      const exerciseInfo: ExerciseInfo = {
        targetAngle: inExtendedRange ? 160 : (inBentRange ? 50 : 90),
        tolerance: 20,
        direction: direction
      };
      drawSkeletonWithInfo(lm, exerciseInfo);

      // Rep counting: detect full range of motion
      if (angle < 50 && lastAngleRef.current >= 50) {
        repDirRef.current = 'down';
        if (now - lastSpoke > 2000) {
          setFeedback('¡Bien! Ahora extiende el brazo');
          speak('¡Excelente! Extiende el brazo');
          setLastSpoke(now);
        }
      } else if (angle > 140 && lastAngleRef.current <= 140 && repDirRef.current === 'down') {
        repDirRef.current = 'up';
        setRepCount((c) => c + 1);
        setFeedback('¡Repetición completada!');
        speak('¡Muy bien! Repetición completada');
        setLastSpoke(now);
      } else if (angle >= 50 && angle <= 140) {
        if (now - lastSpoke > 3000) {
          const msg = direction === 'up'
            ? 'Continúa extendiendo el brazo hacia arriba'
            : 'Continúa flexionando el codo';
          setFeedback(msg);
        }
      }
      lastAngleRef.current = angle;
    }
  }, [poseData.landmarks, running, drawSkeletonWithInfo, lastSpoke]);

  const todayRoutines = routines.filter((r) => r.day_of_week === today);
  const exercises = activeRoutine ? (activeRoutine.exercises as Exercise[]) : [];
  const currentExercise = exercises[currentEx];

  const startRoutine = (r: Routine) => {
    setActiveRoutine(r);
    setCurrentEx(0);
    setTimer(0);
    setRunning(false);
    setCompleted(new Set());
    setDone(false);
    setRepCount(0);
    setFormQuality(0);
    setFeedback('Posiciónate frente a la cámara y presiona iniciar');
    setLastSpoke(0);
    setTimeout(() => startCamera(), 300);
  };

  const handleStart = () => {
    setRunning(true);
    speak('Iniciando ejercicio. ' + (currentExercise?.name || 'Prepárate'));
  };

  const completeExercise = () => {
    if (!currentExercise || !activeRoutine) return;
    const newCompleted = new Set(completed);
    newCompleted.add(currentExercise.id);
    setCompleted(newCompleted);
    if (currentEx < exercises.length - 1) {
      setCurrentEx(currentEx + 1);
      setTimer(0);
      setRunning(false);
      setRepCount(0);
      const nextEx = exercises[currentEx + 1];
      setFeedback('Siguiente ejercicio: ' + (nextEx?.name || ''));
      speak('Siguiente ejercicio. ' + (nextEx?.name || ''));
    } else {
      finishRoutine(newCompleted);
    }
  };

  const finishRoutine = async (completedSet: Set<string>) => {
    if (!patient || !activeRoutine) return;
    setSaving(true);
    setRunning(false);
    stopCamera();
    const score = Math.round((completedSet.size / exercises.length) * 100);
    try {
      await supabase.from('sessions').insert({
        patient_id: patient.patient_id,
        routine_id: activeRoutine.id,
        completed_exercises: completedSet.size,
        total_exercises: exercises.length,
        duration_minutes: Math.max(1, Math.round(timer / 60)),
        score,
      });
      setDone(true);
      speak('¡Felicidades! Sesión completada');
    } catch {
      alert('Error al guardar sesión');
    } finally {
      setSaving(false);
    }
  };

  const exitSession = () => {
    stopCamera();
    setActiveRoutine(null);
    setRunning(false);
  };

  if (loading) return <div className="h-40 m-8 rounded-xl bg-surface-container animate-pulse" />;

  // Completion screen
  if (done) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="text-center animate-scale-in">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center mx-auto mb-6 shadow-lg">
            <span className="material-symbols-outlined fill text-white" style={{ fontSize: 48 }}>emoji_events</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface mb-2">¡Sesión Completada!</h1>
          <p className="text-on-surface-variant mb-6">{completed.size} de {exercises.length} ejercicios completados</p>
          <div className="bg-surface-container-lowest rounded-3xl p-5 max-w-xs mx-auto mb-6 border border-outline-variant/20">
            <div className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined fill text-tertiary" style={{ fontSize: 24 }}>stars</span>
              <span className="text-3xl font-bold text-on-surface">+{Math.round((completed.size / exercises.length) * 100)}</span>
              <span className="text-sm text-outline">puntos</span>
            </div>
          </div>
          <button onClick={() => { setActiveRoutine(null); setDone(false); }} className="bg-primary text-on-primary font-bold py-3 px-8 rounded-full flex items-center gap-2 mx-auto hover:bg-primary-container active:scale-95 shadow-md">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>check_circle</span> Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  // Active AR session
  if (activeRoutine && currentExercise) {
    const progress = repCount / (currentExercise.reps || 1);

    return (
      <div className="fixed inset-0 bg-black z-50">
        {/* Camera feed + canvas overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
            autoPlay
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />

          {!cameraActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              <div className="text-center">
                <span className="material-symbols-outlined text-slate-600" style={{ fontSize: 64 }}>videocam_off</span>
                <p className="text-slate-400 text-sm mt-3">Cámara desactivada</p>
                <button onClick={() => startCamera()} className="mt-4 bg-primary text-on-primary font-bold py-2.5 px-6 rounded-full flex items-center gap-2 mx-auto hover:bg-primary-container active:scale-95 shadow-md">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>videocam</span> Activar Cámara
                </button>
              </div>
            </div>
          )}

          {cameraActive && running && (
            <div className="absolute left-0 right-0 h-0.5 bg-primary-fixed-dim" style={{ boxShadow: '0 0 12px #67dbad', animation: 'scanningLine 3s linear infinite' }}></div>
          )}

          {poseData.error && (
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 glass-panel rounded-2xl px-6 py-3 max-w-md text-center">
              <span className="material-symbols-outlined text-error" style={{ fontSize: 20 }}>error</span>
              <p className="text-sm text-error mt-1">{poseData.error}</p>
            </div>
          )}
        </div>

        {/* Top bar */}
        <div className="fixed top-0 left-0 right-0 p-4 md:p-6 z-10">
          <div className="flex items-center justify-between">
            <div className="glass-panel rounded-full px-4 py-2 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${running ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`}></span>
              <img src="/ChatGPT_Image_5_jul_2026,_12_59_59_a.m._(1).png" alt="FisioMirror" className="w-6 h-6 object-contain" />
              <span className="text-sm font-bold text-primary">FISIOMIRROR AR</span>
            </div>
            <div className="glass-panel rounded-2xl px-4 py-2 text-center border-t-2 border-primary">
              <p className="text-xs text-outline">Tiempo</p>
              <p className="text-2xl font-bold text-primary font-mono">{String(Math.floor(timer / 60)).padStart(2, '0')}:{String(timer % 60).padStart(2, '0')}</p>
            </div>
          </div>

          {/* Exercise instruction bar */}
          <div className="mt-3 glass-panel rounded-2xl px-4 py-3 max-w-md mx-auto">
            <p className="text-xs text-outline text-center">Ejercicio Actual</p>
            <p className="text-lg font-bold text-on-surface text-center">{currentExercise.name || `Ejercicio ${currentEx + 1}`}</p>
            <p className="text-xs text-outline text-center mt-1">{currentExercise.description || 'Sigue las indicaciones visuales'}</p>
          </div>
        </div>

        {/* Left side - Angle indicator */}
        <div className="fixed left-4 top-1/2 -translate-y-1/2 z-10 hidden md:block">
          <div className="glass-panel rounded-2xl p-4 w-48 space-y-4">
            {/* Current angle */}
            <div>
              <p className="text-xs text-outline mb-1">Ángulo Actual</p>
              <div className="flex items-baseline gap-1">
                <span className={`text-4xl font-bold ${formQuality > 70 ? 'text-green-400' : formQuality > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {angleDisplay ?? '--'}
                </span>
                <span className="text-outline">°</span>
              </div>
            </div>

            {/* Target angle indicator */}
            <div className="bg-surface-container rounded-xl p-3">
              <p className="text-xs text-outline mb-2">Rango Objetivo</p>
              <div className="flex justify-between text-xs">
                <span className="text-yellow-300">40° Flex</span>
                <span className="text-green-300">↕</span>
                <span className="text-yellow-300">160° Ext</span>
              </div>
            </div>

            {/* Movement direction */}
            <div className="flex items-center justify-center gap-2 py-2">
              <span className={`material-symbols-outlined ${movementDirection === 'up' ? 'text-green-400' : 'text-outline'}`} style={{ fontSize: 32 }}>
                {movementDirection === 'up' ? 'arrow_upward' : 'arrow_downward'}
              </span>
              <span className="text-xs text-outline">
                {movementDirection === 'up' ? 'Extiende' : 'Flexiona'}
              </span>
            </div>
          </div>
        </div>

        {/* Right side - Quality & Reps */}
        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-10 hidden md:block">
          <div className="space-y-4">
            {/* Form quality gauge */}
            <div className="glass-panel rounded-2xl p-4 w-48">
              <p className="text-xs text-outline mb-2">Calidad de Forma</p>
              <div className="relative h-32 w-full flex items-center justify-center">
                {/* Circular progress */}
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="45"
                    fill="none"
                    stroke={formQuality > 70 ? '#4ade80' : formQuality > 50 ? '#fbbf24' : '#ef4444'}
                    strokeWidth="8"
                    strokeDasharray={`${formQuality * 2.83} 283`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className={`text-3xl font-bold ${formQuality > 70 ? 'text-green-400' : formQuality > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {formQuality}%
                </span>
              </div>
              <div className="flex items-center justify-center gap-1 mt-2">
                <span className={`material-symbols-outlined fill ${formQuality > 70 ? 'text-green-400' : 'text-red-400'}`} style={{ fontSize: 16 }}>
                  {formQuality > 70 ? 'check_circle' : 'warning'}
                </span>
                <span className={`text-xs ${formQuality > 70 ? 'text-green-400' : 'text-red-400'}`}>
                  {formQuality > 70 ? '¡Excelente!' : 'Ajusta posición'}
                </span>
              </div>
            </div>

            {/* Repetitions counter */}
            <div className="glass-panel rounded-2xl p-4 w-48">
              <p className="text-xs text-outline mb-2">Repeticiones</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-primary">{repCount}</span>
                <span className="text-xl text-outline">/ {currentExercise.reps}</span>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-2 bg-surface-container rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-green-400 transition-all duration-300"
                  style={{ width: `${Math.min(progress * 100, 100)}%` }}
                />
              </div>
              {progress >= 1 && (
                <button onClick={completeExercise} className="w-full mt-3 bg-green-500 text-white font-bold py-2 rounded-full text-sm animate-pulse">
                  ¡Completado! Siguiente →
                </button>
              )}
            </div>

            {/* Exercise progress */}
            <div className="glass-panel rounded-2xl p-4 w-48">
              <p className="text-xs text-outline mb-2">Progreso</p>
              <div className="flex gap-1">
                {exercises.map((ex, i) => (
                  <div
                    key={ex.id || i}
                    className={`h-2 flex-1 rounded-full ${
                      completed.has(ex.id) ? 'bg-green-400' :
                      i === currentEx ? 'bg-primary animate-pulse' : 'bg-surface-container'
                    }`}
                  />
                ))}
              </div>
              <p className="text-center text-sm mt-2 text-on-surface">
                {currentEx + 1} de {exercises.length}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="fixed bottom-0 left-0 right-0 p-4 z-10 flex flex-col items-center gap-3">
          {/* Voice feedback */}
          <div className={`glass-panel rounded-full px-6 py-3 flex items-center gap-3 max-w-md border-2 ${
            formQuality > 70 ? 'border-green-400/50' : formQuality > 50 ? 'border-yellow-400/50' : 'border-red-400/50'
          }`}>
            <span className={`material-symbols-outlined ${formQuality > 70 ? 'text-green-400' : 'text-primary'}`} style={{ fontSize: 20 }}>
              graphic_eq
            </span>
            <p className={`text-sm ${formQuality > 70 ? 'text-green-400' : 'text-primary'}`}>{feedback}</p>
          </div>

          {/* Action bar */}
          <div className="glass-panel rounded-3xl px-4 md:px-6 py-4 flex items-center gap-3 md:gap-4 max-w-lg w-full">
            <button
              onClick={() => setRunning(!running)}
              className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-all ${
                running
                  ? 'bg-yellow-500 text-white'
                  : 'bg-green-500 text-white'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 28 }}>{running ? 'pause' : 'play_arrow'}</span>
            </button>
            <div className="flex-1 text-center min-w-0">
              <p className="text-xs text-outline">
                {!running && !cameraActive ? 'Activa la cámara' : !running ? 'Presiona iniciar' : 'En progreso...'}
              </p>
              {running && (
                <p className="text-lg font-bold text-on-surface">{repCount}/{currentExercise.reps} reps</p>
              )}
            </div>
            <button
              onClick={completeExercise}
              disabled={saving}
              className="bg-error text-on-error rounded-2xl px-4 py-2.5 flex items-center gap-2 font-medium text-sm hover:bg-error/90 disabled:opacity-50 shrink-0"
            >
              {saving ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: 20 }}>progress_activity</span> : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>stop</span>
                  <span className="hidden sm:inline">{currentEx < exercises.length - 1 ? 'Siguiente' : 'Finalizar'}</span>
                </>
              )}
            </button>
            <button
              onClick={() => cameraActive ? stopCamera() : startCamera()}
              className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high shrink-0"
            >
              <span className="material-symbols-outlined text-on-surface" style={{ fontSize: 20 }}>{cameraActive ? 'videocam' : 'videocam_off'}</span>
            </button>
            <button
              onClick={exitSession}
              className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-error/10 hover:text-error shrink-0"
            >
              <span className="material-symbols-outlined text-on-surface" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>
        </div>

        {/* Mobile overlay - simpler view */}
        <div className="md:hidden fixed bottom-32 left-4 right-4 z-10">
          <div className="glass-panel rounded-2xl p-4 flex items-center justify-between">
            <div className="text-center">
              <p className="text-xs text-outline">Ángulo</p>
              <p className={`text-2xl font-bold ${formQuality > 70 ? 'text-green-400' : formQuality > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                {angleDisplay ?? '--'}°
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-outline">Reps</p>
              <p className="text-2xl font-bold text-primary">{repCount}/{currentExercise.reps}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-outline">Calidad</p>
              <p className={`text-2xl font-bold ${formQuality > 70 ? 'text-green-400' : formQuality > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                {formQuality}%
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Routine selection
  return (
    <div>
      <header className="bg-surface px-8 py-4 flex items-center justify-between border-b border-outline-variant/20 sticky top-0 z-30 backdrop-blur bg-background/80">
        <h1 className="text-lg font-semibold text-on-surface">Mis Sesiones de Terapia</h1>
        <div className="flex-1 max-w-md relative ml-4">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline" style={{ fontSize: 20 }}>search</span>
          <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 bg-surface-container-low rounded-full text-sm outline-none focus:ring-2 focus:ring-secondary/30" />
        </div>
        <button className="p-2 rounded-lg hover:bg-surface-container"><span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 22 }}>notifications</span></button>
      </header>

      <div className="p-8 grid grid-cols-12 gap-6 max-w-7xl">
        {/* Left: Featured + exercises */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {todayRoutines.length > 0 ? (
            <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/20 shadow-sm">
              <span className="inline-block bg-primary-fixed/30 text-primary text-xs font-bold px-3 py-1.5 rounded-full mb-3 relative">
                <span className="absolute inset-0 rounded-full animate-ping bg-primary-fixed opacity-30"></span>
                Disponible Ahora
              </span>
              <h2 className="text-2xl font-bold text-on-surface mb-2">{todayRoutines[0].title}</h2>
              <p className="text-sm text-outline mb-4">{todayRoutines[0].description || 'Completa tu rutina de hoy'}</p>
              <div className="flex items-center gap-4 text-sm text-on-surface-variant mb-4">
                <span className="flex items-center gap-1"><span className="material-symbols-outlined" style={{ fontSize: 18 }}>timer</span> {(todayRoutines[0].exercises as Exercise[]).reduce((a, e) => a + e.duration_sec, 0)}s</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined" style={{ fontSize: 18 }}>local_fire_department</span> Intensidad Media</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined" style={{ fontSize: 18 }}>assignment_turned_in</span> {(todayRoutines[0].exercises as Exercise[]).length} Ejercicios</span>
              </div>
              <button onClick={() => startRoutine(todayRoutines[0])} className="bg-primary text-on-primary font-bold py-3 px-8 rounded-full flex items-center gap-2 hover:bg-primary-container active:scale-95 shadow-md">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>videocam</span> Comenzar Sesión AR
              </button>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-3xl p-8 text-center border border-outline-variant/20">
              <span className="material-symbols-outlined text-outline mx-auto mb-3" style={{ fontSize: 48 }}>play_circle</span>
              <p className="font-medium text-on-surface mb-1">No hay rutinas para hoy</p>
              <p className="text-sm text-outline">Tu fisioterapeuta asignará ejercicios pronto</p>
            </div>
          )}

          {todayRoutines.length > 0 && (
            <div>
              <h3 className="font-semibold text-on-surface mb-3">Ejercicios Prescritos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(todayRoutines[0].exercises as Exercise[]).map((ex, i) => (
                  <div key={ex.id || i} className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/20 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary-fixed/20 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: 24 }}>accessibility_new</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">{ex.name || `Ejercicio ${i + 1}`}</p>
                      <p className="text-xs text-outline">{ex.reps} reps · {ex.duration_sec}s</p>
                    </div>
                    <span className="px-2 py-1 rounded-full bg-surface-container text-xs text-outline">Pendiente</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Streak + help */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="bg-primary text-on-primary rounded-3xl p-6 relative overflow-hidden">
            <span className="material-symbols-outlined fill absolute -right-4 -bottom-4 opacity-20" style={{ fontSize: 120, transform: 'rotate(12deg)' }}>local_fire_department</span>
            <div className="relative z-10">
              <span className="material-symbols-outlined fill" style={{ fontSize: 24 }}>stars</span>
              <h3 className="text-xl font-bold mt-2">¡Racha Activa!</h3>
              <p className="text-sm opacity-80 mt-1">Sigue completando tus sesiones</p>
            </div>
          </div>

          <div className="border-2 border-dashed border-outline-variant rounded-3xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>support_agent</span>
              </div>
              <div>
                <p className="text-sm font-medium text-on-surface">¿Necesitas ayuda?</p>
                <p className="text-xs text-outline mt-0.5 mb-3">Contacta a tu fisioterapeuta</p>
                <button className="text-sm font-medium text-primary flex items-center gap-1 hover:underline">Contactar Soporte <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
