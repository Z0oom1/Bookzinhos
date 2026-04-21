import { useState } from "react";
import { BookHeart, Sparkles } from "lucide-react";
import { login, register } from "../lib/api";

interface LoginProps {
  onLoginSuccess: (name: string) => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password.trim()) return;

    setIsLoading(true);
    setError("");
    
    try {
      let res;
      if (isRegistering) {
        res = await register(name.trim(), password.trim());
      } else {
        res = await login(name.trim(), password.trim());
      }
      
      localStorage.setItem("books-username", res.username);
      localStorage.setItem("books-bio", res.bio);
      localStorage.setItem("books-avatar", res.avatar);
      localStorage.setItem("profile-shelf", JSON.stringify(res.shelf));
      
      onLoginSuccess(res.username);
    } catch (err: any) {
      setError(err.message || "Erro de conexão.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--peach)] via-[var(--lavender)] to-[var(--mint)] flex items-center justify-center p-4 overflow-hidden relative">
      {/* Floating Books Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 text-6xl opacity-20 animate-float">📚</div>
        <div className="absolute top-40 right-20 text-5xl opacity-20 animate-float" style={{ animationDelay: "1s" }}>🐼</div>
        <div className="absolute bottom-32 left-1/4 text-7xl opacity-20 animate-float" style={{ animationDelay: "2s" }}>💕</div>
        <div className="absolute bottom-20 right-1/3 text-6xl opacity-20 animate-float" style={{ animationDelay: "1.5s" }}>✨</div>
        <div className="absolute top-1/2 right-10 text-5xl opacity-20 animate-float" style={{ animationDelay: "0.5s" }}>📖</div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/90 backdrop-blur-xl rounded-[32px] p-8 shadow-2xl animate-scale-in">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-primary to-primary/60 rounded-full mb-4 shadow-lg animate-bounce-in">
              <BookHeart className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2 animate-fade-in">
              Books da Helo
            </h1>
            <p className="text-muted-foreground flex items-center justify-center gap-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              {isRegistering ? "Crie sua conta para começar" : "Sua jornada literária começa aqui"}
              <Sparkles className="w-4 h-4 text-primary" />
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <label className="text-sm font-medium text-muted-foreground pl-1">
                Usuário
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Helo"
                className="w-full px-5 py-3.5 bg-gradient-to-r from-[var(--blush)] to-[var(--sky)] bg-opacity-30 rounded-[16px] outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50 text-foreground"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <label className="text-sm font-medium text-muted-foreground pl-1">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ex: 1234"
                className="w-full px-5 py-3.5 bg-gradient-to-r from-[var(--blush)] to-[var(--sky)] bg-opacity-30 rounded-[16px] outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50 text-foreground"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm font-medium text-center bg-red-50 p-2 rounded-lg animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!name.trim() || !password.trim() || isLoading}
              className="w-full mt-4 py-4 bg-gradient-to-r from-primary to-[var(--peach)] text-white rounded-[16px] font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl relative overflow-hidden group animate-fade-in"
              style={{ animationDelay: "0.5s" }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{isRegistering ? "Criando..." : "Entrando..."}</span>
                </div>
              ) : (
                <>
                  <span className="relative z-10">{isRegistering ? "Criar conta" : "Entrar"}</span>
                  <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError("");
              }}
              disabled={isLoading}
              className="text-sm font-medium text-primary hover:underline transition-all"
            >
              {isRegistering ? "Já tenho uma conta" : "Não tenho uma conta"}
            </button>
          </div>

          {/* Footer Personalizado */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center animate-fade-in" style={{ animationDelay: "0.8s" }}>
            <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest flex items-center justify-center gap-1.5">
              Feito com amor para meu amor Heloize <span className="text-red-400 animate-pulse text-xs">❤️</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
