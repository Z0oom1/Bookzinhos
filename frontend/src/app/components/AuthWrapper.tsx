import { useState, useEffect } from "react";
import { Outlet } from "react-router";
import { Login } from "../pages/Login";
import { Welcome } from "../pages/Welcome";
import { LoadingSpinner } from "./LoadingSpinner";
import { getUsername, isGuest, enterGuestMode } from "../lib/session";

/**
 * Porta de entrada do app.
 *
 * Três estados: com conta (mostra o app), visitante (também mostra o app, mas
 * as ações ficam bloqueadas pelo portão) e deslogado (mostra a tela de entrada).
 * Reage a mudanças de sessão para que entrar ou sair troque a tela na hora.
 */
export function AuthWrapper() {
  const [user, setUser] = useState<string | null>(getUsername);
  const [guest, setGuest] = useState<boolean>(isGuest);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUser(getUsername());
    setGuest(isGuest());
    setIsLoading(false);

    const sync = () => {
      setUser(getUsername());
      setGuest(isGuest());
    };
    window.addEventListener("mybooks:session", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("mybooks:session", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const handleLoginSuccess = (username: string) => {
    setUser(username);
    setGuest(false);
    setShowWelcome(true);
  };

  if (isLoading) return <LoadingSpinner />;

  if (user) {
    if (showWelcome) return <Welcome userName={user} onComplete={() => setShowWelcome(false)} />;
    return <Outlet />;
  }

  // Visitante: vê o app, mas o portão barra ler, comentar e o social.
  if (guest) return <Outlet />;

  return (
    <Login
      onLoginSuccess={handleLoginSuccess}
      onGuest={() => { enterGuestMode(); setGuest(true); }}
    />
  );
}
