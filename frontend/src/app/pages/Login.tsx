import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 overflow-hidden relative bg-gradient-to-tr from-slate-100 via-slate-50 to-indigo-50/30">
      {/* Floating Books Background - Subtle & Professional */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 text-6xl opacity-[0.04] select-none">📚</div>
        <div className="absolute top-40 right-20 text-5xl opacity-[0.04] select-none" style={{ animationDelay: "1s" }}>🐼</div>
        <div className="absolute bottom-32 left-1/4 text-6xl opacity-[0.04] select-none" style={{ animationDelay: "2s" }}>📖</div>
        <div className="absolute bottom-20 right-1/3 text-6xl opacity-[0.04] select-none" style={{ animationDelay: "1.5s" }}>✨</div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] border border-white/80">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl mb-4 shadow-sm border border-slate-100 overflow-hidden select-none">
              {matchedUser ? (
                <span className="text-4xl">{matchedUser.avatar || "👤"}</span>
              ) : (
                <img src="/icone.png" alt="myBooks Logo" className="w-14 h-14 object-contain" />
              )}
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800 mb-1 tracking-tight">
              myBooks
            </h1>
            <p className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1.5 uppercase tracking-widest">
              {isRegistering ? "Crie sua conta para começar" : "Gerenciador Pessoal de Leitura"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                Usuário
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: caio"
                className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200/80 rounded-2xl outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/5 transition-all text-xs font-semibold placeholder:text-slate-300"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ex: 1234"
                className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200/80 rounded-2xl outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/5 transition-all text-xs font-semibold placeholder:text-slate-300"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="text-red-500 text-xs font-semibold text-center bg-red-50 border border-red-150 p-2.5 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!name.trim() || !password.trim() || isLoading}
              className={`w-full mt-4 py-4 font-bold rounded-2xl transition-all relative overflow-hidden group shadow-sm cursor-pointer ${
                !name.trim() || !password.trim() || isLoading
                  ? "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                  : "bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 hover:shadow-md active:scale-95"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2.5">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{isRegistering ? "Criando..." : "Entrando..."}</span>
                </div>
              ) : (
                <span className="relative z-10 text-[10px] font-bold uppercase tracking-widest">{isRegistering ? "Criar conta" : "Entrar"}</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError("");
              }}
              disabled={isLoading}
              className="text-xs font-bold text-[var(--primary)] hover:text-[var(--primary)]/80 transition-all cursor-pointer uppercase tracking-widest"
            >
              {isRegistering ? "Já tenho uma conta" : "Não tenho uma conta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
