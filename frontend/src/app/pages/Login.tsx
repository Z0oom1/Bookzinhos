import { useEffect, useMemo, useState } from "react";
import { Loader2, ArrowRight, Star, Users, BookOpen } from "lucide-react";
import { login, register, fetchAllUsers } from "../lib/api";
import { notifySessionChanged, saveSession } from "../lib/session";
import type { UserProfile } from "../lib/types";

interface LoginProps {
  onLoginSuccess: (name: string) => void;
}

/** Lombadas decorativas do painel de apresentação. */
const SHELF = [
  { h: 132, from: "#FF7A9C", to: "#E11D48" },
  { h: 168, from: "#FFD1A8", to: "#F97316" },
  { h: 150, from: "#A78BFA", to: "#6D28D9" },
  { h: 186, from: "#7DD3FC", to: "#0284C7" },
  { h: 142, from: "#6EE7B7", to: "#059669" },
  { h: 164, from: "#FDA4AF", to: "#BE123C" },
];

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
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-5xl grid lg:grid-cols-[1.05fr_1fr] gap-5 items-stretch">
        {/* ── Apresentação ─────────────────────────────────────────────────── */}
        <section className="mb-hero hidden lg:flex flex-col justify-between p-9 min-h-[560px] animate-scale-in">
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="" className="w-11 h-11 rounded-xl" />
              <span className="text-[19px] font-bold tracking-tight">myBooks</span>
            </div>

            <h1 className="text-[38px] leading-[1.08] font-bold tracking-tight mt-9">
              Sua estante<br />tem gente dentro.
            </h1>
            <p className="text-white/80 text-[15px] leading-relaxed mt-4 max-w-sm">
              Leia, dê sua nota, comente com outros leitores e descubra o que a
              comunidade está devorando agora.
            </p>

            <ul className="mt-8 space-y-3.5">
              {[
                { icon: BookOpen, text: "Acervo compartilhado, com leitor próprio" },
                { icon: Star, text: "Resenhas, notas e conversas em cada livro" },
                { icon: Users, text: "Siga leitores e acompanhe o feed" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-[14px] text-white/90">
                  <span className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Estante decorativa */}
          <div className="relative z-10 mt-10">
            <div className="flex items-end gap-1.5 h-[190px]">
              {SHELF.map((b, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-t-[5px] rounded-b-[2px] shadow-[0_10px_24px_-12px_rgba(0,0,0,.7)]"
                  style={{
                    height: b.h,
                    background: `linear-gradient(180deg, ${b.from}, ${b.to})`,
                    animation: `mb-fade-up .6s ${i * 70}ms both`,
                  }}
                />
              ))}
            </div>
            <div className="h-[7px] rounded-full bg-white/85 mt-1" />
            <div className="h-[4px] rounded-full bg-black/20 mt-[1px]" />
          </div>
        </section>

        {/* ── Formulário ───────────────────────────────────────────────────── */}
        <section className="flex items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="text-center lg:hidden mb-7">
              <img src="/logo.svg" alt="" className="w-16 h-16 mx-auto rounded-2xl shadow-[var(--shadow-2)]" />
              <h1 className="text-[22px] font-bold tracking-tight mb-gradient-text mt-3.5">myBooks</h1>
            </div>

            <form onSubmit={handleSubmit} className="mb-card p-6 sm:p-7 space-y-4 animate-fade-in">
              <div className="flex items-center gap-3.5 pb-1">
                <span className="w-12 h-12 rounded-2xl bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-2xl select-none flex-shrink-0">
                  {matchedUser ? matchedUser.avatar || "👤" : "📚"}
                </span>
                <div className="min-w-0">
                  <h2 className="text-[17px] font-bold text-foreground">
                    {isRegistering ? "Criar conta" : matchedUser ? `Olá de novo, ${matchedUser.username}` : "Entrar"}
                  </h2>
                  <p className="text-[12.5px] text-[var(--text-3)] truncate">
                    {isRegistering ? "Leva menos de um minuto" : "Continue de onde parou"}
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="login-user" className="mb-label">Usuário</label>
                <input
                  id="login-user"
                  type="text"
                  autoComplete="username"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como te chamam por aqui"
                  className="mb-input"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="login-pass" className="mb-label">Senha</label>
                <input
                  id="login-pass"
                  type="password"
                  autoComplete={isRegistering ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mb-input"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <p role="alert" className="text-[12.5px] font-semibold text-[var(--destructive)] bg-[var(--destructive)]/10 rounded-xl px-3.5 py-2.5">
                  {error}
                </p>
              )}

              <button type="submit" disabled={!canSubmit} className="mb-btn mb-btn-primary mb-btn-lg w-full">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isRegistering ? "Criar minha conta" : "Entrar"}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>

              <div className="flex items-center gap-3 pt-1">
                <span className="h-px flex-1 bg-[var(--line)]" />
                <span className="text-[11.5px] text-[var(--text-3)]">
                  {isRegistering ? "Já faz parte?" : "Primeira vez aqui?"}
                </span>
                <span className="h-px flex-1 bg-[var(--line)]" />
              </div>

              <button
                type="button"
                onClick={() => { setIsRegistering((v) => !v); setError(""); }}
                disabled={isLoading}
                className="mb-btn mb-btn-outline w-full"
              >
                {isRegistering ? "Entrar na minha conta" : "Criar uma conta"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
