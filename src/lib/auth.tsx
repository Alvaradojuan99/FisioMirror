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
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PATIENT_KEY = 'telerrehab_patient_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    role: null,
    fisio: null,
    patient: null,
    loading: true,
  });

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
        const { data } = await supabase
          .from('physiotherapists')
          .select('id, email, full_name, university')
          .eq('id', session.user.id)
          .maybeSingle();
        fisio = data as FisioUser | null;
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

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (!session?.user) {
          if (mounted) setState((s) => (s.role === 'fisio' ? { role: null, fisio: null, patient: null, loading: false } : s));
          return;
        }
        const { data } = await supabase
          .from('physiotherapists')
          .select('id, email, full_name, university')
          .eq('id', session.user.id)
          .maybeSingle();
        if (!mounted) return;
        if (data) {
          applyState({ role: 'fisio', fisio: data as FisioUser, patient: null, loading: false });
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
    if (session?.user) {
      const { data } = await supabase
        .from('physiotherapists')
        .select('id, email, full_name, university')
        .eq('id', session.user.id)
        .maybeSingle();
      if (data) applyState({ role: 'fisio', fisio: data as FisioUser, patient: null, loading: false });
    }
  };

  const signUpFisio = async (full_name: string, email: string, password: string, university: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(translateError(error.message));
    if (!data.user) throw new Error('No se pudo crear la cuenta.');
    const { error: profileError } = await supabase
      .from('physiotherapists')
      .insert({ id: data.user.id, full_name, email, university });
    if (profileError) throw new Error('Error al crear el perfil: ' + profileError.message);
    const { data: profile } = await supabase
      .from('physiotherapists')
      .select('id, email, full_name, university')
      .eq('id', data.user.id)
      .maybeSingle();
    if (profile) applyState({ role: 'fisio', fisio: profile as FisioUser, patient: null, loading: false });
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
  return msg;
}
