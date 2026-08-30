import { useEffect, useMemo, useState } from "react";
import { Loader2, ArrowRight } from "lucide-react";
import { login, register, fetchAllUsers } from "../lib/api";
import { notifySessionChanged, saveSession } from "../lib/session";
import type { UserProfile } from "../lib/types";

interface LoginProps {
  onLoginSuccess: (name: string) => void;
}

/**
 * Tela de entrada.
 *
 * O fundo é a fotografia da cena de leitura (uma arte para telas largas, outra
 * para o celular), e o formulário flutua por cima num cartão de vidro líquido:
 * à direita no desktop, junto à mesa; embaixo no celular, sobre a parte mais
 * escura da foto, onde o texto fica legível. A marca já está na própria
 * fotografia, então o cartão fica enxuto.
 */
export function Login({ onLoginSuccess }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [usersList, setUsersList] = useState<UserProfile[]>([]);

  useEffect(() => {
    fetchAllUsers()
      .then((u) => setUsersList(u || []))
      .catch(() => setUsersList([]));
  }, []);

  // Mostra o avatar da conta assim que o nome digitado bate com alguém.
  const matchedUser = useMemo(
    () => usersList.find((u) => u.username.trim().toLowerCase() === name.trim().toLowerCase()),
    [usersList, name]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const res = isRegistering
        ? await register(name.trim(), password.trim())
        : await login(name.trim(), password.trim());

      saveSession(res);
      notifySessionChanged();
      onLoginSuccess(res.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro de conexão.");
      setIsLoading(false);
    }
  };

  const canSubmit = !!name.trim() && !!password.trim() && !isLoading;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#efe9dd]">
      {/* ── Fundo fotográfico ─────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 bg-cover bg-center hidden sm:block"
        style={{ backgroundImage: "url(/login-bg.png)" }}
      />
      <div
        className="absolute inset-0 bg-cover bg-center sm:hidden"
        style={{ backgroundImage: "url(/login-bg-mobile.png)" }}
      />

      {/* ── Filtros de imersão ────────────────────────────────────────────────
          Três camadas de degradê dão profundidade e puxam o olhar para o
          centro, onde fica o login:
          1. um tom verde da marca, de cima para baixo;
          2. uma vinheta que escurece as bordas e mantém o centro limpo;
          3. um brilho radial atrás do cartão, para ele "saltar" da foto. */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, rgba(20,32,18,0.58) 0%, transparent 30%, transparent 52%, rgba(11,16,8,0.66) 100%)" }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(118% 86% at 50% 47%, transparent 18%, rgba(13,19,10,0.5) 60%, rgba(8,12,6,0.82) 100%)" }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(44% 40% at 50% 49%, rgba(255,249,236,0.2) 0%, transparent 70%)" }}
      />

      {/* ── Cartão de vidro ───────────────────────────────────────────────── */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <div className="mb-auth-card w-full max-w-sm p-6 sm:p-8 animate-scale-in">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3.5">
              <span className="w-12 h-12 rounded-2xl bg-white/60 border border-white/70 flex items-center justify-center text-2xl select-none flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                {matchedUser ? matchedUser.avatar || "👤" : "📚"}
              </span>
              <div className="min-w-0">
                <h2 className="text-[19px] font-bold tracking-tight text-[#1b2118]">
                  {isRegistering ? "Criar conta" : matchedUser ? `Olá de novo!` : "Bem-vindo de volta"}
                </h2>
                <p className="text-[12.5px] text-[#3a442e]/70 truncate">
                  {isRegistering
                    ? "Leva menos de um minuto"
                    : matchedUser
                    ? `Entrando como ${matchedUser.username}`
                    : "Entre para continuar lendo"}
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="login-user" className="mb-auth-label">Usuário</label>
              <input
                id="login-user"
                type="text"
                autoComplete="username"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como te chamam por aqui"
                className="mb-auth-input"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="login-pass" className="mb-auth-label">Senha</label>
              <input
                id="login-pass"
                type="password"
                autoComplete={isRegistering ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mb-auth-input"
                disabled={isLoading}
              />
            </div>

            {error && (
              <p role="alert" className="text-[12.5px] font-semibold text-[#8a1c28] bg-[#de5560]/15 border border-[#de5560]/30 rounded-xl px-3.5 py-2.5">
                {error}
              </p>
            )}

            <button type="submit" disabled={!canSubmit} className="mb-btn mb-btn-primary mb-btn-lg w-full">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isRegistering ? "Criar minha conta" : "Entrar"}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-3 pt-0.5">
              <span className="h-px flex-1 bg-[#3a442e]/20" />
              <span className="text-[11.5px] text-[#3a442e]/70">
                {isRegistering ? "Já faz parte?" : "Primeira vez aqui?"}
              </span>
              <span className="h-px flex-1 bg-[#3a442e]/20" />
            </div>

            <button
              type="button"
              onClick={() => { setIsRegistering((v) => !v); setError(""); }}
              disabled={isLoading}
              className="mb-btn mb-auth-ghost mb-btn-lg w-full"
            >
              {isRegistering ? "Entrar na minha conta" : "Criar uma conta"}
            </button>
          </form>
        </div>

        <p className="relative z-10 mt-5 text-[12.5px] text-white/85 text-center tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
          Entre páginas, a vida acontece.
        </p>
      </div>
    </div>
  );
}
