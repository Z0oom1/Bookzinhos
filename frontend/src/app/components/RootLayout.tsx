import { Outlet, useLocation, Link } from "react-router";
import { Home, Library, Heart, PenLine, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchNotifications } from "../lib/api";

export function RootLayout() {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function checkNotifications() {
      try {
        const data = await fetchNotifications();
        setUnreadCount(data.unreadCount);
      } catch (err) {}
    }
    
    checkNotifications();
    const interval = setInterval(checkNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { path: "/", icon: Home, label: "Início" },
    { path: "/library", icon: Library, label: "Livros" },
    { path: "/social", icon: Users, label: "Social", badge: unreadCount },
    { path: "/my-books", icon: Heart, label: "Amei" },
    { path: "/notes", icon: PenLine, label: "Notas" },
    { path: "/profile", icon: User, label: "Eu" },
  ];

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-6">
        <div className="bg-white/90 backdrop-blur-3xl border border-white/40 shadow-[0_15px_40px_rgba(0,0,0,0.12)] rounded-[2.5rem] h-20 max-w-lg mx-auto flex items-center justify-between px-2">
          {navItems.map(({ path, icon: Icon, label, badge }) => (
            <Link
              key={path}
              to={path}
              className="flex-1 flex flex-col items-center justify-center relative h-full transition-all active:scale-90"
            >
              <div className={`relative flex items-center justify-center p-2 rounded-2xl transition-all duration-300 ${isActive(path) ? "bg-[var(--lavender)]/10" : ""}`}>
                <Icon
                  className={`w-6 h-6 transition-all duration-300 ${
                    isActive(path)
                      ? "text-[var(--lavender)] scale-110 drop-shadow-[0_0_8px_rgba(182,166,238,0.5)]"
                      : "text-[var(--text-muted)] opacity-50"
                  }`}
                />
                
                {/* Badge de Notificações */}
                {badge && badge > 0 ? (
                  <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm px-1 z-10 animate-in zoom-in duration-300">
                    {badge > 99 ? "99+" : badge}
                  </div>
                ) : (
                  isActive(path) && (
                    <div className="absolute -bottom-1 w-1 h-1 bg-[var(--lavender)] rounded-full shadow-[0_0_8px_var(--lavender)]" />
                  )
                )}
              </div>
              <span
                className={`text-[8px] font-black mt-1 transition-all duration-300 uppercase tracking-tighter ${
                  isActive(path)
                    ? "text-[var(--text-main)] opacity-100"
                    : "text-[var(--text-muted)] opacity-0 -translate-y-1"
                }`}
              >
                {label}
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
