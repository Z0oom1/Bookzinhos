import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { fetchChat, sendMessage, setNickname, fetchBooks } from "../lib/api";
import { ChatMessage, Book, getFullUrl } from "../lib/types";
import { ArrowLeft, Send, Settings, Book as BookIcon } from "lucide-react";

export function Chat() {
  const { otherUser } = useParams<{ otherUser: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nickname, setNicknameState] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const myUsername = localStorage.getItem("books-username");

  useEffect(() => {
    async function loadData() {
      if (!otherUser) return;
      try {
        const [chatData, booksData] = await Promise.all([
          fetchChat(otherUser),
          fetchBooks()
        ]);
        setMessages(chatData.messages);
        setNicknameState(chatData.nickname);
        setNewNickname(chatData.nickname || "");
        setAllBooks(booksData);
      } catch (err) {
        console.error("Erro ao carregar chat:", err);
      }
    }
    loadData();

    // Polling de mensagens
    const interval = setInterval(async () => {
      try {
        const chatData = await fetchChat(otherUser!);
        setMessages(chatData.messages);
      } catch (err) {}
    }, 3000);

    return () => clearInterval(interval);
  }, [otherUser]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (textOverride?: string) => {
    const text = textOverride || inputValue;
    if (!text.trim() || !otherUser) return;
    try {
      await sendMessage(otherUser, text.trim());
      if (!textOverride) setInputValue("");
      const chatData = await fetchChat(otherUser);
      setMessages(chatData.messages);
    } catch (err) {
      alert("Erro ao enviar mensagem.");
    }
  };

  const handleSetNickname = async () => {
    if (!otherUser) return;
    try {
      await setNickname(otherUser, newNickname.trim());
      setNicknameState(newNickname.trim() || null);
      setShowSettings(false);
    } catch (err) {
      alert("Erro ao definir apelido.");
    }
  };

  const getBookById = (id: string) => allBooks.find(b => b.id === id);

  const APP_EMOTES = ["🐼", "💕", "✨", "📖", "📚", "🤍", "🌸", "🍭", "🎈"];

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-pastel)]">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-[var(--lavender)]/20 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-[var(--lavender)]/10 rounded-full">
            <ArrowLeft className="w-6 h-6 text-[var(--text-main)]" />
          </button>
          <div onClick={() => navigate(`/user/${otherUser}`)} className="cursor-pointer">
            <div className="font-bold text-[var(--text-main)] flex items-center gap-1">
              {otherUser} {nickname && <span className="text-[var(--blush)] text-sm">({nickname})</span>}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div> online
            </div>
          </div>
        </div>
        <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-[var(--lavender)]/10 rounded-full transition-colors text-[var(--text-muted)]">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute top-16 right-4 left-4 bg-white/90 backdrop-blur-xl p-6 rounded-[2rem] shadow-2xl border-2 border-[var(--lavender)]/20 z-50 animate-in fade-in zoom-in duration-200">
          <h3 className="font-bold text-[var(--text-main)] mb-4">Configurar Apelido</h3>
          <p className="text-xs text-[var(--text-muted)] mb-4">Escolha um apelido fofinho para {otherUser}:</p>
          <input
            type="text"
            value={newNickname}
            onChange={(e) => setNewNickname(e.target.value)}
            placeholder="Ex: Amorzinho, Panda, etc..."
            className="w-full bg-[var(--bg-pastel)] p-4 rounded-2xl border-2 border-transparent focus:border-[var(--lavender)]/40 outline-none mb-4"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowSettings(false)} className="flex-1 py-3 rounded-2xl bg-gray-100 font-bold text-[var(--text-muted)]">Cancelar</button>
            <button onClick={handleSetNickname} className="flex-1 py-3 rounded-2xl bg-[var(--lavender)] text-white font-bold shadow-lg shadow-[var(--lavender)]/20">Salvar</button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => {
          const isMe = msg.sender === myUsername;
          const book = msg.shared_book_id ? getBookById(msg.shared_book_id) : null;
          
          return (
            <div key={msg.id || idx} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-[2rem] p-4 shadow-sm ${
                isMe 
                  ? "bg-gradient-to-br from-[var(--lavender)] to-[var(--lavender)]/80 text-white rounded-br-none" 
                  : "bg-white/90 text-[var(--text-main)] rounded-bl-none border border-[var(--lavender)]/10"
              }`}>
                {book && (
                  <div 
                    onClick={() => navigate(`/book/${book.id}`)}
                    className="bg-black/5 rounded-2xl p-3 mb-2 flex items-center gap-3 cursor-pointer hover:bg-black/10 transition-colors"
                  >
                    <div className="w-10 h-14 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      {book.coverImagePath && <img src={getFullUrl(book.coverImagePath)!} className="w-full h-full object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold opacity-70">Recomendação</p>
                      <p className="text-xs font-bold truncate">{book.title}</p>
                    </div>
                  </div>
                )}
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <div className={`text-[9px] mt-1 opacity-60 text-right`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Emotes bar */}
      <div className="px-4 py-2 flex gap-3 overflow-x-auto no-scrollbar bg-white/40 backdrop-blur-sm">
        {APP_EMOTES.map(emote => (
          <button
            key={emote}
            onClick={() => handleSend(emote)}
            className="text-2xl hover:scale-125 active:scale-90 transition-transform p-1"
          >
            {emote}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 bg-white/60 backdrop-blur-md border-t border-[var(--lavender)]/20 pb-8">
        <div className="flex items-center gap-2 bg-[var(--bg-pastel)] p-2 rounded-[2rem] border-2 border-[var(--lavender)]/10 focus-within:border-[var(--lavender)]/40 transition-colors">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Diga algo fofo..."
            className="flex-1 bg-transparent px-4 py-2 outline-none text-[var(--text-main)] text-sm"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputValue.trim()}
            className="p-3 bg-[var(--lavender)] disabled:opacity-50 text-white rounded-full shadow-lg shadow-[var(--lavender)]/20 active:scale-95 transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
