import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { fetchAllUsers, fetchNotifications } from "../lib/api";
import { UserProfile, Notifications } from "../lib/types";
import { ArrowLeft, MessageCircle, User as UserIcon } from "lucide-react";

export function Social() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<Notifications | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const myUsername = localStorage.getItem("books-username");

  useEffect(() => {
    async function loadData() {
      try {
        console.log("Carregando usuários...");
        const [usersData, notesData] = await Promise.all([
          fetchAllUsers(),
          fetchNotifications()
        ]);
        console.log("Usuários recebidos:", usersData);
        
        if (Array.isArray(usersData)) {
          // Remove self from list (case-insensitive)
          const filtered = usersData.filter(u => 
            u.username.toLowerCase() !== myUsername?.toLowerCase()
          );
          setUsers(filtered);
        } else {
          console.warn("usersData não é um array:", usersData);
          setUsers([]);
        }
        
        setNotifications(notesData);
      } catch (err) {
        console.error("Erro ao carregar social:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();

    // Poll for notifications
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
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[var(--lavender)]/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-[var(--blush)]/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
      
      <div className="bg-white/70 backdrop-blur-xl sticky top-0 z-20 px-4 py-4 flex items-center justify-between border-b border-white/60 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-all text-[var(--text-main)] border border-[var(--lavender)]/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-black text-[var(--text-main)] bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary)] to-[var(--lavender)]">Social ✨</h1>
        </div>
        <div className="w-10 h-10 bg-gradient-to-br from-[var(--lavender)]/30 to-[var(--blush)]/30 rounded-2xl flex items-center justify-center text-xl shadow-inner cursor-pointer" onClick={() => navigate('/profile')}>
          🐼
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6 relative z-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-[var(--lavender)] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[var(--text-muted)] animate-pulse">Procurando leitores...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20 bg-white/40 rounded-3xl border-2 border-dashed border-[var(--lavender)]/30">
            <p className="text-[var(--text-muted)]">Nenhum outro leitor encontrado ainda. 🐾</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {users.map((user) => {
              const unreadCount = notifications?.details?.[user.username] || 0;
              return (
                <div
                  key={user.username}
                  onClick={() => navigate(`/user/${user.username}`)}
                  className="group bg-white/60 hover:bg-white/90 backdrop-blur-sm p-4 rounded-[2rem] border-2 border-[var(--lavender)]/20 hover:border-[var(--blush)]/40 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer flex items-center gap-4 active:scale-[0.98]"
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--lavender)]/30 to-[var(--blush)]/30 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform duration-300">
                      {user.avatar || "👤"}
                    </div>
                    {unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-[var(--blush)] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-bounce">
                        {unreadCount}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-[var(--text-main)] truncate">
                        {user.username}
                      </h3>
                      {user.pandinhas > 0 && (
                        <span className="bg-[var(--peach)]/20 text-[var(--peach)] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-[var(--peach)]/30">
                          🐼 {user.pandinhas}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--text-muted)] truncate italic">
                      {user.bio || "Leitor misterioso..."}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/chat/${user.username}`);
                      }}
                      className="w-12 h-12 bg-gradient-to-r from-[var(--lavender)] to-[var(--sky)] rounded-2xl flex items-center justify-center shadow-md hover:shadow-lg active:scale-95 transition-all text-white group-hover:scale-110"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recompensas / Info */}
      <div className="p-4 max-w-2xl mx-auto relative z-10 mt-4">
        <div className="bg-white/60 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--blush)]/10 to-[var(--lavender)]/10 opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 bg-gradient-to-br from-[var(--peach)]/30 to-[var(--blush)]/30 rounded-2xl flex items-center justify-center text-3xl shadow-inner transform group-hover:rotate-12 transition-transform">
              🐼
            </div>
            <div>
              <h4 className="font-black text-[var(--text-main)] text-lg mb-1">Pandinhas de Amor</h4>
              <p className="text-xs font-bold text-[var(--text-muted)] leading-tight">
                Recomende livros! Se a pessoa ler até o fim, ambos ganham um Pandinha!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
