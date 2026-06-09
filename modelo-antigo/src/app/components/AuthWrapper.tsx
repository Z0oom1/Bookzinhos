import { useState, useEffect } from "react";
import { Outlet } from "react-router";
import { Login } from "../pages/Login";
import { Welcome } from "../pages/Welcome";
import { LoadingSpinner } from "./LoadingSpinner";

export function AuthWrapper() {
  const [user, setUser] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("books-username");
    if (savedUser) {
      setUser(savedUser);
    }
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = (username: string) => {
    setUser(username);
    setShowWelcome(true);
  };

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (showWelcome) {
    return <Welcome userName={user} onComplete={handleWelcomeComplete} />;
  }

  return <Outlet />;
}
