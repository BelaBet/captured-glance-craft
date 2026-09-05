import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Não autenticado" }, 401);

    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select("role, content")
      .order("created_at", { ascending: false })
      .limit(40);
    if (msgError) return json({ error: msgError.message }, 400);

    if (!messages || messages.length < 4) {
      return json({ error: "Converse um pouco mais para gerar um insight." }, 400);
    }

    const transcript = [...messages]
      .reverse()
      .map((m) => `${m.role === "user" ? "Usuário" : "Compass"}: ${m.content}`)
      .join("\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "IA não configurada" }, 500);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        stream: true,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `A partir da conversa abaixo, gere UM insight sobre o propósito, valores ou padrões desta pessoa. Responda em português brasileiro no formato json com as chaves "title" (frase curta, até 6 palavras) e "content" (2 a 3 frases). Responda apenas o json.\n\n${transcript}`,
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "insight",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: { type: "string" },
                content: { type: "string" },
              },
              required: ["title", "content"],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return json({ error: "Muitas requisições. Tente novamente em instantes." }, 429);
      if (response.status === 402) return json({ error: "Créditos de IA insuficientes." }, 402);
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return json({ error: "Erro no serviço de IA" }, 500);
    }

    // Accumulate the SSE stream into the final text.
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx).replace(/\r$/, "");
        buffer = buffer.slice(idx + 1);
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
            text += evt.delta;
          } else if (evt.type === "response.completed" && evt.response?.output_text) {
            text = Array.isArray(evt.response.output_text)
              ? evt.response.output_text.join("")
              : evt.response.output_text;
          }
        } catch {
          // partial event, ignore
        }
      }
    }

    let parsed: { title?: string; content?: string } = {};
    try {
      parsed = JSON.parse(text.trim());
    } catch {
      return json({ error: "Não consegui gerar um insight agora." }, 500);
    }
    if (!parsed.title || !parsed.content) {
      return json({ error: "Não consegui gerar um insight agora." }, 500);
    }

    const { data: inserted, error: insertError } = await supabase
      .from("insights")
      .insert({ user_id: user.id, title: parsed.title, content: parsed.content })
      .select("id, title, content, created_at")
      .single();
    if (insertError) return json({ error: insertError.message }, 400);

    return json({ insight: inserted });
  } catch (e) {
    console.error("insight error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
