import { useState, useEffect, useRef } from "react";
import { Flame, Compass, User, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

const MAX_MESSAGE_LENGTH = 4000;
const MAX_CONTEXT_MESSAGES = 40;

const GREETING =
  "Olá! 👋 Vamos conversar sobre algo importante hoje: quando você se sente mais vivo e presente? Conte-me sobre um momento recente em que você se sentiu verdadeiramente engajado.";

const ChatScreen = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streak, setStreak] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const loadChat = async () => {
      const [profileResult, conversationResult] = await Promise.all([
        supabase.from("profiles").select("streak_days").eq("user_id", user.id).single(),
        supabase
          .from("conversations")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (cancelled) return;
      if (profileResult.data) setStreak(profileResult.data.streak_days ?? 0);

      const existingConversation = conversationResult.data;
      if (!existingConversation) {
        setMessages([{ role: "assistant", content: GREETING }]);
        return;
      }

      setConversationId(existingConversation.id);
      const { data: storedMessages, error } = await supabase
        .from("messages")
        .select("id, role, content")
        .eq("conversation_id", existingConversation.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(MAX_CONTEXT_MESSAGES);

      if (cancelled) return;
      if (error) {
        toast({
          title: "Não foi possível carregar sua conversa",
          description: "Tente novamente em alguns instantes.",
          variant: "destructive",
        });
        setMessages([{ role: "assistant", content: GREETING }]);
        return;
      }

      setMessages(
        storedMessages?.map((message) => ({
          id: message.id,
          role: message.role === "assistant" ? "assistant" : "user",
          content: message.content,
        })) ?? []
      );
    };

    void loadChat();
    return () => {
      cancelled = true;
    };
  }, [user, toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading || !user) return;

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      toast({
        title: "Mensagem muito longa",
        description: `Use no máximo ${MAX_MESSAGE_LENGTH} caracteres.`,
        variant: "destructive",
      });
      return;
    }

    setInput("");
    setIsLoading(true);

    try {
      let activeConversationId = conversationId;

      if (!activeConversationId) {
        const { data: conversation, error } = await supabase
          .from("conversations")
          .insert({ user_id: user.id })
          .select("id")
          .single();
        if (error || !conversation) throw new Error("Não foi possível iniciar sua conversa.");
        activeConversationId = conversation.id;
        setConversationId(activeConversationId);
      }

      const { data: savedUserMessage, error: userMessageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: activeConversationId,
          user_id: user.id,
          role: "user",
          content: trimmed,
        })
        .select("id, role, content")
        .single();

      if (userMessageError || !savedUserMessage) {
        throw new Error("Não foi possível salvar sua mensagem.");
      }

      const currentMessages: Message[] = [
        ...messages.filter((message) => message.id),
        {
          id: savedUserMessage.id,
          role: "user",
          content: savedUserMessage.content,
        },
      ].slice(-MAX_CONTEXT_MESSAGES);

      setMessages(currentMessages);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Sua sessão expirou. Entre novamente.");

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/compass-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            conversation_id: activeConversationId,
            messages: currentMessages.map(({ role, content }) => ({ role, content })),
          }),
        }
      );

      if (!resp.ok) {
        let errorMessage = "Erro na resposta";
        try {
          const err = await resp.json();
          errorMessage = err.error || errorMessage;
        } catch {
          // Keep the generic message when the server response is not JSON.
        }
        throw new Error(errorMessage);
      }

      if (!resp.body) throw new Error("Resposta do Compass indisponível.");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";
      let streamDone = false;

      while (!streamDone) {
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
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((message, index) =>
                    index === prev.length - 1 ? { ...message, content: assistantContent } : message
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

      if (!assistantContent) throw new Error("O Compass não retornou uma resposta.");

      const { error: assistantMessageError } = await supabase.from("messages").insert({
        conversation_id: activeConversationId,
        user_id: user.id,
        role: "assistant",
        content: assistantContent,
      });

      if (assistantMessageError) {
        throw new Error("A resposta chegou, mas não foi possível salvar seu histórico.");
      }

      const { data: newStreak } = await supabase.rpc("record_compass_activity");
      if (typeof newStreak === "number") setStreak(newStreak);
    } catch (e: unknown) {
      toast({
        title: "Erro",
        description: e instanceof Error ? e.message : "Não foi possível falar com o Compass.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in pb-[180px]">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 max-w-[430px] sm:max-w-[480px] lg:max-w-[520px] w-full bg-card px-4 sm:px-5 pb-3 pt-5 sm:pt-6 border-b border-border z-40">
        <div className="flex items-center gap-3 p-3 bg-tertiary rounded-xl">
          <Flame size={28} className="text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-lg sm:text-xl font-semibold text-primary">{streak} dias</div>
            <div className="text-xs text-muted-foreground truncate">Sua sequência atual</div>
          </div>
        </div>
      </div>

      <div className="pt-[114px] sm:pt-[132px] px-4 sm:px-6 lg:px-[30px] flex flex-col gap-4 sm:gap-5 mb-[120px]">
        {messages.map((msg, i) => (
          <div key={msg.id ?? `${msg.role}-${i}`} className={`flex gap-2 sm:gap-3 animate-message-slide ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
              {msg.role === "user" ? <User size={18} className="sm:hidden" /> : <Compass size={18} className="sm:hidden" />}
              {msg.role === "user" ? <User size={20} className="hidden sm:block" /> : <Compass size={20} className="hidden sm:block" />}
            </div>
            <div className="max-w-[85%] sm:max-w-[75%] min-w-0">
              <div className={`px-4 sm:px-5 py-3 sm:py-4 rounded-[20px] text-[14px] sm:text-[15px] leading-relaxed whitespace-pre-wrap break-words hyphens-auto ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-tertiary text-foreground"}`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center shrink-0"><Compass size={20} /></div>
            <div className="px-5 py-4 rounded-[20px] bg-tertiary"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="fixed bottom-[92px] left-1/2 -translate-x-1/2 max-w-[430px] sm:max-w-[480px] lg:max-w-[520px] w-full px-4 sm:px-6 lg:px-[30px] py-3 sm:py-4 bg-card border-t border-border">
        <div className="flex gap-2 sm:gap-3 items-center">
          <input
            type="text"
            value={input}
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Digite sua mensagem..."
            disabled={isLoading}
            className="flex-1 py-3.5 px-5 border border-border rounded-[25px] bg-tertiary text-foreground text-[15px] font-sans transition-all duration-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50"
          />
          <button onClick={() => sendMessage(input)} disabled={isLoading || !input.trim()} aria-label="Enviar mensagem" className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-all duration-300 hover:bg-accent-hover hover:scale-105 disabled:opacity-50">
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;
