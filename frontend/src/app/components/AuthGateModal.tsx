import { useEffect, useState } from "react";
import { Lock, LogIn, Sparkles } from "lucide-react";
import { AUTH_GATE_EVENT } from "../lib/authGate";
import { leaveGuestMode } from "../lib/session";
import { Modal } from "./Ui";

/**
 * Convite para entrar, disparado quando um visitante tenta uma ação bloqueada.
 *
 * Fica montado uma vez na casca do app e escuta o evento global do portão.
 * O botão principal encerra o modo visitante — a AuthWrapper então mostra a
 * tela de entrada.
 */
export function AuthGateModal() {
  const [reason, setReason] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onGate = (e: Event) => {
      const detail = (e as CustomEvent).detail as { reason?: string } | undefined;
      setReason(detail?.reason ?? null);
      setOpen(true);
    };
    window.addEventListener(AUTH_GATE_EVENT, onGate);
    return () => window.removeEventListener(AUTH_GATE_EVENT, onGate);
  }, []);

  return (
    <Modal open={open} onClose={() => setOpen(false)} size="sm">
      <div className="text-center px-1 py-1">
        <span className="mx-auto mb-badge-icon w-14 h-14 rounded-[20px]" style={{ background: "linear-gradient(140deg, var(--primary), var(--primary-deep))" }}>
          <Lock className="w-6 h-6" />
        </span>

        <h2 className="text-[20px] font-bold text-foreground mt-4">
          {reason ? `Entre para ${reason}` : "Entre para continuar"}
        </h2>
        <p className="text-[13.5px] text-[var(--text-2)] leading-relaxed mt-2 max-w-xs mx-auto">
          Você está navegando como visitante. Ler, baixar, comentar e conversar
          com outros leitores é só criar uma conta — leva menos de um minuto.
        </p>

        <ul className="text-left text-[13px] text-[var(--text-2)] max-w-xs mx-auto mt-4 space-y-2">
          {["Leia e baixe os livros do acervo", "Avalie e comente com a comunidade", "Siga leitores e acompanhe o feed"].map((t) => (
            <li key={t} className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />
              {t}
            </li>
          ))}
        </ul>

        <button
          onClick={() => { setOpen(false); leaveGuestMode(); }}
          className="mb-btn mb-btn-primary mb-btn-lg w-full mt-6"
        >
          <LogIn className="w-4 h-4" /> Entrar ou criar conta
        </button>
        <button onClick={() => setOpen(false)} className="mb-btn mb-btn-ghost w-full mt-1.5">
          Continuar só olhando
        </button>
      </div>
    </Modal>
  );
}
