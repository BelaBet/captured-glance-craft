import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Compass } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
      }
    } else {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Conta criada!", description: "Verifique seu email para confirmar a conta." });
      }
    }
    setLoading(false);
  };

  return (
    <div className="max-w-[430px] mx-auto bg-card min-h-screen flex flex-col justify-center px-8 shadow-[0_0_60px_rgba(0,0,0,0.06)]">
      <div className="text-center mb-10 animate-slide-up">
        <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-6">
          <Compass size={32} />
        </div>
        <h1 className="font-serif text-[36px] font-light mb-2">Compass</h1>
        <p className="text-muted-foreground">
          {isLogin ? "Entre para continuar sua jornada" : "Crie sua conta e encontre seu propósito"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!isLogin && (
          <input
            type="text"
            placeholder="Seu nome completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="py-3.5 px-5 border border-border rounded-full bg-tertiary text-foreground text-[15px] font-sans focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="py-3.5 px-5 border border-border rounded-full bg-tertiary text-foreground text-[15px] font-sans focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="py-3.5 px-5 border border-border rounded-full bg-tertiary text-foreground text-[15px] font-sans focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-primary-foreground py-[18px] rounded-full text-base font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
        >
          {loading ? "Carregando..." : isLogin ? "Entrar" : "Criar conta"}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        {isLogin ? "Não tem conta? " : "Já tem conta? "}
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-primary font-medium hover:underline"
        >
          {isLogin ? "Criar conta" : "Entrar"}
        </button>
      </p>
    </div>
  );
};

export default AuthPage;
