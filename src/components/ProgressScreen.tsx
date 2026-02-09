import { useState } from "react";
import { Target, Zap, Check } from "lucide-react";
import { playCompletion } from "@/lib/sounds";

const initialGoals = [
  {
    title: "Explorar educação online",
    status: "in-progress" as const,
    progress: 60,
    progressText: "3 de 5 ações completas",
    actions: [
      { text: "Pesquisar 3 plataformas de ensino online", done: true },
      { text: "Identificar tema que você gostaria de ensinar", done: true },
      { text: "Conversar com alguém que já ensina online", done: true },
      { text: "Criar outline de uma primeira aula", done: false },
      { text: "Gravar vídeo teste de 2 minutos", done: false },
    ],
  },
  {
    title: "Fortalecer conexões significativas",
    status: "completed" as const,
    progress: 100,
    progressText: "3 de 3 ações completas",
    actions: [],
  },
];

const ProgressScreen = () => {
  const [goals, setGoals] = useState(initialGoals);

  const toggleAction = (goalIdx: number, actionIdx: number) => {
    const action = goals[goalIdx]?.actions[actionIdx];
    if (action && !action.done) {
      playCompletion();
    }
    setGoals((prev) =>
      prev.map((g, gi) =>
        gi === goalIdx
          ? {
              ...g,
              actions: g.actions.map((a, ai) =>
                ai === actionIdx ? { ...a, done: !a.done } : a
              ),
            }
          : g
      )
    );
  };

  return (
    <div className="animate-fade-in pb-[100px]">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 max-w-[430px] w-full bg-card p-5 border-b border-border z-50">
        <h2 className="font-serif text-[28px] font-normal mb-1">Metas & Ações</h2>
        <p className="text-sm text-muted-foreground">Seu plano semanal personalizado</p>
      </div>

      <div className="pt-[100px] px-6">
        {/* Weekly Goals */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 font-sans">
            <Target size={20} className="text-primary" />
            Metas da Semana
          </h3>

          {goals.map((goal, gi) => (
            <div key={gi} className="bg-tertiary p-5 rounded-2xl mb-4">
              <div className="flex justify-between items-start mb-3">
                <div className="font-semibold text-[15px] flex-1 font-sans">{goal.title}</div>
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-medium text-card ${
                    goal.status === "completed" ? "bg-success" : "bg-warning"
                  }`}
                >
                  {goal.status === "completed" ? "Completa" : "Em andamento"}
                </span>
              </div>

              <div className="h-2 bg-progress-bg rounded overflow-hidden mb-2">
                <div
                  className="h-full bg-progress-fill rounded transition-all duration-600"
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
              <div className="text-[13px] text-muted-foreground">{goal.progressText}</div>

              {goal.actions.length > 0 && (
                <div className="flex flex-col gap-3 mt-3">
                  {goal.actions.map((action, ai) => (
                    <div key={ai} className="flex items-center gap-3 p-3 bg-card rounded-xl">
                      <button
                        onClick={() => toggleAction(gi, ai)}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-300 shrink-0 ${
                          action.done
                            ? "bg-primary border-primary"
                            : "border-border"
                        }`}
                      >
                        {action.done && <Check size={12} className="text-primary-foreground" />}
                      </button>
                      <span className="text-sm flex-1">{action.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Today's Action */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 font-sans">
            <Zap size={20} className="text-primary" />
            Ação de Hoje
          </h3>
          <div className="bg-tertiary p-5 rounded-2xl border-l-4 border-primary">
            <div className="font-semibold mb-2 text-[15px] font-sans">
              Escreva o outline da sua primeira aula
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed">
              Baseado nas suas conversas, você se interessa por ensinar desenvolvimento pessoal.
              Dedique 20 minutos hoje para estruturar uma aula de introdução. Não precisa ser
              perfeito - o importante é começar.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressScreen;
