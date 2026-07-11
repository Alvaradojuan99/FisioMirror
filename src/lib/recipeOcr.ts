import Tesseract from 'tesseract.js';
import type { Exercise } from './types';

export interface ExtractedRecipeData {
  full_name: string;
  age: string;
  condition: string;
  notes: string;
  exercises: Exercise[];
}

const COMMON_CONDITIONS = [
  'lumbalgia', 'cervicalgia', 'tendinitis', 'artrosis', 'artritis',
  'esguince', 'fractura', 'luxacion', 'hernia', 'ciatica', 'ciatalgia',
  'bursitis', 'fascitis', 'epicondilitis', 'rotura', 'desgarro',
  'contractura', 'esguince', 'gonartrosis', 'coxartrosis', 'meniscopatia',
  'capsulitis', 'congelado', 'sindrome del tunel', 'tunel carpiano',
  'tendinopatia', 'tendinosis', 'radiculopatia', 'neuropatia', 'mialgia',
  'dolor lumbar', 'dolor cervical', 'dolor de hombro', 'dolor de rodilla',
  'lesion', 'postoperatorio', 'post-quirurgico', 'rehabilitacion',
];

const EXERCISE_KEYWORDS = [
  'ejercicio', 'ejercicios', 'realizar', 'realice', 'repetir', 'repeticiones',
  'series', 'serie', 'veces', 'dia', 'semana', 'frecuencia',
  'flexion', 'extension', 'abduccion', 'aduccion', 'rotacion',
  'estiramiento', 'estirar', 'fortalecimiento', 'fortalecer',
  'movilizacion', 'mover', 'elevar', 'bajar', 'presionar',
  'isometrico', 'isometrica', 'resistencia', 'elasticos', 'gomas',
  'pesas', 'mancuerna', 'bicicleta', 'caminar', 'natacion',
  'balance', 'propiocepcion', 'estabilidad', 'core',
  'kinesiologia', 'kinesiterapia', 'fisioterapia', 'terapia fisica',
];

function normalizeText(text: string): string {
  return text
    .replace(/[|·•*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractName(lines: string[]): string {
  for (let i = 0; i < lines.length; i++) {
    const line = normalizeText(lines[i]);

    // Skip lines that are clearly headers or institution names
    if (line.length < 5 || line.length > 60) continue;
    if (/^(dr|doctor|dra|clinica|hospital|centro|consultorio|c\.i|c\.c|ruc|nit|direccion|telefono|fecha|hora)/i.test(line)) continue;
    if (/^\d+$/.test(line)) continue;

    // Look for "Paciente:" or "Nombre:" prefix
    const nameMatch = line.match(/(?:paciente|nombre|nombres|apellidos|paciente\s*nombre)\s*[:\-]?\s*(.+)/i);
    if (nameMatch) {
      const name = nameMatch[1].trim();
      if (name.length >= 5 && /^[A-Za-zÀ-ÿ\s]+$/.test(name)) return capitalizeName(name);
    }
  }

  // Fallback: look for a line that looks like a full name (2+ capitalized words)
  for (let i = 0; i < lines.length; i++) {
    const line = normalizeText(lines[i]);
    if (line.length < 5 || line.length > 50) continue;
    if (/^(dr|doctor|dra|clinica|hospital|centro|consultorio|c\.i|c\.c|ruc|nit|direccion|telefono|fecha|hora|edad|sexo|diagnostico|dx|tratamiento|indicacion|ejercicio|reposo)/i.test(line)) continue;
    if (/^\d+$/.test(line)) continue;

    const words = line.split(/\s+/);
    if (words.length >= 2 && words.length <= 4) {
      const allLetters = words.every((w) => /^[A-Za-zÀ-ÿ]+$/.test(w));
      if (allLetters) return capitalizeName(line);
    }
  }

  return '';
}

function capitalizeName(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function extractAge(lines: string[]): string {
  for (const line of lines) {
    const normalized = normalizeText(line);
    const ageMatch = normalized.match(/(?:edad|edad\s*[:\-]?)\s*(\d{1,3})\s*(?:años?|anos?)?/i);
    if (ageMatch) {
      const age = parseInt(ageMatch[1]);
      if (age >= 0 && age <= 120) return String(age);
    }
  }

  // Fallback: look for "XX años" pattern
  for (const line of lines) {
    const normalized = normalizeText(line);
    const ageMatch = normalized.match(/\b(\d{1,3})\s*años?\b/i);
    if (ageMatch) {
      const age = parseInt(ageMatch[1]);
      if (age >= 1 && age <= 120) return String(age);
    }
  }

  return '';
}

function extractCondition(text: string): string {
  const normalized = text.toLowerCase();

  // Look for "Diagnóstico:" or "DX:" prefix
  const dxMatch = text.match(/(?:diagnostico|dx|diagnosticado|presuntivo|cie|enfermedad|patologia|condicion|motivo\s*de\s*consulta|motivo)\s*[:\-]?\s*([^\n]{3,80})/i);
  if (dxMatch) {
    const cond = normalizeText(dxMatch[1]);
    if (cond.length >= 3) return cond;
  }

  // Search for known conditions in the text
  for (const condition of COMMON_CONDITIONS) {
    if (normalized.includes(condition)) {
      return capitalizeFirst(condition);
    }
  }

  return '';
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function extractNotes(text: string): string {
  const notes: string[] = [];

  // Look for "Indicaciones:" or "Observaciones:" or "Recomendaciones:"
  const notesMatch = text.match(/(?:indicaciones?|observaciones?|recomendaciones?|notas?|reposo|precauciones?)\s*[:\-]?\s*([^\n]{5,200})/i);
  if (notesMatch) {
    notes.push(normalizeText(notesMatch[1]));
  }

  // Look for "Reposo" indication
  const reposoMatch = text.match(/(reposo\s+(?:absoluto|relativo|parcial)?\s*(?:\d+\s*(?:dias?|semanas?))?)/i);
  if (reposoMatch) {
    notes.push(normalizeText(reposoMatch[1]));
  }

  return notes.join('. ') || '';
}

function extractExercises(text: string): Exercise[] {
  const exercises: Exercise[] = [];
  const normalized = normalizeText(text);
  const lines = normalized.split(/[.\n;]+/).map((l) => l.trim()).filter((l) => l.length > 3);

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Check if line contains exercise-related keywords
    const hasExerciseKeyword = EXERCISE_KEYWORDS.some((kw) => lower.includes(kw));
    const hasRepsPattern = /(\d+)\s*(?:repeticiones|reps|veces|series|segundos|minutos)/i.test(line);

    if (!hasExerciseKeyword && !hasRepsPattern) continue;

    // Skip lines that are just instructions like "Realizar 3 veces al dia"
    if (/^(realizar|realice|hacer|repetir)\s+\d+\s+veces\s*(al\s*dia|por\s*dia)?$/i.test(line)) continue;

    // Try to extract exercise name
    let name = '';
    let reps = 10;
    let duration = 30;

    // Extract reps
    const repsMatch = line.match(/(\d+)\s*(?:repeticiones|reps|veces)/i);
    if (repsMatch) reps = parseInt(repsMatch[1]);

    // Extract series
    const seriesMatch = line.match(/(\d+)\s*series/i);
    if (seriesMatch) reps = parseInt(seriesMatch[1]) * (reps || 10);

    // Extract duration in seconds
    const secMatch = line.match(/(\d+)\s*segundos/i);
    if (secMatch) duration = parseInt(secMatch[1]);

    // Extract duration in minutes (convert to seconds)
    const minMatch = line.match(/(\d+)\s*minutos/i);
    if (minMatch) duration = parseInt(minMatch[1]) * 60;

    // Try to extract exercise name — remove numbers and instruction words
    const cleaned = line
      .replace(/\d+\s*(?:repeticiones|reps|veces|series|segundos|minutos|dias?|semanas?)/gi, '')
      .replace(/^(?:realizar|realice|hacer|repetir|ejercicio|ejercicios)\s*[:\-]?\s*/i, '')
      .replace(/\b(?:con|sin|durante|por|cada|veces|al|dia|semana|frecuencia|durante)\b/gi, '')
      .replace(/\d+/g, '')
      .replace(/[().,;:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned.length >= 3) {
      name = capitalizeFirst(cleaned);
    } else if (hasExerciseKeyword) {
      // Use the keyword itself as the exercise name
      const keyword = EXERCISE_KEYWORDS.find((kw) => lower.includes(kw));
      if (keyword) name = capitalizeFirst(keyword);
    }

    if (name && name.length >= 3) {
      // Avoid duplicates
      if (!exercises.some((e) => e.name.toLowerCase() === name.toLowerCase())) {
        exercises.push({
          id: crypto.randomUUID(),
          name,
          description: '',
          reps: Math.max(1, reps),
          duration_sec: Math.max(5, duration),
        });
      }
    }
  }

  return exercises;
}

export async function extractRecipeData(file: File): Promise<ExtractedRecipeData> {
  let imageData: string;

  if (file.type === 'application/pdf') {
    // For PDFs, we need to convert to image first
    // Since we can't easily do PDF-to-image in the browser without heavy deps,
    // we'll use a canvas-based approach with pdf.js if available,
    // or fall back to returning empty data with a note
    throw new Error('Formato PDF no soportado para extracción con IA. Por favor, sube una imagen (PNG o JPG).');
  } else {
    // Read image as data URL
    imageData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Run OCR with Tesseract.js (Spanish + English for medical terms)
  const { data: { text } } = await Tesseract.recognize(
    imageData,
    'spa+eng',
    {
      logger: () => {},
    }
  );

  if (!text || text.trim().length < 5) {
    return {
      full_name: '',
      age: '',
      condition: '',
      notes: 'No se pudo extraer texto del documento. Por favor, completa los datos manualmente.',
      exercises: [],
    };
  }

  const lines = text.split('\n').filter((l) => l.trim().length > 0);

  const full_name = extractName(lines);
  const age = extractAge(lines);
  const condition = extractCondition(text);
  const notes = extractNotes(text);
  const exercises = extractExercises(text);

  return {
    full_name,
    age,
    condition,
    notes: notes || (exercises.length > 0
      ? `Se extrajeron ${exercises.length} ejercicio(s) del documento.`
      : 'Documento procesado. Revisa y completa los datos del paciente.'),
    exercises,
  };
}
