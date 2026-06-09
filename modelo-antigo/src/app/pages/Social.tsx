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
      } catch (err) { }
    }, 5000);

    return () => clearInterval(interval);
  }, [myUsername]);

  return (
    <div className="min-h-screen bg-transparent pb-32">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Notice Board Header */}
        <div className="border-4 border-black p-4 text-center relative">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-4 top-4 px-2 py-1 border border-black text-[10px] font-black uppercase hover:bg-black hover:text-white"
          >
            [ VOLTAR ]
          </button>
          <h1 className="text-2xl font-black uppercase tracking-wider m-0">MURAL DE COMUNICAÇÕES</h1>
          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mt-1.5 m-0">TELEGRAMAS, RECOMENDAÇÕES E CONEXÕES</p>
        </div>

        {/* Telegram Listings Feed */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 border border-black border-dashed">
            <div className="w-10 h-10 border-4 border-black border-t-transparent animate-spin"></div>
            <p className="text-[10px] font-black uppercase tracking-wider">Carregando Telegramas...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="border border-black border-dashed p-12 text-center text-xs text-gray-500 italic">
            Nenhum outro leitor na rede no momento... 🐼
          </div>
        ) : (
          <div className="space-y-6">
            {users.map((user) => {
              const unreadCount = notifications?.details?.[user.username.toLowerCase()] || 0;
              return (
                <div key={user.username} className="border border-black p-4 space-y-4 bg-white relative">

                  {/* Telegram Header Card */}
                  <div className="border-b border-black pb-2 flex justify-between items-center text-[10px] font-bold uppercase">
                    <span className="bg-black text-white px-2 py-0.5">TELEGRAMA</span>
                    <div className="flex items-center gap-2">
                      <span>REMETENTE: @{user.username}</span>
                      {user.pandinhas > 0 && (
                        <span className="border border-black px-1.5 py-0.2 text-[8px] bg-gray-50">
                          🐼 {user.pandinhas}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Message/Avatar area */}
                  <div className="flex gap-4 items-start">
                    {/* Avatar Stamp */}
                    <div className="w-16 h-16 border border-black bg-gray-100 flex items-center justify-center text-4xl relative flex-shrink-0">
                      {user.avatar || "🐼"}
                      <div className="absolute bottom-1 right-1 bg-black text-white text-[8px] px-1 font-bold">FOTO</div>
                    </div>

                    {/* Bio Message */}
                    <div className="flex-1 min-w-0">
                      <span className="text-[8px] font-mono text-gray-400 block mb-0.5">// BIOGRAFIA REGISTRAL</span>
                      <p className="text-xs italic m-0 font-bold leading-relaxed">"{user.bio || "Escrevendo uma bela história..."}"</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 border-t border-black pt-3">
                    <button
                      onClick={() => navigate(`/chat/${user.username}`)}
                      className="flex-grow py-2 bg-black text-white text-xs font-black uppercase tracking-wider hover:bg-white hover:text-black border border-black relative"
                    >
                      [ ENVIAR MENSAGEM ]
                      {unreadCount > 0 && (
                        <span className="absolute -top-2 -right-2 w-5.5 h-5.5 bg-black text-white border-2 border-white text-[9px] rounded-full flex items-center justify-center font-bold">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => navigate(`/user/${user.username}`)}
                      className="px-4 py-2 border border-black text-xs font-black uppercase tracking-wider hover:bg-black hover:text-white"
                    >
                      [ VER FICHA ]
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Notice Reward Voucher */}
        <div className="border border-black border-dashed p-4 space-y-2 relative bg-gray-50/30">
          <div className="border-b border-dashed border-black pb-1.5 flex justify-between items-center text-[10px] font-black uppercase text-gray-500">
            <span>// VOUCHER DE INCENTIVO</span>
            <span>VALE-PANDINHA</span>
          </div>
          <div className="flex gap-4 items-center">
            <span className="text-3xl">🐼</span>
            <div>
              <h4 className="font-black text-xs m-0 uppercase">Pandinhas de Amor</h4>
              <p className="text-[9px] font-bold text-gray-600 m-0 leading-normal mt-1 uppercase">
                Indique leituras fofas! Se o seu Namorado(a) terminar o livro recomendado, ambos ganham um Pandinha na conta!
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
