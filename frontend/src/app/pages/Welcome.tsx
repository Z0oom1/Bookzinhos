import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface WelcomeProps {
  userName: string;
  onComplete: () => void;
}

export function Welcome({ userName, onComplete }: WelcomeProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setStep(1), 500);
    const timer2 = setTimeout(() => setStep(2), 1500);
    const timer3 = setTimeout(() => setStep(3), 2500);
    const timer4 = setTimeout(() => onComplete(), 3600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 overflow-hidden relative select-none bg-gradient-to-tr from-slate-100 via-slate-50 to-indigo-50/20">
      {/* Aurora Ambient Background (Soft Glowing Blobs) */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-rose-200/40 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-violet-200/40 blur-[130px] pointer-events-none" />
      
      {/* Floating Books Background (Subtle Grid) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.06]">
        <div className="absolute top-20 left-10 text-6xl select-none">📚</div>
        <div className="absolute top-40 right-20 text-5xl select-none">🐼</div>
        <div className="absolute bottom-32 left-1/4 text-6xl select-none">📖</div>
        <div className="absolute bottom-20 right-1/3 text-6xl select-none">✨</div>
      </div>

      <div className="w-full max-w-sm relative z-10 transition-all duration-300">
        <div className="bg-white/70 backdrop-blur-2xl rounded-[2.5rem] p-10 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.08)] border border-white relative overflow-hidden flex flex-col items-center text-center space-y-6">
          {/* Top border highlight glow */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-500/20 to-violet-500/20" />

          {/* Glowing Animated Logo Circle */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-rose-450 to-violet-550 rounded-[2.25rem] blur-md opacity-25 animate-pulse" />
            <div className="relative inline-flex items-center justify-center w-28 h-28 bg-white rounded-[2.25rem] shadow-[0_10px_30px_rgba(15,23,42,0.05)] border border-slate-100 p-2 overflow-hidden select-none">
              <img src="/icone.png" alt="myBooks Logo" className="w-full h-full object-contain rounded-2xl animate-pulse" style={{ animationDuration: '2s' }} />
            </div>
          </div>

          <div className="space-y-2 w-full">
            {step >= 1 && (
              <h2 className="text-2xl font-black text-slate-800 tracking-tight animate-scale-in">
                Olá, {userName}!
              </h2>
            )}
            
            {step >= 2 && (
              <p className="text-xs font-semibold text-slate-500 flex items-center justify-center gap-1.5 animate-fade-in">
                <span>Bem-vindo ao seu mundo literário</span>
                <Sparkles className="w-4 h-4 text-rose-500 animate-pulse" />
              </p>
            )}
          </div>

          {/* Progress Bar Loader */}
          {step >= 1 && (
            <div className="w-full pt-4 animate-fade-in">
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                <div 
                  className="h-full bg-gradient-to-r from-rose-500 via-rose-650 to-violet-650 rounded-full transition-all duration-700 ease-out" 
                  style={{ width: `${step === 1 ? 30 : step === 2 ? 70 : 100}%` }}
                />
              </div>
              <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest animate-pulse">
                {step === 1 ? "Iniciando sessão..." : step === 2 ? "Carregando estante..." : "Tudo pronto!"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
