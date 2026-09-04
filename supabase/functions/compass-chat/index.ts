import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const allowedOrigin = Deno.env.get("APP_ORIGIN") || Deno.env.get("SITE_URL") || "https://captured-glance-craft.lovable.app";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
};

const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 4000;

const jsonResponse = (body: unknown, status: number, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido" }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    const token = authorization?.replace(/^Bearer\s+/i, "").trim();
    if (!token || token.length > 4096) return jsonResponse({ error: "Não autenticado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) throw new Error("Supabase auth is not configured");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return jsonResponse({ error: "Sessão inválida ou expirada" }, 401);

    const { data: allowed, error: rateLimitError } = await supabase.rpc("check_compass_chat_rate_limit", {
      p_window_seconds: 60,
      p_max_requests: 20,
    });
    if (rateLimitError) {
      console.error("rate limit check failed:", rateLimitError);
      return jsonResponse({ error: "Não foi possível validar o limite de uso." }, 503);
    }
    if (!allowed) return jsonResponse(
      { error: "Limite de mensagens atingido. Aguarde um minuto e tente novamente." },
      429,
      { "Retry-After": "60" },
    );

    const body = await req.json();
    const conversationId = body?.conversation_id;
    if (typeof conversationId !== "string" || conversationId.length > 100) {
      return jsonResponse({ error: "Conversa inválida." }, 400);
    }

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (conversationError) {
      console.error("conversation lookup failed:", conversationError);
      return jsonResponse({ error: "Não foi possível validar a conversa." }, 503);
    }
    if (!conversation) return jsonResponse({ error: "Conversa não encontrada." }, 404);

    const { data: persistedMessages, error: messagesError } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(MAX_MESSAGES);
    if (messagesError) {
      console.error("message history lookup failed:", messagesError);
      return jsonResponse({ error: "Não foi possível carregar o contexto da conversa." }, 503);
    }

    const messages = (persistedMessages ?? []).reverse();
    if (messages.length === 0) return jsonResponse({ error: "Conversa sem mensagens." }, 400);

    const validMessages = messages.every((message) =>
      (message.role === "user" || message.role === "assistant") &&
      typeof message.content === "string" &&
      message.content.trim().length > 0 &&
      message.content.length <= MAX_MESSAGE_LENGTH
    );
    if (!validMessages) return jsonResponse({ error: "Histórico de conversa inválido." }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é o Compass, um coach de propósito de vida com abordagem zen e empática. Seu objetivo é ajudar o usuário a descobrir seus valores, interesses e propósito através de conversas reflexivas.

Diretrizes:
- Faça perguntas profundas mas acessíveis, uma por vez
- Identifique padrões nos interesses e valores do usuário
- Sugira conexões entre temas mencionados pelo usuário
- Ofereça insights sobre o que emerge das conversas
- Proponha ações práticas e pequenas (micro-ações diárias)
- Mantenha tom acolhedor, nunca julgador
- Responda sempre em português brasileiro
- Mantenha respostas concisas (2-4 parágrafos)
- Use emojis com moderação`,
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return jsonResponse({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }, 429);
      if (response.status === 402) return jsonResponse({ error: "Créditos de IA insuficientes." }, 402);
      console.error("AI gateway error:", response.status, await response.text());
      return jsonResponse({ error: "Erro no serviço de IA" }, 502);
    }
    if (!response.body) return jsonResponse({ error: "Serviço de IA sem resposta." }, 502);

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return jsonResponse({ error: "Erro interno ao processar a mensagem." }, 500);
  }
});
