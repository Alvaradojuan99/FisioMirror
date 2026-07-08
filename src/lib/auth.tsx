import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { supabase } from './supabase';
import type { FisioUser, PatientUser, Role } from './types';

interface AuthState {
  role: Role;
  fisio: FisioUser | null;
  patient: PatientUser | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signInFisio: (email: string, password: string) => Promise<void>;
  signUpFisio: (full_name: string, email: string, password: string, university: string) => Promise<void>;
  signOutFisio: () => Promise<void>;
  signInPatient: (token: string) => Promise<PatientUser>;
  signOutPatient: () => void;
  pauseNavigation: () => void;
  resumeNavigation: () => void;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  passwordRecoveryMode: boolean;
  clearPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PATIENT_KEY = 'telerrehab_patient_session';
const FISIO_PROFILE_QUERY = 'id, email, full_name, university';

async function fetchFisioProfile(userId: string, retries = 3): Promise<FisioUser | null> {
  for (let i = 0; i < retries; i++) {
    const { data, error } = await supabase
      .from('physiotherapists')
      .select(FISIO_PROFILE_QUERY)
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as FisioUser;
    await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    role: null,
    fisio: null,
    patient: null,
    loading: true,
  });
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(false);

  const navigationPausedRef = useRef(false);
  const pendingStateRef = useRef<AuthState | null>(null);

  const applyState = useCallback((newState: AuthState) => {
    if (navigationPausedRef.current) {
      pendingStateRef.current = newState;
    } else {
      setState(newState);
    }
  }, []);

  const pauseNavigation = useCallback(() => {
    navigationPausedRef.current = true;
  }, []);

  const resumeNavigation = useCallback(() => {
    navigationPausedRef.current = false;
    if (pendingStateRef.current) {
      setState(pendingStateRef.current);
      pendingStateRef.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const stored = localStorage.getItem(PATIENT_KEY);
      let patient: PatientUser | null = null;
      if (stored) {
        try {
          patient = JSON.parse(stored) as PatientUser;
        } catch {
          localStorage.removeItem(PATIENT_KEY);
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      let fisio: FisioUser | null = null;
      if (session?.user) {
        fisio = await fetchFisioProfile(session.user.id);
      }

      if (!mounted) return;

      if (fisio) {
        setState({ role: 'fisio', fisio, patient: null, loading: false });
      } else if (patient) {
        setState({ role: 'patient', fisio: null, patient, loading: false });
      } else {
        setState({ role: null, fisio: null, patient: null, loading: false });
      }
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (event === 'PASSWORD_RECOVERY') {
          if (mounted) setPasswordRecoveryMode(true);
          return;
        }
        if (!session?.user) {
          if (mounted) setState((s) => (s.role === 'fisio' ? { role: null, fisio: null, patient: null, loading: false } : s));
          return;
        }
        const profile = await fetchFisioProfile(session.user.id);
        if (!mounted) return;
        if (profile) {
          applyState({ role: 'fisio', fisio: profile, patient: null, loading: false });
        }
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [applyState]);

  const signInFisio = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(translateError(error.message));

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('No se pudo iniciar sesión. Intenta de nuevo.');

    const profile = await fetchFisioProfile(session.user.id);
    if (!profile) throw new Error('Tu perfil no está configurado. Contacta al administrador.');
    applyState({ role: 'fisio', fisio: profile, patient: null, loading: false });
  };

  const signUpFisio = async (full_name: string, email: string, password: string, university: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name, university } },
    });
    if (error) throw new Error(translateError(error.message));
    if (!data.user) throw new Error('No se pudo crear la cuenta.');
    // Email verification is required — the trigger creates the profile row,
    // but the user must verify their email before they can log in.
  };

  const signOutFisio = async () => {
    await supabase.auth.signOut();
    setState({ role: null, fisio: null, patient: null, loading: false });
  };

  const signInPatient = async (token: string) => {
    const clean = token.trim().toUpperCase();
    const { data, error } = await supabase
      .from('access_tokens')
      .select('id, token, patient_id, physio_id, is_active, used_at, patients!inner(full_name)')
      .eq('token', clean)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw new Error('Error de conexión.');
    if (!data) throw new Error('Token inválido o inactivo. Verifica el código con tu fisioterapeuta.');

    const patientUser: PatientUser = {
      patient_id: data.patient_id,
      token: data.token,
      full_name: (data.patients as unknown as { full_name: string }).full_name,
      physio_id: data.physio_id,
    };
    localStorage.setItem(PATIENT_KEY, JSON.stringify(patientUser));

    if (!data.used_at) {
      await supabase.from('access_tokens').update({ used_at: new Date().toISOString() }).eq('id', data.id);
    }

    applyState({ role: 'patient', fisio: null, patient: patientUser, loading: false });
    return patientUser;
  };

  const signOutPatient = () => {
    localStorage.removeItem(PATIENT_KEY);
    setState({ role: null, fisio: null, patient: null, loading: false });
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw new Error(translateError(error.message));
  };

  const resendVerification = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw new Error(translateError(error.message));
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(translateError(error.message));
    setPasswordRecoveryMode(false);
    await supabase.auth.signOut();
    setState({ role: null, fisio: null, patient: null, loading: false });
  };

  const clearPasswordRecovery = () => {
    setPasswordRecoveryMode(false);
  };

  return (
    <AuthContext.Provider value={{
      ...state,
      signInFisio,
      signUpFisio,
      signOutFisio,
      signInPatient,
      signOutPatient,
      pauseNavigation,
      resumeNavigation,
      resetPassword,
      resendVerification,
      updatePassword,
      passwordRecoveryMode,
      clearPasswordRecovery,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (m.includes('user already registered')) return 'Este correo ya está registrado.';
  if (m.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('unable to validate email')) return 'Correo electrónico inválido.';
  if (m.includes('email not confirmed')) return 'Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.';
  if (m.includes('rate limit')) return 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo.';
  return msg;
}
