import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return jsonResponse({ error: "Authentication required" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const groqKey = Deno.env.get("GROQ_API_KEY");
  const groqModel = Deno.env.get("GROQ_MODEL");
  if (!supabaseUrl || !anonKey || !groqKey || !groqModel) {
    return jsonResponse({ error: "Function secrets are not configured" }, 500);
  }

  try {
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data: userData, error: authError } = await client.auth.getUser(token);
    if (authError || !userData.user) return jsonResponse({ error: "Invalid or expired JWT" }, 401);

    const body = await request.json().catch(() => ({}));
    const questionId = body?.question_id;
    if (typeof questionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(questionId)) {
      return jsonResponse({ error: "A valid question_id is required" }, 400);
    }

    const { data: question, error: queryError } = await client
      .from("questions")
      .select("id, year, paper_set, section, topic, subtopic, qtype, marks, question_text, options, answer, nat_min, nat_max, explanation")
      .eq("id", questionId)
      .maybeSingle();
    if (queryError) throw queryError;
    if (!question) return jsonResponse({ error: "Question not found or unavailable" }, 404);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: groqModel,
        temperature: 0,
        messages: [
          { role: "system", content: "Explain the solution to this GATE CS question step by step. Be concise, show relevant reasoning and calculations, explain why alternatives are wrong where useful, and do not claim certainty if the supplied key is marked uncertain." },
          { role: "user", content: JSON.stringify({ question_text: question.question_text, qtype: question.qtype, marks: question.marks, options: question.options, answer: question.answer, nat_min: question.nat_min, nat_max: question.nat_max, existing_explanation: question.explanation }) },
        ],
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("Groq request failed", response.status, detail);
      return jsonResponse({ error: "Explanation service is temporarily unavailable" }, 502);
    }
    const completion = await response.json();
    const explanation = completion.choices?.[0]?.message?.content?.trim();
    if (!explanation) return jsonResponse({ error: "Explanation service returned an empty response" }, 502);
    return jsonResponse({ question_id: questionId, explanation });
  } catch (error) {
    console.error("explain-question error", error);
    return jsonResponse({ error: "Could not explain this question" }, 500);
  }
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
