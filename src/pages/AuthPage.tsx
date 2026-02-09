import { useState } from "react";
import PasswordStrength from "@/components/PasswordStrength";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Compass, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type View = "login" | "signup" | "forgot" | "reset";

const AuthPage = ({ defaultView }: { defaultView?: View }) => {
  const [view, setView] = useState<View>(defaultView || "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (view === "login") {
      const { error } = await signIn(email, password);
      if (error) toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
    } else if (view === "signup") {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Conta criada!", description: "Verifique seu email para confirmar a conta." });
      }
    } else if (view === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}?reset=true`,
      });
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Email enviado!", description: "Verifique sua caixa de entrada para redefinir a senha." });
        setView("login");
      }
    } else if (view === "reset") {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Senha atualizada!", description: "Você já pode entrar com a nova senha." });
        setView("login");
      }
    }
    setLoading(false);
  };

  const titles: Record<View, { heading: string; sub: string }> = {
    login: { heading: "Compass", sub: "Entre para continuar sua jornada" },
    signup: { heading: "Compass", sub: "Crie sua conta e encontre seu propósito" },
    forgot: { heading: "Recuperar conta", sub: "Enviaremos um link para redefinir sua senha" },
    reset: { heading: "Nova senha", sub: "Escolha uma nova senha para sua conta" },
  };

  return (
    <div className="max-w-[430px] mx-auto bg-card min-h-screen flex flex-col justify-center px-8 shadow-[0_0_60px_rgba(0,0,0,0.06)]">
      {(view === "forgot" || view === "reset") && (
        <button onClick={() => setView("login")} className="flex items-center gap-1 text-muted-foreground mb-6 hover:text-foreground transition-colors">
          <ArrowLeft size={18} /> Voltar
        </button>
      )}

      <div className="text-center mb-10 animate-slide-up">
        <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-6">
          <Compass size={32} />
        </div>
        <h1 className="font-serif text-[36px] font-light mb-2">{titles[view].heading}</h1>
        <p className="text-muted-foreground">{titles[view].sub}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {view === "signup" && (
          <input
            type="text"
            placeholder="Seu nome completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="py-3.5 px-5 border border-border rounded-full bg-tertiary text-foreground text-[15px] font-sans focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
          />
        )}
        {view !== "reset" && (
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="py-3.5 px-5 border border-border rounded-full bg-tertiary text-foreground text-[15px] font-sans focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
          />
        )}
        {(view === "login" || view === "signup" || view === "reset") && (
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder={view === "reset" ? "Nova senha" : "Senha"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full py-3.5 px-5 pr-12 border border-border rounded-full bg-tertiary text-foreground text-[15px] font-sans focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        )}
        {(view === "signup" || view === "reset") && (
          <PasswordStrength password={password} />
        )}
        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-primary-foreground py-[18px] rounded-full text-base font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
        >
          {loading
            ? "Carregando..."
            : view === "login"
            ? "Entrar"
            : view === "signup"
            ? "Criar conta"
            : view === "forgot"
            ? "Enviar link"
            : "Salvar nova senha"}
        </button>
      </form>

      <div className="text-center text-sm text-muted-foreground mt-6 space-y-2">
        {view === "login" && (
          <>
            <p>
              <button onClick={() => setView("forgot")} className="text-primary font-medium hover:underline">
                Esqueceu a senha?
              </button>
            </p>
            <p>
              Não tem conta?{" "}
              <button onClick={() => setView("signup")} className="text-primary font-medium hover:underline">
                Criar conta
              </button>
            </p>
          </>
        )}
        {view === "signup" && (
          <p>
            Já tem conta?{" "}
            <button onClick={() => setView("login")} className="text-primary font-medium hover:underline">
              Entrar
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
