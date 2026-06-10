import { Outlet, useLocation, Link } from "react-router";
import { Home, Library, Heart, PenLine, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchNotifications } from "../lib/api";

export function RootLayout() {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [userAvatar, setUserAvatar] = useState("🐼");
  const [currentDateString, setCurrentDateString] = useState("");

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

  useEffect(() => {
    const avatar = localStorage.getItem("books-avatar") || "🐼";
    setUserAvatar(avatar);

    const date = new Date();
    const formatted = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    setCurrentDateString(formatted);
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { path: "/", icon: Home, label: "Início", desktopLabel: "Home" },
    { path: "/library", icon: Library, label: "Livros", desktopLabel: "Biblioteca" },
    { path: "/social", icon: Users, label: "Social", badge: unreadCount, desktopLabel: "Social" },
    { path: "/my-books", icon: Heart, label: "Amei", desktopLabel: "Amei" },
    { path: "/notes", icon: PenLine, label: "Notas", desktopLabel: "Notinhas" },
  ];

  const isChat = location.pathname.startsWith("/chat/");
  const hideNav = new URLSearchParams(location.search).get("hideNav") === "true" || isChat;

  if (hideNav) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-100 p-0 lg:p-8 bg-gradient-to-tr lg:from-[#1e3a8a]/90 lg:via-[#3b82f6]/80 lg:to-[#ec4899]/70">
        <div className="w-full max-w-lg lg:max-w-6xl h-screen lg:h-[85vh] flex flex-col bg-background relative overflow-hidden shadow-2xl border-x lg:border border-slate-200/40 lg:rounded-3xl">
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile-only View */}
      <div className="lg:hidden flex justify-center items-center min-h-screen bg-slate-100">
        <div className="w-full max-w-lg h-screen flex flex-col bg-background relative overflow-hidden shadow-2xl border-x border-slate-200/40">
          <main className="flex-1 overflow-y-auto pb-32">
            <Outlet />
          </main>

          <nav className="absolute bottom-0 left-0 right-0 z-50 px-2 pb-6">
            <div className="bg-white/90 backdrop-blur-3xl border border-white/40 shadow-[0_15px_40px_rgba(0,0,0,0.12)] rounded-[2.5rem] h-20 flex items-center justify-between px-2">
              {[...navItems, { path: "/profile", icon: User, label: "Eu" }].map(({ path, icon: Icon, label, badge }) => (
                <Link
                  key={path}
                  to={path}
                  className="flex-1 flex flex-col items-center justify-center relative h-full transition-all active:scale-90"
                >
                  <div className={`relative flex items-center justify-center p-2 rounded-2xl transition-all duration-300 ${isActive(path) ? "bg-[var(--primary)]/10" : ""}`}>
                    <Icon
                      className={`w-6 h-6 transition-all duration-300 ${
                        isActive(path)
                          ? "text-[var(--primary)] scale-110 drop-shadow-[0_0_8px_rgba(243,168,184,0.4)]"
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
                        <div className="absolute -bottom-1 w-1 h-1 bg-[var(--primary)] rounded-full shadow-[0_0_8px_var(--primary)]" />
                      )
                    )}
                  </div>
                  <span
                    className={`text-[8px] font-black mt-1 transition-all duration-300 uppercase tracking-tighter ${
                      isActive(path)
                        ? "text-[var(--primary)] opacity-100"
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
      </div>

      {/* Desktop-only View */}
      <div className="hidden lg:flex items-center justify-center w-screen h-screen bg-gradient-to-tr from-[#1e3a8a] via-[#3b82f6] to-[#ec4899] p-8 overflow-hidden select-none">
        <div className="w-full max-w-6xl h-[85vh] bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-white/20 flex flex-col overflow-hidden backdrop-blur-xl">
          {/* Top Header/Navbar */}
          <header className="h-14 border-b border-slate-100 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 flex-shrink-0">
            {/* Left: macOS Dots & Title */}
            <div className="flex items-center gap-4">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] hover:opacity-80 transition-opacity cursor-pointer" />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] hover:opacity-80 transition-opacity cursor-pointer" />
                <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] hover:opacity-80 transition-opacity cursor-pointer" />
              </div>
              <span className="text-xs font-bold text-slate-400">Bookzinhos da Helo</span>
            </div>

            {/* Center: Tabs navigation */}
            <nav className="flex items-center gap-1.5">
              {navItems.map(({ path, desktopLabel, badge }) => (
                <Link
                  key={path}
                  to={path}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all relative ${
                    isActive(path)
                      ? "bg-slate-100 text-slate-800"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <span>{desktopLabel}</span>
                  {badge && badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5">
                      {badge}
                    </span>
                  )}
                </Link>
              ))}
            </nav>

            {/* Right: Date, Profile Avatar */}
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-500">{currentDateString}</span>
              <Link
                to="/profile"
                className={`w-8 h-8 rounded-full bg-slate-50 overflow-hidden border flex items-center justify-center text-base hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                  isActive("/profile") ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/10" : "border-slate-200"
                }`}
              >
                {userAvatar}
              </Link>
            </div>
          </header>

          {/* Page Contents */}
          <main className="flex-1 overflow-y-auto bg-slate-50/20">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}
