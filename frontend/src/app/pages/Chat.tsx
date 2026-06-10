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
    <div className="flex flex-col h-screen bg-transparent">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-xl px-4 py-4.5 flex items-center justify-between border-b border-slate-100 shadow-sm z-20 sticky top-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-2xl hover:bg-slate-100 active:scale-90 transition-all border border-slate-100 shadow-sm cursor-pointer"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-main)]" />
          </button>
          
          <div onClick={() => navigate(`/user/${otherUser}`)} className="cursor-pointer group">
            <div className="font-extrabold text-base text-[var(--text-main)] flex items-center gap-1.5 group-hover:text-[var(--primary)] transition-colors">
              {otherUser} {nickname && <span className="text-[var(--primary)] text-[9px] font-extrabold bg-[var(--primary)]/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">@{nickname}</span>}
            </div>
            <div className="text-[8px] text-[var(--text-muted)] font-extrabold flex items-center gap-1 uppercase tracking-widest mt-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
              </span>
              online agora
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => setShowSettings(!showSettings)} 
          className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-2xl transition-all text-[var(--text-muted)] border border-transparent hover:border-slate-100 cursor-pointer"
        >
          <Settings className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute top-18 right-4 left-4 bg-white rounded-[2rem] p-6 shadow-2xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-200">
          <h3 className="font-extrabold text-[var(--text-main)] text-sm mb-1.5 uppercase tracking-wide">Configurar Apelido</h3>
          <p className="text-[10px] text-[var(--text-muted)] font-bold mb-4 uppercase tracking-widest">Escolha um apelido fofinho para {otherUser}:</p>
          <input
            type="text"
            value={newNickname}
            onChange={(e) => setNewNickname(e.target.value)}
            placeholder="Ex: Amorzinho, Panda, etc..."
            className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 outline-none mb-4 text-xs font-semibold focus:border-[var(--primary)]/30 focus:ring-4 focus:ring-[var(--primary)]/5 transition-all"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowSettings(false)} className="flex-1 py-3.5 rounded-xl bg-slate-50 font-extrabold text-[10px] text-[var(--text-muted)] uppercase tracking-widest cursor-pointer hover:bg-slate-100">Cancelar</button>
            <button onClick={handleSetNickname} className="flex-1 py-3.5 rounded-xl bg-[var(--primary)] text-white font-extrabold text-[10px] uppercase tracking-widest cursor-pointer shadow-md shadow-[var(--primary)]/10 hover:shadow-[var(--primary)]/20 active:scale-95">Salvar</button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg, idx) => {
          const isMe = msg.sender?.toLowerCase() === myUsername?.toLowerCase();
          const book = msg.shared_book_id ? getBookById(msg.shared_book_id) : null;
          
          return (
            <div key={msg.id || idx} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-[2rem] p-4 shadow-sm border ${
                isMe 
                  ? "bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/80 text-white rounded-br-none border-transparent shadow-[var(--primary)]/10" 
                  : "bg-white text-[var(--text-main)] rounded-bl-none border-slate-100"
              }`}>
                {book && (
                  <div 
                    onClick={() => navigate(`/book/${book.id}`)}
                    className="bg-black/5 rounded-2xl p-3 mb-2 flex items-center gap-3 cursor-pointer hover:bg-black/10 transition-colors"
                  >
                    <div className="w-10 h-14 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                      {book.coverImagePath && <img src={getFullUrl(book.coverImagePath)!} className="w-full h-full object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] uppercase font-extrabold opacity-70 tracking-widest">Recomendação</p>
                      <p className="text-xs font-bold truncate">{book.title}</p>
                    </div>
                  </div>
                )}
                <p className="text-xs leading-relaxed font-semibold">{msg.content}</p>
                <div className={`text-[8px] mt-1 opacity-60 text-right font-bold`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Emotes bar */}
      <div className="px-4 py-1.5 flex gap-3 overflow-x-auto no-scrollbar bg-white/40 border-t border-slate-100/50">
        {APP_EMOTES.map(emote => (
          <button
            key={emote}
            onClick={() => handleSend(emote)}
            className="text-2xl hover:scale-125 active:scale-90 transition-transform p-1 cursor-pointer select-none"
          >
            {emote}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 bg-white/70 backdrop-blur-md border-t border-slate-100 pb-8">
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-[2rem] border border-slate-200 focus-within:border-[var(--primary)]/30 focus-within:ring-4 focus-within:ring-[var(--primary)]/5 transition-all">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Diga algo fofo..."
            className="flex-1 bg-transparent px-4 py-2 outline-none text-[var(--text-main)] text-xs font-semibold placeholder:text-[var(--text-muted)]"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputValue.trim()}
            className={`p-3 rounded-full shadow-md transition-all active:scale-95 cursor-pointer flex-shrink-0 ${
              !inputValue.trim() 
                ? "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none" 
                : "bg-[var(--primary)] text-white shadow-[var(--primary)]/25 hover:shadow-lg hover:shadow-[var(--primary)]/15"
            }`}
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
