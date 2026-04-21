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
    <div className="min-h-screen bg-[var(--bg-pastel)] pb-24">
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-10 px-4 py-4 flex items-center gap-4 border-b border-[var(--lavender)]/20 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-[var(--lavender)]/10 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-[var(--text-main)]" />
        </button>
        <h1 className="text-xl font-bold text-[var(--text-main)]">Área Social</h1>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
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
                      className="p-3 bg-[var(--lavender)]/20 hover:bg-[var(--lavender)]/40 rounded-2xl transition-colors text-[var(--text-main)]"
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
      <div className="p-4 max-w-2xl mx-auto">
        <div className="bg-gradient-to-r from-[var(--blush)]/10 to-[var(--lavender)]/10 p-6 rounded-[2.5rem] border border-[var(--lavender)]/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">
              🐼
            </div>
            <div>
              <h4 className="font-bold text-[var(--text-main)]">Pandinhas de Amor</h4>
              <p className="text-xs text-[var(--text-muted)]">
                Recomende livros! Se a pessoa ler até o fim, ambos ganham um Pandinha!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
