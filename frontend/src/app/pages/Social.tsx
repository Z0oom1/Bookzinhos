import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { fetchAllUsers, fetchNotifications } from "../lib/api";
import { UserProfile, Notifications } from "../lib/types";
import { ArrowLeft, MessageCircle, Users, Award, Sparkles } from "lucide-react";

export function Social() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<Notifications | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [desktopTab, setDesktopTab] = useState("leitores");
  const navigate = useNavigate();
  const myUsername = localStorage.getItem("books-username");

  useEffect(() => {
    async function loadData() {
      try {
        const [usersData, notesData] = await Promise.all([
          fetchAllUsers(),
          fetchNotifications()
        ]);
        
        if (Array.isArray(usersData)) {
          const filtered = usersData.filter(u => 
            u.username.toLowerCase() !== myUsername?.toLowerCase()
          );
          setUsers(filtered);
        }
        setNotifications(notesData);
      } catch (err) {
        console.error("Erro ao carregar aba social:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();

    const interval = setInterval(async () => {
      try {
        const notesData = await fetchNotifications();
        setNotifications(notesData);
      } catch (err) {}
    }, 5000);

    return () => clearInterval(interval);
  }, [myUsername]);

  const desktopSidebarMenu = [
    { key: "leitores", label: "Leitores da Rede", icon: Users, count: users.length },
    { key: "recompensa", label: "Recompensas & Regras", icon: Award, count: null },
  ];

  return (
    <div className="min-h-screen lg:min-h-0 lg:h-full bg-transparent overflow-x-hidden no-scrollbar">
      
      {/* Mobile-only View */}
      <div className="lg:hidden pb-32">
        <div className="bg-white/70 backdrop-blur-xl sticky top-0 z-20 px-4 py-4.5 flex items-center justify-between border-b border-white/60 shadow-sm animate-fade-in">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-all text-[var(--text-main)] border border-slate-100 cursor-pointer"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
            <h1 className="text-xl font-extrabold text-[var(--primary)] tracking-tight">
              Comunidade ✨
            </h1>
          </div>
          <div 
            onClick={() => navigate('/profile')}
            className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-xl shadow-inner cursor-pointer hover:scale-105 transition-transform border border-slate-200/50"
          >
            🐼
          </div>
        </div>

        <div className="p-4 max-w-2xl mx-auto space-y-4 relative z-10">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="w-8 h-8 border-3 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[10px] text-[var(--text-muted)] font-extrabold uppercase tracking-widest animate-pulse">Conectando...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 bg-white/40 rounded-[2rem] border-2 border-dashed border-slate-200">
              <p className="text-xs text-[var(--text-muted)] font-bold">Nenhum outro leitor na rede no momento. 🐾</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {users.map((user) => {
                const unreadCount = notifications?.details?.[user.username.toLowerCase()] || 0;
                return (
                  <div
                    key={user.username}
                    onClick={() => navigate(`/user/${user.username}`)}
                    className="group bg-white/70 hover:bg-white/90 backdrop-blur-xl p-4.5 rounded-[2.25rem] border border-white shadow-[0_8px_30px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.03)] transition-all duration-300 cursor-pointer flex items-center gap-4 active:scale-[0.99]"
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl shadow-inner group-hover:scale-103 transition-transform duration-300 select-none">
                        {user.avatar || "👤"}
                      </div>
                      {unreadCount > 0 && (
                        <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-extrabold w-5.5 h-5.5 rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-bounce">
                          {unreadCount}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-[var(--text-main)] truncate leading-none">
                          {user.username}
                        </h3>
                        {user.pandinhas > 0 && (
                          <span className="bg-[var(--peach)]/20 text-orange-600 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-orange-200/25">
                            🐼 {user.pandinhas}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] font-medium truncate italic mt-1.5">
                        {user.bio || "Escrevendo uma bela história..."}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/chat/${user.username}`);
                        }}
                        className="w-10 h-10 bg-[var(--primary)] rounded-xl flex items-center justify-center shadow-md active:scale-90 transition-all text-white hover:scale-105 cursor-pointer"
                      >
                        <MessageCircle className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 max-w-2xl mx-auto relative z-10">
          <div className="bg-white/60 backdrop-blur-xl p-5 rounded-[2.25rem] border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.01)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-slate-50/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl shadow-inner transform group-hover:rotate-6 transition-transform select-none">
                🐼
              </div>
              <div>
                <h4 className="font-extrabold text-[var(--text-main)] text-xs mb-0.5 uppercase tracking-wide">Pandinhas de Amor</h4>
                <p className="text-[10px] font-bold text-[var(--text-muted)] leading-relaxed">
                  Indique leituras fofas! Se o seu amigo terminar o livro recomendado, ambos ganham um Pandinha na conta!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Widescreen Layout (>=lg) */}
      <div className="hidden lg:flex flex-row h-full min-h-[calc(85vh-3.5rem)] bg-slate-50/10 overflow-hidden no-scrollbar">
        <aside className="w-64 border-r border-slate-100 bg-white p-6 flex flex-col justify-between flex-shrink-0 no-scrollbar">
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Comunidade</h2>
            
            <nav className="space-y-1">
              {desktopSidebarMenu.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => setDesktopTab(item.key)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      desktopTab === item.key
                        ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 opacity-80" />
                      <span>{item.label}</span>
                    </div>
                    {item.count !== null && (
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                        desktopTab === item.key ? "bg-[var(--primary)]/20" : "bg-slate-100"
                      }`}>{item.count}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="flex-1 p-8 overflow-y-auto space-y-8 bg-slate-50/30 no-scrollbar">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Membros da Rede</h1>
              <p className="text-xs text-slate-400 font-bold">Conecte-se e troque indicações de leitura</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-3 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Carregando...</p>
            </div>
          ) : (
            <div className="animate-fade-in">
              {desktopTab === "leitores" && (
                users.length === 0 ? (
                  <div className="text-center py-20 text-slate-400 bg-white/50 border border-slate-100 rounded-3xl">
                    <p className="font-bold text-xs">Nenhum outro leitor na rede no momento.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {users.map((user) => {
                      const unreadCount = notifications?.details?.[user.username.toLowerCase()] || 0;
                      return (
                        <div
                          key={user.username}
                          onClick={() => navigate(`/user/${user.username}`)}
                          className="group bg-white hover:border-[var(--primary)]/30 backdrop-blur-xl p-5 rounded-[2.25rem] border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.01)] hover:shadow-md transition-all duration-300 cursor-pointer flex items-center gap-4 active:scale-[0.99] relative"
                        >
                          <div className="relative flex-shrink-0">
                            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-3xl shadow-inner select-none">
                              {user.avatar || "👤"}
                            </div>
                            {unreadCount > 0 && (
                              <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-bounce">
                                {unreadCount}
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-extrabold text-slate-800 truncate leading-none">
                                {user.username}
                              </h3>
                              {user.pandinhas > 0 && (
                                <span className="bg-orange-50 text-orange-600 text-[8px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-orange-100">
                                  🐼 {user.pandinhas}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-medium truncate mt-1.5 italic">
                              {user.bio || "Escrevendo uma bela história..."}
                            </p>
                          </div>

                          <div className="flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/chat/${user.username}`);
                              }}
                              className="w-10 h-10 bg-[var(--primary)] rounded-xl flex items-center justify-center shadow-sm active:scale-90 transition-all text-white hover:scale-105 cursor-pointer"
                            >
                              <MessageCircle className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {desktopTab === "recompensa" && (
                <div className="max-w-xl mx-auto bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                      🐼
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">Pandinhas de Amor</h3>
                      <p className="text-xs text-slate-400 font-bold">Sistema de Indicações e Pontuações do myBooks</p>
                    </div>
                  </div>
                  
                  <hr className="border-slate-100" />
                  
                  <div className="space-y-4 text-xs font-semibold text-slate-600 leading-relaxed">
                    <p>
                      O **Pandinhas de Amor** é o nosso programa de incentivo à leitura na comunidade. Com ele, você pode indicar seus livros favoritos para outros leitores da rede e acumular conquistas.
                    </p>
                    
                    <h4 className="font-extrabold text-slate-800 uppercase tracking-wide text-[10px] mt-4 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Como ganhar Pandinhas:
                    </h4>
                    <ul className="list-disc list-inside pl-2 space-y-2">
                      <li>Indique leituras fofas pelo chat privado de qualquer amigo da comunidade.</li>
                      <li>Quando seu amigo concluir a leitura do livro que você recomendou, ambos ganham **+1 Pandinha** no perfil!</li>
                      <li>Colecione Pandinhas para demonstrar seu amor por compartilhar histórias.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
