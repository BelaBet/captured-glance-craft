import { useState, useEffect, useRef } from "react";
import { Flame, Compass, User, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const GREETING =
  "Olá! 👋 Vamos conversar sobre algo importante hoje: quando você se sente mais vivo e presente? Conte-me sobre um momento recente em que você se sentiu verdadeiramente engajado.";

const ChatScreen = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [streak, setStreak] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      setLoadingHistory(true);

      const [{ data: profile }, { data: conversation }] = await Promise.all([
        supabase.from("profiles").select("streak_days").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("conversations")
          .select("id")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (cancelled) return;
      if (profile) setStreak(profile.streak_days ?? 0);

      if (conversation) {
        conversationIdRef.current = conversation.id;
        const { data: history } = await supabase
          .from("messages")
          .select("role, content")
          .eq("conversation_id", conversation.id)
          .order("created_at");
        if (cancelled) return;
        if (history && history.length > 0) {
          setMessages(history.map((m) => ({ role: m.role as Message["role"], content: m.content })));
          setLoadingHistory(false);
          return;
        }
      }

      setMessages([{ role: "assistant", content: GREETING }]);
      setLoadingHistory(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ensureConversation = async () => {
    if (conversationIdRef.current) return conversationIdRef.current;
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user!.id })
      .select("id")
      .single();
    if (error) throw error;
    conversationIdRef.current = data.id;
    // Persist the greeting so the thread reads naturally on reload.
    await supabase.from("messages").insert({
      conversation_id: data.id,
      user_id: user!.id,
      role: "assistant",
      content: GREETING,
    });
    return data.id;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading || !user) return;
    setInput("");
    const userMsg: Message = { role: "user", content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setIsLoading(true);

    let assistantContent = "";

    try {
      const conversationId = await ensureConversation();

      const { error: userMsgError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: "user",
        content: text,
      });
      if (userMsgError) throw userMsgError;

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Sessão expirada. Entre novamente.");

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/compass-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ messages: allMessages }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Erro na resposta");
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      if (assistantContent.trim()) {
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: "assistant",
          content: assistantContent,
        });
      }

      const { data: newStreak } = await supabase.rpc("touch_streak");
      if (typeof newStreak === "number") setStreak(newStreak);
      queryClient.invalidateQueries({ queryKey: ["stats", user.id] });
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
      // Give the message back to the user instead of losing it.
      setMessages((prev) => {
        const idx = prev.map((m) => m.content).lastIndexOf(text);
        return idx === -1 ? prev : prev.slice(0, idx);
      });
      setInput((current) => current || text);
    }

    setIsLoading(false);
  };

  return (
    <div className="animate-fade-in pb-[180px]">
      {/* Header */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 max-w-[430px] sm:max-w-[480px] lg:max-w-[520px] w-full bg-card px-4 sm:px-5 pb-3 pt-5 sm:pt-6 border-b border-border z-40">
        <div className="flex items-center gap-3 p-3 bg-tertiary rounded-xl">
          <Flame size={28} className="text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-lg sm:text-xl font-semibold text-primary">{streak} dias</div>
            <div className="text-xs text-muted-foreground truncate">Sua sequência atual</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="pt-[114px] sm:pt-[132px] px-4 sm:px-6 lg:px-[30px] flex flex-col gap-4 sm:gap-5 mb-[120px]">
        {loadingHistory && (
          <div className="flex justify-center py-8">
            <Loader2 size={22} className="animate-spin text-muted-foreground" />
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 sm:gap-3 animate-message-slide ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
              }`}
            >
              {msg.role === "user" ? <User size={18} className="sm:hidden" /> : <Compass size={18} className="sm:hidden" />}
              {msg.role === "user" ? <User size={20} className="hidden sm:block" /> : <Compass size={20} className="hidden sm:block" />}
            </div>
            <div className="max-w-[85%] sm:max-w-[75%] min-w-0">
              <div
                className={`px-4 sm:px-5 py-3 sm:py-4 rounded-[20px] text-[14px] sm:text-[15px] leading-relaxed whitespace-pre-wrap break-words hyphens-auto ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-tertiary text-foreground"
                }`}
              >
                {msg.content}
              </div>

            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center shrink-0">
              <Compass size={20} />
            </div>
            <div className="px-5 py-4 rounded-[20px] bg-tertiary">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="fixed bottom-[92px] left-1/2 -translate-x-1/2 max-w-[430px] sm:max-w-[480px] lg:max-w-[520px] w-full px-4 sm:px-6 lg:px-[30px] py-3 sm:py-4 bg-card border-t border-border">
        <div className="flex gap-2 sm:gap-3 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Digite sua mensagem..."
            disabled={isLoading}
            className="flex-1 py-3.5 px-5 border border-border rounded-[25px] bg-tertiary text-foreground text-[15px] font-sans transition-all duration-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-all duration-300 hover:bg-accent-hover hover:scale-105 disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;
