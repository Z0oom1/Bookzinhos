import { useEffect, useState } from "react";
import { Sparkles, Heart } from "lucide-react";

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
    const timer4 = setTimeout(() => onComplete(), 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--peach)] via-[var(--lavender)] to-[var(--mint)] flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {step >= 1 && (
          <>
            <div className="absolute top-1/4 left-1/4 text-6xl animate-bounce-in">
              ✨
            </div>
            <div className="absolute top-1/3 right-1/4 text-6xl animate-bounce-in" style={{ animationDelay: "0.1s" }}>
              📚
            </div>
            <div className="absolute bottom-1/3 left-1/3 text-6xl animate-bounce-in" style={{ animationDelay: "0.2s" }}>
              🐼
            </div>
            <div className="absolute bottom-1/4 right-1/3 text-6xl animate-bounce-in" style={{ animationDelay: "0.3s" }}>
              💕
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl animate-bounce-in" style={{ animationDelay: "0.4s" }}>
              🌟
            </div>
          </>
        )}
      </div>

      {/* Welcome Message */}
      <div className="relative z-10 text-center space-y-8">
        {step >= 1 && (
          <div className="animate-bounce-in">
            <h1 className="text-6xl mb-4">
              Olá, {userName}!
            </h1>
          </div>
        )}

        {step >= 2 && (
          <div className="animate-scale-in flex items-center justify-center gap-3">
            <Heart className="w-8 h-8 text-white fill-white animate-pulse-soft" />
            <p className="text-2xl text-white/90">
              Bem-vinda ao seu mundo literário
            </p>
            <Sparkles className="w-8 h-8 text-white animate-pulse-soft" style={{ animationDelay: "0.5s" }} />
          </div>
        )}

        {step >= 3 && (
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/30 backdrop-blur-md rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <p className="text-white">Preparando sua biblioteca...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
