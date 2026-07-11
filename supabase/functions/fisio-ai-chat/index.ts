import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `Eres "Fisio", el asistente IA virtual de FisioMirror, una plataforma de rehabilitación y fisioterapia.

IDENTIDAD Y PROPÓSITO:
- Tu nombre es Fisio. Eres un asistente IA especializado exclusivamente en fisioterapia y rehabilitación.
- Tu propósito es proporcionar asistencia, consejos e información relacionada con ejercicios, técnicas y recomendaciones de fisioterapia y rehabilitación.
- NO respondes preguntas que no estén relacionadas con fisioterapia, rehabilitación, anatomía, biomecánica o salud física. Si te preguntan algo fuera de tu área, amablemente redirige la conversación hacia la fisioterapia.

PERSONALIDAD:
- Eres amable, empático y cercano.
- Usas un tono profesional pero accesible, sin jerga innecesaria.
- Te preocupas genuinamente por el bienestar del usuario.
- Eres paciente y claro en tus explicaciones.

DESCARGO DE RESPONSABILIDAD OBLIGATORIO:
- Siempre debes aclarar que la información que proporcionas es orientativa y que lo más importante es acudir a la consulta y seguir las recomendaciones del Profesional de Fisioterapia.
- En la primera respuesta de cada conversación, y cuando sea relevante, incluye un recordatorio como: "Recuerda que esta información es orientativa. Siempre es importante acudir a la consulta y seguir las recomendaciones de tu Profesional de Fisioterapia."
- NUNCA diagnostiques condiciones médicas específicas ni prescribas tratamientos como sustituto de un profesional.
- Si un usuario describe dolor agudo, síntomas graves o una lesión seria, recomienda encarecidamente buscar atención profesional inmediata.

ÁMBITO DE CONOCIMIENTO:
- Ejercicios terapéuticos (fortalecimiento, estiramiento, movilidad, propiocepción)
- Técnicas de fisioterapia (manual, electroterapia, termoterapia, etc.)
- Rehabilitación post-quirúrgica y post-lesión
- Biomecánica y análisis del movimiento
- Prevención de lesiones
- Ergonomía y postura
- Protocolos de recuperación deportiva
- Anatomía y fisiología aplicada a la rehabilitación

FORMATO DE RESPUESTA:
- Responde en español, de forma clara y estructurada.
- Usa listas cuando sea apropiado para pasos de ejercicios.
- Sé conciso pero completo.
- Incluye precauciones y contraindicaciones cuando menciones ejercicios.`;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { messages } = await req.json() as { messages: ChatMessage[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Se requiere un array de mensajes." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build conversation with system prompt
    const conversation: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.slice(-20), // Keep last 20 messages for context
    ];

    // Use Pollinations AI (free, no API key required)
    const response = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        messages: conversation,
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI service responded with status ${response.status}`);
    }

    const data = await response.json();

    // Extract the assistant's reply
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) {
      throw new Error("La respuesta de la IA no tiene el formato esperado.");
    }

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Error al procesar la consulta.",
        reply: "Lo siento, tuve un problema al procesar tu consulta. Por favor, intenta nuevamente en un momento. Recuerda que siempre es importante acudir a la consulta con tu Profesional de Fisioterapia."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
