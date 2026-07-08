import { useState } from "react";
import PasswordStrength from "@/components/PasswordStrength";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
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
    <div className="max-w-[430px] sm:max-w-[480px] lg:max-w-[520px] mx-auto bg-card min-h-screen flex flex-col justify-center px-5 sm:px-8 shadow-[0_0_60px_rgba(0,0,0,0.06)]">
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

      {(view === "login" || view === "signup") && (
        <>
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <button
            type="button"
            onClick={async () => {
              const { error } = await lovable.auth.signInWithOAuth("google", {
                redirect_uri: window.location.origin,
              });
              if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
            }}
            className="w-full flex items-center justify-center gap-3 py-3.5 border border-border rounded-full bg-tertiary text-foreground text-[15px] font-medium hover:-translate-y-0.5 hover:shadow-md transition-all duration-300"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuar com Google
          </button>
          <button
            type="button"
            onClick={async () => {
              const { error } = await lovable.auth.signInWithOAuth("apple", {
                redirect_uri: window.location.origin,
              });
              if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
            }}
            className="w-full flex items-center justify-center gap-3 py-3.5 border border-border rounded-full bg-tertiary text-foreground text-[15px] font-medium hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 mt-3"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Continuar com Apple
          </button>
        </>
      )}

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
