import { useState, useEffect } from "react";
import { BookHeart, Sparkles } from "lucide-react";
import { login, register, fetchAllUsers } from "../lib/api";

interface LoginProps {
  onLoginSuccess: (name: string) => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [usersList, setUsersList] = useState<any[]>([]);

  useEffect(() => {
    fetchAllUsers()
      .then((u) => setUsersList(u || []))
      .catch((err) => console.error("Erro ao obter usuários no login:", err));
  }, []);

  const matchedUser = usersList.find(
    (u) => u.username.trim().toLowerCase() === name.trim().toLowerCase()
  );

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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Floating Books Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 text-6xl opacity-15 animate-float select-none">📚</div>
        <div className="absolute top-40 right-20 text-5xl opacity-15 animate-float select-none" style={{ animationDelay: "1s" }}>🐼</div>
        <div className="absolute bottom-32 left-1/4 text-7xl opacity-15 animate-float select-none" style={{ animationDelay: "2s" }}>💕</div>
        <div className="absolute bottom-20 right-1/3 text-6xl opacity-15 animate-float select-none" style={{ animationDelay: "1.5s" }}>✨</div>
        <div className="absolute top-1/2 right-10 text-5xl opacity-15 animate-float select-none" style={{ animationDelay: "0.5s" }}>📖</div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl animate-scale-in border border-white/80">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-[var(--primary)] rounded-full mb-4 shadow-md animate-bounce-in border-4 border-white select-none">
              {matchedUser ? (
                <span className="text-5xl">{matchedUser.avatar || "👤"}</span>
              ) : (
                <BookHeart className="w-12 h-12 text-white" />
              )}
            </div>
            <h1 className="text-3xl font-extrabold text-[var(--text-main)] mb-1 tracking-tight">
              Books da Helo
            </h1>
            <p className="text-xs font-bold text-[var(--text-muted)] flex items-center justify-center gap-1.5 uppercase tracking-widest" style={{ animationDelay: "0.2s" }}>
              {isRegistering ? "Crie sua conta para começar" : "Sua jornada literária começa aqui"}
              <Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <label className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest pl-1">
                Usuário
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Helo"
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[var(--primary)]/30 focus:ring-4 focus:ring-[var(--primary)]/5 transition-all text-xs font-semibold placeholder:text-[var(--text-muted)]"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <label className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest pl-1">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ex: 1234"
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[var(--primary)]/30 focus:ring-4 focus:ring-[var(--primary)]/5 transition-all text-xs font-semibold placeholder:text-[var(--text-muted)]"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="text-red-500 text-xs font-semibold text-center bg-red-50 border border-red-150 p-2.5 rounded-xl animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!name.trim() || !password.trim() || isLoading}
              className={`w-full mt-4 py-4 font-bold rounded-2xl transition-all relative overflow-hidden group animate-fade-in shadow-md cursor-pointer ${
                !name.trim() || !password.trim() || isLoading
                  ? "bg-slate-150 text-slate-300 cursor-not-allowed shadow-none"
                  : "bg-[var(--primary)] text-white hover:shadow-lg hover:shadow-[var(--primary)]/15 active:scale-95"
              }`}
              style={{ animationDelay: "0.5s" }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2.5">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest">{isRegistering ? "Criando..." : "Entrando..."}</span>
                </div>
              ) : (
                <>
                  <span className="relative z-10 text-[10px] font-extrabold uppercase tracking-widest">{isRegistering ? "Criar conta" : "Entrar"}</span>
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
              className="text-xs font-extrabold text-[var(--primary)] hover:underline transition-all cursor-pointer uppercase tracking-widest"
            >
              {isRegistering ? "Já tenho uma conta" : "Não tenho uma conta"}
            </button>
          </div>

          {/* Footer Personalizado */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center animate-fade-in" style={{ animationDelay: "0.8s" }}>
            <p className="text-[9px] text-[var(--text-muted)] font-extrabold uppercase tracking-widest flex items-center justify-center gap-1.5 leading-none">
              Feito com amor para meu amor Heloize <span className="text-red-400 animate-pulse text-xs">❤️</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
