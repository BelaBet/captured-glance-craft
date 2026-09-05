import { useState } from "react";
import { Target, Zap, Check, Plus, Trash2, Loader2 } from "lucide-react";
import { playCompletion } from "@/lib/sounds";
import { useGoals } from "@/hooks/useCompassData";
import { useToast } from "@/hooks/use-toast";

const ProgressScreen = () => {
  const { goals, addGoal, deleteGoal, addAction, toggleAction, deleteAction } = useGoals();
  const { toast } = useToast();
  const [newGoal, setNewGoal] = useState("");
  const [creating, setCreating] = useState(false);
  const [actionDrafts, setActionDrafts] = useState<Record<string, string>>({});

  const data = goals.data;
  const list = data?.goals ?? [];
  const actions = data?.actions ?? [];

  const actionsOf = (goalId: string) => actions.filter((a) => a.goal_id === goalId);

  const handleAddGoal = async () => {
    const title = newGoal.trim();
    if (!title) return;
    try {
      await addGoal.mutateAsync(title);
      setNewGoal("");
      setCreating(false);
    } catch (e: any) {
      toast({ title: "Erro ao criar meta", description: e.message, variant: "destructive" });
    }
  };

  const handleAddAction = async (goalId: string) => {
    const text = (actionDrafts[goalId] ?? "").trim();
    if (!text) return;
    try {
      await addAction.mutateAsync({ goalId, text });
      setActionDrafts((d) => ({ ...d, [goalId]: "" }));
    } catch (e: any) {
      toast({ title: "Erro ao adicionar ação", description: e.message, variant: "destructive" });
    }
  };

  const handleToggle = async (id: string, done: boolean) => {
    if (!done) playCompletion();
    try {
      await toggleAction.mutateAsync({ id, done: !done });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  };

  const nextAction = actions.find((a) => !a.done);
  const nextActionGoal = list.find((g) => g.id === nextAction?.goal_id);

  return (
    <div className="animate-fade-in pb-[100px]">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 max-w-[430px] sm:max-w-[480px] lg:max-w-[520px] w-full bg-card px-4 sm:px-5 pb-4 pt-5 sm:pt-6 border-b border-border z-40">
        <h2 className="font-serif text-2xl sm:text-[28px] font-normal mb-1">Metas &amp; Ações</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">Seu plano personalizado</p>
      </div>

      <div className="pt-[114px] sm:pt-[132px] px-4 sm:px-6">
        <div className="mb-8">
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2 font-sans">
              <Target className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-primary shrink-0" />
              Suas metas
            </h3>
            <button
              onClick={() => setCreating((c) => !c)}
              className="flex items-center gap-1 text-xs sm:text-sm text-primary font-medium"
            >
              <Plus size={16} /> Nova
            </button>
          </div>

          {creating && (
            <div className="flex gap-2 mb-4">
              <input
                autoFocus
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddGoal()}
                placeholder="Ex.: Explorar educação online"
                className="flex-1 min-w-0 py-3 px-4 rounded-xl bg-tertiary border border-border text-sm outline-none focus:border-primary"
              />
              <button
                onClick={handleAddGoal}
                disabled={addGoal.isPending}
                className="px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          )}

          {goals.isLoading && (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-muted-foreground" size={22} />
            </div>
          )}

          {!goals.isLoading && list.length === 0 && (
            <div className="bg-tertiary p-5 rounded-2xl text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Você ainda não tem metas. Crie a primeira a partir do que descobriu nas conversas.
              </p>
              <button
                onClick={() => setCreating(true)}
                className="px-5 py-3 rounded-full bg-primary text-primary-foreground text-sm font-medium"
              >
                Criar primeira meta
              </button>
            </div>
          )}

          {list.map((goal) => {
            const goalActions = actionsOf(goal.id);
            const doneCount = goalActions.filter((a) => a.done).length;
            const progress = goalActions.length
              ? Math.round((doneCount / goalActions.length) * 100)
              : 0;
            const completed = goalActions.length > 0 && doneCount === goalActions.length;

            return (
              <div key={goal.id} className="bg-tertiary p-4 sm:p-5 rounded-2xl mb-4">
                <div className="flex justify-between items-start gap-2 mb-3 flex-wrap">
                  <div className="font-semibold text-sm sm:text-[15px] flex-1 min-w-[55%] font-sans break-words">
                    {goal.title}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 sm:px-3 py-1 rounded-xl text-[11px] sm:text-xs font-medium text-card whitespace-nowrap ${
                        completed ? "bg-success" : "bg-warning"
                      }`}
                    >
                      {completed ? "Completa" : "Em andamento"}
                    </span>
                    <button
                      onClick={() => deleteGoal.mutate(goal.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Excluir meta"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="h-2 bg-progress-bg rounded overflow-hidden mb-2">
                  <div
                    className="h-full bg-progress-fill rounded transition-all duration-600"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-xs sm:text-[13px] text-muted-foreground">
                  {goalActions.length
                    ? `${doneCount} de ${goalActions.length} ações completas`
                    : "Nenhuma ação ainda"}
                </div>

                <div className="flex flex-col gap-2.5 sm:gap-3 mt-3">
                  {goalActions.map((action) => (
                    <div key={action.id} className="flex items-start gap-3 p-3 bg-card rounded-xl">
                      <button
                        onClick={() => handleToggle(action.id, !!action.done)}
                        className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center transition-all duration-300 shrink-0 ${
                          action.done ? "bg-primary border-primary" : "border-border"
                        }`}
                        aria-label="Concluir ação"
                      >
                        {action.done && <Check size={12} className="text-primary-foreground" />}
                      </button>
                      <span
                        className={`text-[13px] sm:text-sm flex-1 min-w-0 break-words leading-snug ${
                          action.done ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {action.text}
                      </span>
                      <button
                        onClick={() => deleteAction.mutate(action.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                        aria-label="Excluir ação"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <input
                      value={actionDrafts[goal.id] ?? ""}
                      onChange={(e) =>
                        setActionDrafts((d) => ({ ...d, [goal.id]: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === "Enter" && handleAddAction(goal.id)}
                      placeholder="Adicionar ação..."
                      className="flex-1 min-w-0 py-2.5 px-4 rounded-xl bg-card border border-border text-[13px] outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => handleAddAction(goal.id)}
                      className="w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0"
                      aria-label="Adicionar ação"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Today's Action */}
        <div className="mb-8">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2 font-sans">
            <Zap className="w-[18px] h-[18px] sm:w-5 sm:h-5 text-primary shrink-0" />
            Ação de Hoje
          </h3>
          <div className="bg-tertiary p-4 sm:p-5 rounded-2xl border-l-4 border-primary">
            {nextAction ? (
              <>
                <div className="font-semibold mb-2 text-sm sm:text-[15px] font-sans break-words">
                  {nextAction.text}
                </div>
                <div className="text-[13px] sm:text-sm text-muted-foreground leading-relaxed break-words">
                  Da meta "{nextActionGoal?.title}". Dedique alguns minutos hoje — não precisa ser
                  perfeito, o importante é começar.
                </div>
              </>
            ) : (
              <div className="text-[13px] sm:text-sm text-muted-foreground leading-relaxed">
                Nenhuma ação pendente. Crie uma nova ação em alguma meta para continuar avançando.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressScreen;
