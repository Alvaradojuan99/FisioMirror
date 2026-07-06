export type Role = 'fisio' | 'patient' | null;

export interface FisioUser {
  id: string;
  email: string;
  full_name: string;
  university: string;
}

export interface PatientUser {
  patient_id: string;
  token: string;
  full_name: string;
  physio_id: string;
}

export interface Exercise {
  id: string;
  name: string;
  description: string;
  reps: number;
  duration_sec: number;
}

export interface Routine {
  id: string;
  patient_id: string;
  physio_id: string;
  title: string;
  description: string | null;
  exercises: Exercise[];
  day_of_week: number;
  created_at: string;
}

export interface Patient {
  id: string;
  physio_id: string;
  full_name: string;
  age: number | null;
  condition: string | null;
  notes: string | null;
  created_at: string;
}

export interface AccessToken {
  id: string;
  token: string;
  patient_id: string;
  physio_id: string;
  is_active: boolean;
  used_at: string | null;
  created_at: string;
}

export interface SessionRecord {
  id: string;
  patient_id: string;
  routine_id: string | null;
  completed_exercises: number;
  total_exercises: number;
  duration_minutes: number;
  score: number;
  created_at: string;
}
