import { useState } from "react";
import { Flame, Compass, User, Send } from "lucide-react";

const initialMessages = [
  {
    isUser: false,
    text: "Olá! Vamos conversar sobre algo importante hoje: quando você se sente mais vivo e presente?",
    time: "Hoje, 09:15",
    suggestions: ["Quando estou criando algo", "Com pessoas que amo", "Na natureza"],
  },
  {
    isUser: true,
    text: "Quando estou aprendendo coisas novas e compartilhando com outras pessoas",
    time: "Hoje, 09:17",
  },
  {
    isUser: false,
    text: "Interessante! Há um padrão emergindo aqui. Nos últimos dias, você mencionou criatividade, conexão e crescimento. O que aconteceria se você combinasse essas três coisas em uma única atividade?",
    time: "Hoje, 09:18",
  },
];

const ChatScreen = () => {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    setMessages((prev) => [
      ...prev,
      { isUser: true, text, time: "Agora" },
    ]);
    setInput("");
  };

  return (
    <div className="animate-fade-in pb-[100px]">
      {/* Header */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 max-w-[430px] w-full bg-card p-5 border-b border-border z-50">
        <div className="flex items-center gap-3 p-3 bg-tertiary rounded-xl">
          <Flame size={28} className="text-primary" />
          <div className="flex-1">
            <div className="text-xl font-semibold text-primary">7 dias</div>
            <div className="text-xs text-muted-foreground">Sua sequência atual</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="pt-[100px] px-6 flex flex-col gap-5 mb-[120px]">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 animate-message-slide ${msg.isUser ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                msg.isUser ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
              }`}
            >
              {msg.isUser ? <User size={20} /> : <Compass size={20} />}
            </div>
            <div>
              <div
                className={`max-w-[75%] px-5 py-4 rounded-[20px] text-[15px] leading-relaxed ${
                  msg.isUser
                    ? "bg-primary text-primary-foreground"
                    : "bg-tertiary text-foreground"
                }`}
              >
                {msg.text}
              </div>
              <div className="text-[11px] text-text-tertiary mt-1">{msg.time}</div>
              {msg.suggestions && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {msg.suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="px-4 py-2 bg-card border border-border rounded-[20px] text-[13px] cursor-pointer transition-all duration-300 hover:bg-accent hover:border-primary hover:text-accent-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="fixed bottom-[80px] left-1/2 -translate-x-1/2 max-w-[430px] w-full px-6 py-4 bg-card border-t border-border">
        <div className="flex gap-3 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Digite sua mensagem..."
            className="flex-1 py-3.5 px-5 border border-border rounded-[25px] bg-tertiary text-foreground text-[15px] font-sans transition-all duration-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
          <button
            onClick={() => sendMessage(input)}
            className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-all duration-300 hover:bg-accent-hover hover:scale-105"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;
