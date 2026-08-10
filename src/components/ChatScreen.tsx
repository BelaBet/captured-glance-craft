import { useState, useEffect, useRef } from "react";
import { Flame, Compass, User, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const ChatScreen = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streak, setStreak] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadProfile();
      // Send initial greeting if no messages
      if (messages.length === 0) {
        setMessages([
          {
            role: "assistant",
            content: "Olá! 👋 Vamos conversar sobre algo importante hoje: quando você se sente mais vivo e presente? Conte-me sobre um momento recente em que você se sentiu verdadeiramente engajado.",
          },
        ]);
      }
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("streak_days")
      .eq("user_id", user!.id)
      .single();
    if (data) setStreak(data.streak_days);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setInput("");
    const userMsg: Message = { role: "user", content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setIsLoading(true);

    let assistantContent = "";

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/compass-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }

    setIsLoading(false);
  };

  return (
    <div className="animate-fade-in pb-[100px]">
      {/* Header */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 max-w-[430px] sm:max-w-[480px] lg:max-w-[520px] w-full bg-card px-4 sm:px-5 pb-3 pt-[56px] sm:pt-[64px] border-b border-border z-40">
        <div className="flex items-center gap-3 p-3 bg-tertiary rounded-xl">
          <Flame size={28} className="text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-lg sm:text-xl font-semibold text-primary">{streak} dias</div>
            <div className="text-xs text-muted-foreground truncate">Sua sequência atual</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="pt-[150px] sm:pt-[168px] px-4 sm:px-6 lg:px-[30px] flex flex-col gap-4 sm:gap-5 mb-[120px]">

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
            <div className="max-w-[85%] sm:max-w-[75%]">
              <div
                className={`px-4 sm:px-5 py-3 sm:py-4 rounded-[20px] text-[14px] sm:text-[15px] leading-relaxed whitespace-pre-wrap ${
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
      <div className="fixed bottom-[80px] left-1/2 -translate-x-1/2 max-w-[430px] sm:max-w-[480px] lg:max-w-[520px] w-full px-4 sm:px-6 lg:px-[30px] py-3 sm:py-4 bg-card border-t border-border">
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
