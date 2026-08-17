import { Lightbulb, Target, Sprout, Sparkles, Gem } from "lucide-react";

const stats = [
  { value: "23", label: "Dias de jornada" },
  { value: "7", label: "Sequência atual" },
  { value: "12", label: "Ações completas" },
  { value: "4", label: "Insights gerados" },
];

const mapNodes = [
  { icon: Lightbulb, style: "top-5 left-[30px]", delay: "0s" },
  { icon: Target, style: "top-[60px] right-10", delay: "0.3s", accent: true },
  { icon: Sprout, style: "bottom-[30px] left-[50px]", delay: "0.6s" },
  { icon: Sparkles, style: "bottom-10 right-[30px]", delay: "0.9s", success: true },
];

const insights = [
  {
    title: "Você é um construtor de pontes",
    text: "Suas conversas revelam uma habilidade natural de conectar ideias e pessoas. Você se energiza facilitando colaborações e compartilhando conhecimento.",
    date: "Descoberto há 2 dias",
  },
  {
    title: "Aprendizado como combustível",
    text: "Você menciona aprendizado em 80% das suas respostas. Crescimento contínuo não é apenas importante para você - é essencial para sua satisfação.",
    date: "Descoberto há 5 dias",
  },
];

const DashboardScreen = () => (
  <div className="animate-fade-in pb-[100px]">
    <div className="fixed top-0 left-1/2 -translate-x-1/2 max-w-[430px] sm:max-w-[480px] lg:max-w-[520px] w-full bg-card px-4 sm:px-5 pb-4 pt-[56px] sm:pt-[64px] border-b border-border z-40">
      <h2 className="font-serif text-2xl sm:text-[28px] font-normal mb-1">Sua Jornada</h2>
      <p className="text-xs sm:text-sm text-muted-foreground">Visualize seu progresso e insights</p>
    </div>

    <div className="pt-[150px] sm:pt-[168px] px-4 sm:px-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8">
        {stats.map(({ value, label }) => (
          <div
            key={label}
            className="bg-tertiary p-4 sm:p-6 rounded-[20px] text-center transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="text-[26px] sm:text-[32px] font-semibold text-primary mb-1">{value}</div>
            <div className="text-xs sm:text-[13px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>


      {/* Purpose Map */}
      <div className="bg-tertiary p-5 sm:p-7 rounded-3xl mb-8">
        <h3 className="font-serif text-xl sm:text-[22px] font-normal mb-4 sm:mb-5">Mapa de Propósito</h3>
        <div className="relative h-[180px] sm:h-[200px] bg-card rounded-2xl p-4 sm:p-5 overflow-hidden">
          {mapNodes.map(({ icon: Icon, style, delay, accent, success }, i) => (
            <div
              key={i}
              className={`absolute w-12 h-12 sm:w-[60px] sm:h-[60px] rounded-full flex items-center justify-center text-primary-foreground animate-pulse-node ${style} ${
                accent ? "bg-primary" : success ? "bg-success" : "bg-accent"
              }`}
              style={{ animationDelay: delay }}
            >
              <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
          ))}

        </div>
      </div>

      {/* Insights */}
      <div className="mb-8">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2 font-sans">
          <Gem className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-primary shrink-0" />
          Insights Descobertos
        </h3>
        {insights.map(({ title, text, date }) => (
          <div
            key={title}
            className="bg-tertiary p-4 sm:p-5 rounded-2xl mb-3 border-l-4 border-primary transition-transform duration-300 hover:translate-x-1"
          >
            <div className="font-semibold mb-2 text-sm sm:text-[15px] font-sans break-words">{title}</div>
            <div className="text-[13px] sm:text-sm text-muted-foreground leading-relaxed break-words">{text}</div>
            <div className="text-[11px] sm:text-xs text-text-tertiary mt-2">{date}</div>
          </div>
        ))}
      </div>

    </div>
  </div>
);

export default DashboardScreen;
