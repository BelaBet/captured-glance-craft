import { useEffect, useState } from "react";
import { Lightbulb, Target, Sprout, Sparkles, Gem, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Insight {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

const mapNodes = [
  { icon: Lightbulb, style: "top-5 left-[30px]", delay: "0s" },
  { icon: Target, style: "top-[60px] right-10", delay: "0.3s", accent: true },
  { icon: Sprout, style: "bottom-[30px] left-[50px]", delay: "0.6s" },
  { icon: Sparkles, style: "bottom-10 right-[30px]", delay: "0.9s", success: true },
];

const formatInsightDate = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(date));

const DashboardScreen = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState({ days: 0, streak: 0, actions: 0, insights: 0 });
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadDashboard = async () => {
      setIsLoading(true);
      const [profileResult, actionsResult, insightsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("created_at, streak_days")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("goal_actions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("done", true),
        supabase
          .from("insights")
          .select("id, title, content, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (cancelled) return;

      if (profileResult.error || actionsResult.error || insightsResult.error) {
        toast({
          title: "Não foi possível atualizar sua jornada",
          description: "Alguns dados podem estar temporariamente indisponíveis.",
          variant: "destructive",
        });
      }

      const createdAt = profileResult.data?.created_at ? new Date(profileResult.data.created_at) : new Date();
      const days = Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / 86400000) + 1);
      const loadedInsights = insightsResult.data ?? [];

      setStats({
        days,
        streak: profileResult.data?.streak_days ?? 0,
        actions: actionsResult.count ?? 0,
        insights: loadedInsights.length,
      });
      setInsights(loadedInsights);
      setIsLoading(false);
    };

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [user, toast]);

  const statCards = [
    { value: stats.days, label: "Dias de jornada" },
    { value: stats.streak, label: "Sequência atual" },
    { value: stats.actions, label: "Ações completas" },
    { value: stats.insights, label: "Insights gerados" },
  ];

  return (
    <div className="animate-fade-in pb-[100px]">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 max-w-[430px] sm:max-w-[480px] lg:max-w-[520px] w-full bg-card px-4 sm:px-5 pb-4 pt-5 sm:pt-6 border-b border-border z-40">
        <h2 className="font-serif text-2xl sm:text-[28px] font-normal mb-1">Sua Jornada</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">Visualize seu progresso e insights</p>
      </div>

      <div className="pt-[114px] sm:pt-[132px] px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8">
          {statCards.map(({ value, label }) => (
            <div key={label} className="bg-tertiary p-4 sm:p-6 rounded-[20px] text-center transition-transform duration-300 hover:-translate-y-1">
              {isLoading ? <Loader2 className="mx-auto w-7 h-7 animate-spin text-primary" /> : <div className="text-[26px] sm:text-[32px] font-semibold text-primary mb-1">{value}</div>}
              <div className="text-xs sm:text-[13px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        <div className="bg-tertiary p-5 sm:p-7 rounded-3xl mb-8">
          <h3 className="font-serif text-xl sm:text-[22px] font-normal mb-4 sm:mb-5">Mapa de Propósito</h3>
          <div className="relative h-[180px] sm:h-[200px] bg-card rounded-2xl p-4 sm:p-5 overflow-hidden">
            {mapNodes.map(({ icon: Icon, style, delay, accent, success }, i) => (
              <div key={i} className={`absolute w-12 h-12 sm:w-[60px] sm:h-[60px] rounded-full flex items-center justify-center text-primary-foreground animate-pulse-node ${style} ${accent ? "bg-primary" : success ? "bg-success" : "bg-accent"}`} style={{ animationDelay: delay }}>
                <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
            ))}
            {!isLoading && insights.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-center px-12 text-xs sm:text-sm text-muted-foreground">
                Continue conversando com o Compass para construir seu mapa de propósito.
              </div>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2 font-sans">
            <Gem className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-primary shrink-0" />
            Insights Descobertos
          </h3>
          {insights.length === 0 ? (
            <div className="bg-tertiary p-5 rounded-2xl text-sm text-muted-foreground">
              Seus primeiros insights aparecerão aqui conforme o Compass identificar padrões nas suas conversas.
            </div>
          ) : insights.map((insight) => (
            <div key={insight.id} className="bg-tertiary p-4 sm:p-5 rounded-2xl mb-3 border-l-4 border-primary transition-transform duration-300 hover:translate-x-1">
              <div className="font-semibold mb-2 text-sm sm:text-[15px] font-sans break-words">{insight.title}</div>
              <div className="text-[13px] sm:text-sm text-muted-foreground leading-relaxed break-words">{insight.content}</div>
              <div className="text-[11px] sm:text-xs text-text-tertiary mt-2">{formatInsightDate(insight.created_at)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
