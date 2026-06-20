import { useState, useEffect } from "react";
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
    <div className="min-h-screen bg-[#060814] flex items-center justify-center p-4 overflow-hidden relative select-none">
      {/* Aurora Ambient Background (Glowing Blobs) */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-rose-500/10 blur-[150px] pointer-events-none animate-pulse" style={{ animationDuration: "8s" }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-violet-600/15 blur-[150px] pointer-events-none animate-pulse" style={{ animationDuration: "12s" }} />
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

      {/* Floating Books Background (Subtle Grid) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
        <div className="absolute top-20 left-10 text-6xl select-none">📚</div>
        <div className="absolute top-40 right-20 text-5xl select-none">🐼</div>
        <div className="absolute bottom-32 left-1/4 text-6xl select-none">📖</div>
        <div className="absolute bottom-20 right-1/3 text-6xl select-none">✨</div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md relative z-10 transition-all duration-300">
        <div className="bg-slate-900/40 backdrop-blur-2xl rounded-[2.5rem] p-10 shadow-[0_30px_80px_-15px_rgba(0,0,0,0.6)] border border-white/5 relative overflow-hidden">
          {/* Top border highlight glow */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-500/30 to-violet-500/30" />

          {/* Logo */}
          <div className="text-center mb-8 relative">
            <div className="inline-flex items-center justify-center w-28 h-28 bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 rounded-[2.25rem] mb-6 shadow-[0_12px_40px_rgba(0,0,0,0.4)] border border-slate-700/30 p-2 overflow-hidden select-none transition-transform duration-500 hover:scale-105">
              {matchedUser ? (
                <span className="text-5xl">{matchedUser.avatar || "👤"}</span>
              ) : (
                <img src="/icone.png" alt="myBooks Logo" className="w-full h-full object-contain rounded-2xl" />
              )}
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-300">
              myBooks
            </h1>
            <p className="text-[9px] font-black text-rose-400/90 flex items-center justify-center gap-1.5 uppercase tracking-[0.25em] leading-none">
              {isRegistering ? "Crie sua conta para começar" : "Gerenciador Pessoal de Leitura"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                Usuário
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: caio"
                className="w-full px-5 py-4 bg-slate-950/50 border border-slate-800/80 rounded-2xl outline-none focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/5 transition-all text-xs font-semibold text-white placeholder:text-slate-600"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-5 py-4 bg-slate-950/50 border border-slate-800/80 rounded-2xl outline-none focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/5 transition-all text-xs font-semibold text-white placeholder:text-slate-750"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="text-red-400 text-xs font-semibold text-center bg-red-500/5 border border-red-500/20 p-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!name.trim() || !password.trim() || isLoading}
              className={`w-full mt-6 py-4 font-bold rounded-2xl transition-all relative overflow-hidden group shadow-md cursor-pointer ${
                !name.trim() || !password.trim() || isLoading
                  ? "bg-slate-800/80 text-slate-500 cursor-not-allowed shadow-none"
                  : "bg-gradient-to-r from-rose-500 via-rose-600 to-violet-600 text-white hover:opacity-95 hover:shadow-[0_0_30px_rgba(244,63,94,0.25)] active:scale-[0.98]"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2.5">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{isRegistering ? "Criando..." : "Entrando..."}</span>
                </div>
              ) : (
                <span className="relative z-10 text-[10px] font-black uppercase tracking-widest">{isRegistering ? "Criar conta" : "Entrar"}</span>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError("");
              }}
              disabled={isLoading}
              className="text-[10px] font-bold text-slate-400 hover:text-white transition-all cursor-pointer uppercase tracking-widest"
            >
              {isRegistering ? "Já tenho uma conta" : "Não tenho uma conta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
