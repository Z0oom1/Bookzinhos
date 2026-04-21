import { RouterProvider } from "react-router";
import { router } from "./routes";
import { useEffect } from "react";
import { syncOfflineQueue } from "./lib/api";

export default function App() {
  useEffect(() => {
    // Sincroniza fila offline quando o app volta a ter conexão
    const handleOnline = () => {
      syncOfflineQueue();
    };
    window.addEventListener("online", handleOnline);
    // Tenta sincronizar ao abrir
    if (navigator.onLine) syncOfflineQueue();
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return <RouterProvider router={router} />;
}