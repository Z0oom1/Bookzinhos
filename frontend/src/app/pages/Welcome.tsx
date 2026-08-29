import { useEffect } from "react";

interface WelcomeProps {
  userName: string;
  onComplete: () => void;
}

const BARS = [
  { h: 46, from: "#FF7A9C", to: "#E11D48" },
  { h: 62, from: "#FFD1A8", to: "#F97316" },
  { h: 54, from: "#A78BFA", to: "#6D28D9" },
  { h: 68, from: "#7DD3FC", to: "#0284C7" },
];

/**
 * Saudação curta logo após entrar. A versão anterior segurava a tela por quase
 * quatro segundos — aqui é só o tempo de a estante carregar em segundo plano.
 */
export function Welcome({ userName, onComplete }: WelcomeProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1300);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 select-none">
      <div className="text-center animate-scale-in">
        <div className="flex items-end justify-center gap-2 h-[72px]">
          {BARS.map((b, i) => (
            <span
              key={i}
              className="w-[16px] rounded-[5px] shadow-[0_8px_18px_-8px_rgba(0,0,0,.5)]"
              style={{
                height: b.h,
                background: `linear-gradient(180deg, ${b.from}, ${b.to})`,
                animation: `mb-shelf-bounce 1.05s ${i * 0.12}s cubic-bezier(.45,.05,.35,1) infinite`,
              }}
            />
          ))}
        </div>
        <span className="block w-[92px] h-[5px] rounded-full bg-[var(--surface-3)] mx-auto mt-2" />

        <h2 className="text-[26px] font-bold tracking-tight mt-7">
          Olá, <span className="mb-gradient-text">{userName}</span>!
        </h2>
        <p className="text-[13.5px] text-[var(--text-3)] mt-1.5">Arrumando a sua estante…</p>
      </div>
    </div>
  );
}
