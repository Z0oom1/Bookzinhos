import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ArrowRight, ArrowLeft, Check, X, Eye, EyeOff, ShieldAlert } from "lucide-react";
import {
  login, register, resetPassword, sendEmailCode, verifyEmailCode, checkAvailability,
  loginWithGoogle, fetchServerConfig, type ServerConfig,
} from "../lib/api";
import { notifySessionChanged, saveSession } from "../lib/session";

interface LoginProps {
  onLoginSuccess: (name: string) => void;
  onGuest: () => void;
}

type Mode = "login" | "signup" | "forgot";

/** Emotes que a pessoa pode escolher para representar o perfil. */
const EMOTES = [
  "🐶", "🐱", "🦊", "🐼", "🐨", "🐯", "🦁", "🐸", "🐙", "🦉",
  "🦄", "🐝", "🦋", "🌿", "🌸", "🍄", "⭐", "🌙", "🔥", "🎧",
  "📚", "☕", "✨", "🖤",
];

/** Requisitos da senha — espelho do que o servidor cobra. */
function passwordChecks(pw: string) {
  return {
    min8: pw.length >= 8,
    number: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
}

export function Login({ onLoginSuccess, onGuest }: LoginProps) {
  const [config, setConfig] = useState<ServerConfig | null>(null);

  useEffect(() => {
    fetchServerConfig().then(setConfig).catch(() => setConfig({ googleClientId: null, emailDelivery: false }));
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#efe9dd]">
      {/* Fundo fotográfico */}
      <div className="absolute inset-0 bg-cover bg-center hidden sm:block" style={{ backgroundImage: "url(/login-bg.png)" }} />
      <div className="absolute inset-0 bg-cover bg-center sm:hidden" style={{ backgroundImage: "url(/login-bg-mobile.png)" }} />

      {/* Filtros de imersão: tom da marca, vinheta e brilho central. */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(20,32,18,0.58) 0%, transparent 30%, transparent 52%, rgba(11,16,8,0.66) 100%)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(118% 86% at 50% 47%, transparent 18%, rgba(13,19,10,0.5) 60%, rgba(8,12,6,0.82) 100%)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(44% 40% at 50% 49%, rgba(255,249,236,0.2) 0%, transparent 70%)" }} />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <div className="mb-auth-card w-full max-w-sm p-6 sm:p-7 animate-scale-in">
          <AuthFlow config={config} onLoginSuccess={onLoginSuccess} onGuest={onGuest} />
        </div>
        <button
          onClick={onGuest}
          className="relative z-10 mt-4 text-[12.5px] font-semibold text-white/90 hover:text-white text-center tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)] transition-colors"
        >
          Continuar sem conta →
        </button>
      </div>
    </div>
  );
}

function AuthFlow({ config, onLoginSuccess, onGuest }: { config: ServerConfig | null } & Omit<LoginProps, never>) {
  const [mode, setMode] = useState<Mode>("login");

  const succeed = (username: string) => {
    notifySessionChanged();
    onLoginSuccess(username);
  };

  return (
    <>
      {mode === "login" && <LoginForm config={config} onDone={succeed} onGuest={onGuest} goSignup={() => setMode("signup")} goForgot={() => setMode("forgot")} />}
      {mode === "signup" && <SignupWizard onDone={succeed} goLogin={() => setMode("login")} goForgot={() => setMode("forgot")} />}
      {mode === "forgot" && <ForgotFlow onDone={succeed} goLogin={() => setMode("login")} />}
    </>
  );
}

// ─── Entrar ─────────────────────────────────────────────────────────────────────

function LoginForm({
  config, onDone, onGuest, goSignup, goForgot,
}: {
  config: ServerConfig | null;
  onDone: (u: string) => void;
  onGuest: () => void;
  goSignup: () => void;
  goForgot: () => void;
}) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password) return;
    setBusy(true); setError("");
    try {
      const res = await login(name.trim(), password);
      saveSession(res);
      onDone(res.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro de conexão.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Header title="Bem-vindo de volta" subtitle="Entre para continuar lendo" emoji="📚" />

      <Field label="Usuário ou e-mail">
        <input autoComplete="username" value={name} onChange={(e) => setName(e.target.value)} placeholder="Apelido ou e-mail" className="mb-auth-input" disabled={busy} />
      </Field>

      <Field label="Senha">
        <PasswordInput value={password} onChange={setPassword} show={showPw} onToggle={() => setShowPw((v) => !v)} disabled={busy} autoComplete="current-password" />
      </Field>

      <div className="text-right -mt-1">
        <button type="button" onClick={goForgot} className="text-[12px] font-semibold text-[var(--primary)] hover:underline">
          Esqueci minha senha
        </button>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <button type="submit" disabled={busy || !name.trim() || !password} className="mb-btn mb-btn-primary mb-btn-lg w-full">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Entrar {!busy && <ArrowRight className="w-4 h-4" />}
      </button>

      <GoogleButton config={config} onDone={onDone} setError={setError} />

      <Divider>Primeira vez aqui?</Divider>
      <button type="button" onClick={goSignup} className="mb-btn mb-auth-ghost mb-btn-lg w-full">
        Criar uma conta
      </button>
    </form>
  );
}

// ─── Cadastro passo a passo ──────────────────────────────────────────────────────

const SIGNUP_STEPS = ["Você", "E-mail", "Código", "Senha", "Avatar"];

function SignupWizard({ onDone, goLogin, goForgot }: { onDone: (u: string) => void; goLogin: () => void; goForgot: () => void }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [allowWeak, setAllowWeak] = useState(false);
  const [avatar, setAvatar] = useState("🐶");

  const checks = passwordChecks(password);
  const strong = checks.min8 && checks.number && checks.symbol;
  const canWeak = checks.min8 && !strong; // 8+ mas falta número/símbolo
  const passwordOk = strong || (canWeak && allowWeak);

  const next = () => { setError(""); setStep((s) => s + 1); };
  const back = () => { setError(""); setStep((s) => Math.max(0, s - 1)); };

  // Passo 0 → valida nome + apelido único.
  const submitIdentity = async () => {
    if (fullName.trim().length < 3) return setError("Escreva seu nome completo.");
    if (!/^[a-zA-Z0-9_.]{2,20}$/.test(username.trim())) return setError("Apelido: 2 a 20 letras, números, ponto ou _.");
    setBusy(true); setError("");
    try {
      const av = await checkAvailability({ nickname: username.trim() });
      if (av.nickname && !av.nickname.ok) { setBusy(false); return setError("Este apelido já existe. Escolha outro."); }
      next();
    } catch { setError("Não deu para checar o apelido agora."); }
    finally { setBusy(false); }
  };

  // Passo 1 → email livre + envia código.
  const submitEmail = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("E-mail inválido.");
    setBusy(true); setError("");
    try {
      const av = await checkAvailability({ email: email.trim() });
      if (av.email && !av.email.ok) {
        setBusy(false);
        return setError("Este e-mail já tem conta. Use “Esqueci minha senha”.");
      }
      const res = await sendEmailCode(email.trim().toLowerCase(), "signup");
      setDevCode(res.devCode ?? null);
      next();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o código.");
    } finally { setBusy(false); }
  };

  // Passo 2 → confere o código.
  const submitCode = async () => {
    if (code.trim().length < 6) return setError("Digite o código de 6 dígitos.");
    setBusy(true); setError("");
    try {
      const res = await verifyEmailCode(email.trim().toLowerCase(), code.trim(), "signup");
      if (!res.ok) { setBusy(false); return setError("Código incorreto ou expirado."); }
      next();
    } catch { setError("Não foi possível verificar o código."); }
    finally { setBusy(false); }
  };

  // Passo 4 → cria a conta.
  const finish = async () => {
    setBusy(true); setError("");
    try {
      const res = await register({
        fullName: fullName.trim(), username: username.trim(), email: email.trim().toLowerCase(),
        password, code: code.trim(), avatar, allowWeak,
      });
      saveSession(res);
      onDone(res.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a conta.");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {step > 0 ? (
          <button onClick={back} aria-label="Voltar" className="mb-btn mb-auth-ghost mb-btn-icon mb-btn-sm">
            <ArrowLeft className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={goLogin} aria-label="Voltar ao login" className="mb-btn mb-auth-ghost mb-btn-icon mb-btn-sm">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <Steps total={SIGNUP_STEPS.length} current={step} />
      </div>

      <div>
        <h2 className="text-[19px] font-bold text-[#1b2118]">Criar conta</h2>
        <p className="text-[12.5px] text-[#3a442e]/70">Passo {step + 1} de {SIGNUP_STEPS.length} · {SIGNUP_STEPS[step]}</p>
      </div>

      {step === 0 && (
        <>
          <Field label="Nome completo">
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Como está no documento" className="mb-auth-input" disabled={busy} />
          </Field>
          <Field label="Apelido (@ do perfil)">
            <input value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))} placeholder="ex.: maria.leitora" className="mb-auth-input" disabled={busy} />
            <p className="text-[11.5px] text-[#3a442e]/60 mt-1">2 a 20 caracteres — letras, números, ponto ou _.</p>
          </Field>
          {error && <ErrorNote>{error}</ErrorNote>}
          <NextButton busy={busy} onClick={submitIdentity} disabled={!fullName.trim() || !username.trim()} />
        </>
      )}

      {step === 1 && (
        <>
          <Field label="Seu melhor e-mail">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@gmail.com" className="mb-auth-input" disabled={busy} />
            <p className="text-[11.5px] text-[#3a442e]/60 mt-1">Vamos enviar um código para confirmar que é você.</p>
          </Field>
          {error && <ErrorNote>{error}</ErrorNote>}
          <NextButton busy={busy} onClick={submitEmail} disabled={!email.trim()} label="Enviar código" />
        </>
      )}

      {step === 2 && (
        <>
          <Field label="Código de verificação">
            <input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" className="mb-auth-input tracking-[0.4em] text-center text-lg" disabled={busy} />
            <p className="text-[11.5px] text-[#3a442e]/60 mt-1">Enviado para {email}. Vale por 10 minutos.</p>
            {devCode && (
              <p className="text-[11.5px] font-semibold text-[var(--primary)] mt-1.5">
                Modo teste (sem serviço de e-mail): seu código é {devCode}
              </p>
            )}
          </Field>
          <button type="button" onClick={submitEmail} disabled={busy} className="text-[12px] font-semibold text-[var(--primary)] hover:underline">
            Reenviar código
          </button>
          {error && <ErrorNote>{error}</ErrorNote>}
          <NextButton busy={busy} onClick={submitCode} disabled={code.length < 6} />
        </>
      )}

      {step === 3 && (
        <>
          <Field label="Crie uma senha">
            <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" disabled={busy} />
          </Field>
          <PasswordRules checks={checks} />
          {canWeak && (
            <label className="flex items-start gap-2.5 rounded-xl bg-[#c9741a]/12 border border-[#c9741a]/30 p-3 cursor-pointer">
              <input type="checkbox" checked={allowWeak} onChange={(e) => setAllowWeak(e.target.checked)} className="mt-0.5 accent-[#c9741a]" />
              <span className="text-[12.5px] text-[#5a4620] leading-snug">
                <span className="inline-flex items-center gap-1 font-semibold"><ShieldAlert className="w-3.5 h-3.5" /> Deixar minha conta menos segura</span>
                <br />Aceito usar só os 8 caracteres, sem número ou símbolo.
              </span>
            </label>
          )}
          {error && <ErrorNote>{error}</ErrorNote>}
          <NextButton busy={false} onClick={next} disabled={!passwordOk} />
        </>
      )}

      {step === 4 && (
        <>
          <Field label="Escolha um emote para o seu perfil">
            <div className="grid grid-cols-8 gap-1.5">
              {EMOTES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setAvatar(e)}
                  className={`aspect-square rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer ${
                    avatar === e ? "bg-[var(--primary)] scale-105 shadow-md" : "bg-white/55 hover:bg-white/80"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </Field>
          {error && <ErrorNote>{error}</ErrorNote>}
          <button onClick={finish} disabled={busy} className="mb-btn mb-btn-primary mb-btn-lg w-full">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Criar minha conta
          </button>
        </>
      )}
    </div>
  );
}

// ─── Esqueci minha senha ─────────────────────────────────────────────────────────

function ForgotFlow({ onDone, goLogin }: { onDone: (u: string) => void; goLogin: () => void }) {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [allowWeak, setAllowWeak] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const checks = passwordChecks(password);
  const strong = checks.min8 && checks.number && checks.symbol;
  const canWeak = checks.min8 && !strong;
  const passwordOk = strong || (canWeak && allowWeak);

  const sendCode = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("E-mail inválido.");
    setBusy(true); setError("");
    try {
      const res = await sendEmailCode(email.trim().toLowerCase(), "reset");
      setDevCode(res.devCode ?? null);
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o código.");
    } finally { setBusy(false); }
  };

  const finish = async () => {
    setBusy(true); setError("");
    try {
      const res = await resetPassword(email.trim().toLowerCase(), code.trim(), password, allowWeak);
      saveSession(res);
      onDone(res.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível redefinir a senha.");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={goLogin} className="mb-btn mb-auth-ghost mb-btn-icon mb-btn-sm">
        <ArrowLeft className="w-4 h-4" />
      </button>
      <Header title="Recuperar acesso" subtitle="Enviamos um código para o seu e-mail" emoji="🔑" />

      {step === 0 ? (
        <>
          <Field label="E-mail da conta">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@gmail.com" className="mb-auth-input" disabled={busy} />
          </Field>
          {error && <ErrorNote>{error}</ErrorNote>}
          <NextButton busy={busy} onClick={sendCode} disabled={!email.trim()} label="Enviar código" />
        </>
      ) : (
        <>
          <Field label="Código de verificação">
            <input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" className="mb-auth-input tracking-[0.4em] text-center text-lg" disabled={busy} />
            {devCode && <p className="text-[11.5px] font-semibold text-[var(--primary)] mt-1.5">Modo teste: seu código é {devCode}</p>}
          </Field>
          <Field label="Nova senha">
            <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" disabled={busy} />
          </Field>
          <PasswordRules checks={checks} />
          {canWeak && (
            <label className="flex items-start gap-2.5 rounded-xl bg-[#c9741a]/12 border border-[#c9741a]/30 p-3 cursor-pointer">
              <input type="checkbox" checked={allowWeak} onChange={(e) => setAllowWeak(e.target.checked)} className="mt-0.5 accent-[#c9741a]" />
              <span className="text-[12.5px] text-[#5a4620] leading-snug">
                <span className="font-semibold">Deixar minha conta menos segura</span> — usar só 8 caracteres.
              </span>
            </label>
          )}
          {error && <ErrorNote>{error}</ErrorNote>}
          <button onClick={finish} disabled={busy || code.length < 6 || !passwordOk} className="mb-btn mb-btn-primary mb-btn-lg w-full">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Redefinir e entrar
          </button>
        </>
      )}
    </div>
  );
}

// ─── Peças compartilhadas ─────────────────────────────────────────────────────────

declare global {
  interface Window { google?: any }
}

/** Botão do Google — só aparece se o servidor tiver o client id configurado. */
function GoogleButton({ config, onDone, setError }: { config: ServerConfig | null; onDone: (u: string) => void; setError: (s: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clientId = config?.googleClientId;
    if (!clientId || !ref.current) return;

    const handle = async (response: { credential: string }) => {
      try {
        const res = await loginWithGoogle(response.credential);
        saveSession(res);
        onDone(res.username);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha no login com Google.");
      }
    };

    const render = () => {
      window.google?.accounts.id.initialize({ client_id: clientId, callback: handle });
      if (ref.current) window.google?.accounts.id.renderButton(ref.current, { theme: "outline", size: "large", shape: "pill", width: 300 });
    };

    if (window.google?.accounts?.id) { render(); return; }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = render;
    document.body.appendChild(script);
  }, [config, onDone, setError]);

  if (!config?.googleClientId) return null;
  return (
    <>
      <Divider>ou</Divider>
      <div ref={ref} className="flex justify-center" />
    </>
  );
}

function Header({ title, subtitle, emoji }: { title: string; subtitle: string; emoji: string }) {
  return (
    <div className="flex items-center gap-3.5">
      <span className="w-12 h-12 rounded-2xl bg-white/60 border border-white/70 flex items-center justify-center text-2xl select-none flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        {emoji}
      </span>
      <div className="min-w-0">
        <h2 className="text-[19px] font-bold tracking-tight text-[#1b2118]">{title}</h2>
        <p className="text-[12.5px] text-[#3a442e]/70 truncate">{subtitle}</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-auth-label">{label}</span>
      {children}
    </div>
  );
}

function PasswordInput({
  value, onChange, show, onToggle, disabled, autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  show?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  autoComplete?: string;
}) {
  const [localShow, setLocalShow] = useState(false);
  const visible = show ?? localShow;
  const toggle = onToggle ?? (() => setLocalShow((v) => !v));
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder="••••••••"
        className="mb-auth-input pr-11"
        disabled={disabled}
      />
      <button type="button" onClick={toggle} aria-label={visible ? "Esconder senha" : "Mostrar senha"} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#3a442e]/60 hover:text-[#1b2118] p-1">
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function PasswordRules({ checks }: { checks: { min8: boolean; number: boolean; symbol: boolean } }) {
  const items = [
    { ok: checks.min8, label: "Ao menos 8 caracteres" },
    { ok: checks.number, label: "Um número" },
    { ok: checks.symbol, label: "Um símbolo (@, !, #…)" },
  ];
  return (
    <ul className="space-y-1">
      {items.map((it) => (
        <li key={it.label} className={`flex items-center gap-2 text-[12px] ${it.ok ? "text-[var(--primary)]" : "text-[#3a442e]/60"}`}>
          {it.ok ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
          {it.label}
        </li>
      ))}
    </ul>
  );
}

function Steps({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex-1 flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= current ? "bg-[var(--primary)]" : "bg-[#3a442e]/18"}`} />
      ))}
    </div>
  );
}

function NextButton({ busy, onClick, disabled, label = "Continuar" }: { busy: boolean; onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button onClick={onClick} disabled={busy || disabled} className="mb-btn mb-btn-primary mb-btn-lg w-full">
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {label} {!busy && <ArrowRight className="w-4 h-4" />}
    </button>
  );
}

function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-0.5">
      <span className="h-px flex-1 bg-[#3a442e]/20" />
      <span className="text-[11.5px] text-[#3a442e]/70">{children}</span>
      <span className="h-px flex-1 bg-[#3a442e]/20" />
    </div>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-[12.5px] font-semibold text-[#8a1c28] bg-[#de5560]/15 border border-[#de5560]/30 rounded-xl px-3.5 py-2.5">
      {children}
    </p>
  );
}
