import { useEffect, useState } from "react";
import { Target, Zap, Check, Plus, Loader2 } from "lucide-react";
import { playCompletion } from "@/lib/sounds";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Action { id: string; text: string; done: boolean; }
interface Goal { id: string; title: string; status: string; progress: number; actions: Action[]; }

const ProgressScreen = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoal, setNewGoal] = useState("");
  const [newAction, setNewAction] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadGoals = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data: goalRows, error: goalsError } = await supabase
      .from("goals")
      .select("id, title, status, progress")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (goalsError) {
      toast({ title: "Não foi possível carregar suas metas", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const ids = (goalRows ?? []).map((goal) => goal.id);
    const { data: actionRows, error: actionsError } = ids.length
      ? await supabase.from("goal_actions").select("id, goal_id, text, done").eq("user_id", user.id).in("goal_id", ids).order("created_at", { ascending: true })
      : { data: [], error: null };

    if (actionsError) toast({ title: "Não foi possível carregar as ações", variant: "destructive" });

    setGoals((goalRows ?? []).map((goal) => {
      const actions = (actionRows ?? []).filter((action) => action.goal_id === goal.id).map((action) => ({ id: action.id, text: action.text, done: Boolean(action.done) }));
      const progress = actions.length ? Math.round((actions.filter((action) => action.done).length / actions.length) * 100) : Number(goal.progress ?? 0);
      return { id: goal.id, title: goal.title, status: progress >= 100 ? "completed" : "in-progress", progress, actions };
    }));
    setIsLoading(false);
  };

  useEffect(() => { void loadGoals(); }, [user]);

  const createGoal = async () => {
    const title = newGoal.trim();
    if (!user || !title) return;
    if (title.length > 120) {
      toast({ title: "Meta muito longa", description: "Use no máximo 120 caracteres.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("goals").insert({ user_id: user.id, title, progress: 0, status: "in-progress" });
    if (error) {
      toast({ title: "Não foi possível criar a meta", variant: "destructive" });
      return;
    }
    setNewGoal("");
    await loadGoals();
  };

  const createAction = async (goalId: string) => {
    const text = (newAction[goalId] ?? "").trim();
    if (!user || !text) return;
    if (text.length > 240) {
      toast({ title: "Ação muito longa", description: "Use no máximo 240 caracteres.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("goal_actions").insert({ goal_id: goalId, user_id: user.id, text, done: false });
    if (error) {
      toast({ title: "Não foi possível criar a ação", variant: "destructive" });
      return;
    }
    setNewAction((current) => ({ ...current, [goalId]: "" }));
    await loadGoals();
  };

  const toggleAction = async (goal: Goal, action: Action) => {
    const nextDone = !action.done;
    if (nextDone) playCompletion();
    const { error } = await supabase.from("goal_actions").update({ done: nextDone }).eq("id", action.id).eq("user_id", user?.id ?? "");
    if (error) {
      toast({ title: "Não foi possível atualizar a ação", variant: "destructive" });
      return;
    }
    const nextActions = goal.actions.map((item) => item.id === action.id ? { ...item, done: nextDone } : item);
    const progress = nextActions.length ? Math.round((nextActions.filter((item) => item.done).length / nextActions.length) * 100) : 0;
    await supabase.from("goals").update({ progress, status: progress >= 100 ? "completed" : "in-progress" }).eq("id", goal.id).eq("user_id", user?.id ?? "");
    setGoals((current) => current.map((item) => item.id === goal.id ? { ...item, actions: nextActions, progress, status: progress >= 100 ? "completed" : "in-progress" } : item));
  };

  return (
    <div className="animate-fade-in pb-[100px]">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 max-w-[430px] sm:max-w-[480px] lg:max-w-[520px] w-full bg-card px-4 sm:px-5 pb-4 pt-5 sm:pt-6 border-b border-border z-40">
        <h2 className="font-serif text-2xl sm:text-[28px] font-normal mb-1">Metas &amp; Ações</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">Seu plano personalizado</p>
      </div>

      <div className="pt-[114px] sm:pt-[132px] px-4 sm:px-6">
        <div className="mb-8">
          <h3 className="text-base sm:text-lg font-semibold mb-3 flex items-center gap-2"><Target className="w-5 h-5 text-primary" />Metas</h3>
          <div className="flex gap-2 mb-4">
            <input value={newGoal} maxLength={120} onChange={(e) => setNewGoal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void createGoal()} placeholder="Ex.: Construir um novo hábito" className="flex-1 py-3 px-4 border border-border rounded-xl bg-tertiary text-sm focus:outline-none focus:border-primary" />
            <button onClick={() => void createGoal()} disabled={!newGoal.trim()} aria-label="Criar meta" className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"><Plus size={20} /></button>
          </div>

          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" /></div> : goals.length === 0 ? (
            <div className="bg-tertiary p-5 rounded-2xl text-sm text-muted-foreground">Você ainda não tem metas. Crie a primeira acima.</div>
          ) : goals.map((goal) => (
            <div key={goal.id} className="bg-tertiary p-4 sm:p-5 rounded-2xl mb-4">
              <div className="flex justify-between items-start gap-2 mb-3 flex-wrap">
                <div className="font-semibold text-sm sm:text-[15px] flex-1 min-w-[60%]">{goal.title}</div>
                <span className={`px-2.5 py-1 rounded-xl text-[11px] font-medium text-card ${goal.status === "completed" ? "bg-success" : "bg-warning"}`}>{goal.status === "completed" ? "Completa" : "Em andamento"}</span>
              </div>
              <div className="h-2 bg-progress-bg rounded overflow-hidden mb-2"><div className="h-full bg-progress-fill rounded transition-all duration-600" style={{ width: `${goal.progress}%` }} /></div>
              <div className="text-xs text-muted-foreground mb-3">{goal.actions.filter((action) => action.done).length} de {goal.actions.length} ações completas</div>

              <div className="flex flex-col gap-2">
                {goal.actions.map((action) => (
                  <div key={action.id} className="flex items-start gap-3 p-3 bg-card rounded-xl">
                    <button onClick={() => void toggleAction(goal, action)} aria-label={action.done ? "Desmarcar ação" : "Concluir ação"} className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center shrink-0 ${action.done ? "bg-primary border-primary" : "border-border"}`}>
                      {action.done && <Check size={12} className="text-primary-foreground" />}
                    </button>
                    <span className="text-[13px] flex-1 leading-snug">{action.text}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-3">
                <input value={newAction[goal.id] ?? ""} maxLength={240} onChange={(e) => setNewAction((current) => ({ ...current, [goal.id]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && void createAction(goal.id)} placeholder="Adicionar uma ação" className="flex-1 py-2.5 px-3 border border-border rounded-xl bg-card text-xs focus:outline-none focus:border-primary" />
                <button onClick={() => void createAction(goal.id)} disabled={!(newAction[goal.id] ?? "").trim()} aria-label="Adicionar ação" className="w-10 h-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center disabled:opacity-50"><Plus size={17} /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-8">
          <h3 className="text-base sm:text-lg font-semibold mb-3 flex items-center gap-2"><Zap className="w-5 h-5 text-primary" />Ação de Hoje</h3>
          <div className="bg-tertiary p-4 sm:p-5 rounded-2xl border-l-4 border-primary text-sm text-muted-foreground">
            Escolha uma ação pequena que aproxime você de uma das suas metas. O Compass vai transformar suas conversas em próximos passos conforme sua jornada evoluir.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressScreen;
