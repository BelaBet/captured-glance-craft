import { useState } from "react";
import { Lightbulb, Target, Sprout, Sparkles, Gem, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useStats, useInsights } from "@/hooks/useCompassData";

const nodeIcons = [Lightbulb, Target, Sprout, Sparkles];
const nodeStyles = [
  "top-5 left-[30px]",
  "top-[60px] right-10",
  "bottom-[30px] left-[50px]",
  "bottom-10 right-[30px]",
];

const DashboardScreen = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const stats = useStats();
  const insights = useInsights();
  const [generating, setGenerating] = useState(false);

  const statCards = [
    { value: stats.data?.journeyDays ?? 0, label: "Dias de jornada" },
    { value: stats.data?.streak ?? 0, label: "Sequência atual" },
    { value: stats.data?.completedActions ?? 0, label: "Ações completas" },
    { value: stats.data?.insights ?? 0, label: "Insights gerados" },
  ];

  const activeNodes = Math.min(4, Math.max(1, insights.data?.length ?? 0 ? insights.data!.length : 1));
  const canGenerate = (stats.data?.messages ?? 0) >= 4;

  const generateInsight = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("compass-insight");
      if (error) {
        const ctx: any = (error as any).context;
        let message = error.message;
        try {
          const body = await ctx?.json?.();
          if (body?.error) message = body.error;
        } catch {
          /* keep default message */
        }
        throw new Error(message);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      queryClient.invalidateQueries({ queryKey: ["insights", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["stats", user?.id] });
      toast({ title: "Novo insight gerado!" });
    } catch (e: any) {
      toast({ title: "Não foi possível gerar", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const relativeDate = (iso: string) => {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (days <= 0) return "Descoberto hoje";
    if (days === 1) return "Descoberto ontem";
    return `Descoberto há ${days} dias`;
  };

  return (
    <div className="animate-fade-in pb-[100px]">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 max-w-[430px] sm:max-w-[480px] lg:max-w-[520px] w-full bg-card px-4 sm:px-5 pb-4 pt-5 sm:pt-6 border-b border-border z-40">
        <h2 className="font-serif text-2xl sm:text-[28px] font-normal mb-1">Sua Jornada</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">Visualize seu progresso e insights</p>
      </div>

      <div className="pt-[114px] sm:pt-[132px] px-4 sm:px-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8">
          {statCards.map(({ value, label }) => (
            <div
              key={label}
              className="bg-tertiary p-4 sm:p-6 rounded-[20px] text-center transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="text-[26px] sm:text-[32px] font-semibold text-primary mb-1">
                {stats.isLoading ? "–" : value}
              </div>
              <div className="text-xs sm:text-[13px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        {/* Purpose Map */}
        <div className="bg-tertiary p-5 sm:p-7 rounded-3xl mb-8">
          <h3 className="font-serif text-xl sm:text-[22px] font-normal mb-4 sm:mb-5">Mapa de Propósito</h3>
          <div className="relative h-[180px] sm:h-[200px] bg-card rounded-2xl p-4 sm:p-5 overflow-hidden">
            {nodeIcons.slice(0, activeNodes).map((Icon, i) => (
              <div
                key={i}
                className={`absolute w-12 h-12 sm:w-[60px] sm:h-[60px] rounded-full flex items-center justify-center text-primary-foreground animate-pulse-node ${nodeStyles[i]} ${
                  i === 1 ? "bg-primary" : i === 3 ? "bg-success" : "bg-accent"
                }`}
                style={{ animationDelay: `${i * 0.3}s` }}
              >
                <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
            ))}
            {(insights.data?.length ?? 0) === 0 && (
              <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-[13px] text-muted-foreground">
                Seu mapa cresce conforme surgem insights das conversas.
              </div>
            )}
          </div>
        </div>

        {/* Insights */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2 font-sans">
              <Gem className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-primary shrink-0" />
              Insights Descobertos
            </h3>
            <button
              onClick={generateInsight}
              disabled={generating || !canGenerate}
              className="flex items-center gap-1.5 text-xs sm:text-sm text-primary font-medium disabled:opacity-40"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Gerar insight
            </button>
          </div>

          {insights.isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-muted-foreground" size={22} />
            </div>
          )}

          {!insights.isLoading && (insights.data?.length ?? 0) === 0 && (
            <div className="bg-tertiary p-5 rounded-2xl text-[13px] sm:text-sm text-muted-foreground leading-relaxed">
              {canGenerate
                ? "Você já tem conversa suficiente. Toque em \"Gerar insight\" para descobrir um padrão sobre você."
                : "Converse um pouco no Compass e seus primeiros insights aparecerão aqui."}
            </div>
          )}

          {insights.data?.map((insight) => (
            <div
              key={insight.id}
              className="bg-tertiary p-4 sm:p-5 rounded-2xl mb-3 border-l-4 border-primary transition-transform duration-300 hover:translate-x-1"
            >
              <div className="font-semibold mb-2 text-sm sm:text-[15px] font-sans break-words">{insight.title}</div>
              <div className="text-[13px] sm:text-sm text-muted-foreground leading-relaxed break-words">
                {insight.content}
              </div>
              <div className="text-[11px] sm:text-xs text-text-tertiary mt-2">{relativeDate(insight.created_at)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
