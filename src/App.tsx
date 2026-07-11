import { useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { AuthScreen } from './components/AuthScreen';
import { FisioLayout, type FisioView } from './components/FisioLayout';
import { FisioDashboard } from './components/FisioDashboard';
import { FisioPatients } from './components/FisioPatients';
import { FisioTreatment } from './components/FisioTreatment';
import { FisioFollowup } from './components/FisioFollowup';
import { FisioSettings } from './components/FisioSettings';
import { PatientLayout, type PatientView } from './components/PatientLayout';
import { PatientOnboarding } from './components/PatientOnboarding';
import { PatientDashboard } from './components/PatientDashboard';
import { PatientSession } from './components/PatientSession';
import { PatientAchievements } from './components/PatientAchievements';
import { PatientSettings } from './components/PatientSettings';
import { FisioAI } from './components/FisioAI';

function AppContent() {
  const { role, fisio, patient, loading, signOutFisio, signOutPatient } = useAuth();
  const [fisioView, setFisioView] = useState<FisioView>('dashboard');
  const [patientView, setPatientView] = useState<PatientView>('dashboard');
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [autoStartSession, setAutoStartSession] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="material-symbols-outlined text-primary animate-spin" style={{ fontSize: 40 }}>progress_activity</span>
      </div>
    );
  }

  // Fisio routes
  if (role === 'fisio' && fisio) {
    return (
      <FisioLayout current={fisioView} onNavigate={setFisioView} onSignOut={signOutFisio} fisioName={fisio.full_name}>
        {fisioView === 'dashboard' && <FisioDashboard onNavigate={setFisioView} />}
        {fisioView === 'pacientes' && <FisioPatients onNavigate={setFisioView} />}
        {fisioView === 'puente' && <FisioTreatment onNavigate={setFisioView} />}
        {fisioView === 'library' && <FisioFollowup onNavigate={setFisioView} />}
        {fisioView === 'configuracion' && <FisioSettings onSignOut={signOutFisio} />}
      </FisioLayout>
    );
  }

  // Patient routes
  if (role === 'patient' && patient) {
    if (!onboardingDone) {
      return <PatientOnboarding patientName={patient.full_name} onContinue={() => setOnboardingDone(true)} />;
    }
    return (
      <PatientLayout current={patientView} onNavigate={(v) => { setPatientView(v); setAutoStartSession(false); }} onSignOut={() => { signOutPatient(); setOnboardingDone(false); }} patientName={patient.full_name}>
        {patientView === 'dashboard' && <PatientDashboard onNavigate={(v, opts) => { setAutoStartSession(opts?.autoStart ?? false); setPatientView(v); }} />}
        {patientView === 'sesiones' && <PatientSession autoStart={autoStartSession} />}
        {patientView === 'progreso' && <PatientAchievements />}
        {patientView === 'asistente' && <FisioAI onNavigate={setPatientView} />}
        {patientView === 'ajustes' && <PatientSettings onSignOut={() => { signOutPatient(); setOnboardingDone(false); }} />}
      </PatientLayout>
    );
  }

  return <AuthScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
