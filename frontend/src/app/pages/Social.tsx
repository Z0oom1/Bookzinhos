import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { fetchAllUsers, fetchNotifications } from "../lib/api";
import { UserProfile, Notifications } from "../lib/types";
import { ArrowLeft, MessageCircle } from "lucide-react";

export function Social() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<Notifications | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  return (
    <div className="min-h-screen bg-[var(--bg-pastel)] pb-24 relative overflow-hidden">
      
      {/* Elementos Decorativos */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[var(--lavender)]/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-[var(--blush)]/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 pointer-events-none" />
      
      {/* Cabeçalho */}
      <div className="bg-white/70 backdrop-blur-xl sticky top-0 z-20 px-4 py-4 flex items-center justify-between border-b border-white/60 shadow-sm animate-fade-in">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-all text-[var(--text-main)] border border-[var(--lavender)]/20"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <h1 className="text-xl font-black text-[var(--text-main)] bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary)] to-[var(--lavender)]">
            Comunidade ✨
          </h1>
        </div>
        <div 
          onClick={() => navigate('/profile')}
          className="w-9 h-9 bg-gradient-to-br from-[var(--lavender)]/30 to-[var(--blush)]/30 rounded-xl flex items-center justify-center text-xl shadow-inner cursor-pointer hover:scale-105 transition-transform border border-white"
        >
          🐼
        </div>
      </div>

      {/* Lista de Leitores */}
      <div className="p-4 max-w-2xl mx-auto space-y-4 relative z-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-3 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-[var(--text-muted)] font-black uppercase tracking-widest animate-pulse">Conectando...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 bg-white/40 rounded-3xl border-2 border-dashed border-[var(--lavender)]/30">
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
                  className="group bg-white/70 hover:bg-white/95 backdrop-blur-sm p-4 rounded-[2rem] border border-white shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex items-center gap-4 active:scale-[0.99]"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--lavender)]/20 to-[var(--blush)]/20 flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform duration-300">
                      {user.avatar || "👤"}
                    </div>
                    {unreadCount > 0 && (
                      <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-5.5 h-5.5 rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-bounce">
                        {unreadCount}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-[var(--text-main)] truncate">
                        {user.username}
                      </h3>
                      {user.pandinhas > 0 && (
                        <span className="bg-[var(--peach)]/20 text-[var(--peach)] text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 border border-[var(--peach)]/20">
                          🐼 {user.pandinhas}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] truncate italic mt-0.5">
                      {user.bio || "Escrevendo uma bela história..."}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/chat/${user.username}`);
                      }}
                      className="w-10 h-10 bg-gradient-to-r from-[var(--primary)] to-[var(--lavender)] rounded-xl flex items-center justify-center shadow-md active:scale-90 transition-all text-white hover:scale-105"
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

      {/* Caixa de Regras/Recompensas */}
      <div className="p-4 max-w-2xl mx-auto relative z-10">
        <div className="bg-white/50 backdrop-blur-xl p-5 rounded-[2rem] border border-white shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--blush)]/5 to-[var(--lavender)]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-gradient-to-br from-[var(--peach)]/20 to-[var(--blush)]/20 rounded-xl flex items-center justify-center text-2xl shadow-inner transform group-hover:rotate-6 transition-transform">
              🐼
            </div>
            <div>
              <h4 className="font-black text-[var(--text-main)] text-sm mb-0.5">Pandinhas de Amor</h4>
              <p className="text-[10px] font-bold text-[var(--text-muted)] leading-normal">
                Indique leituras fofas! Se o seu amigo terminar o livro recomendado, ambos ganham um Pandinha na conta!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
