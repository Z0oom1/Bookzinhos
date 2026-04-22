import { useState, useEffect } from "react";
import { Search, TrendingUp, Heart, BookOpen, Edit3, Send, Sparkles, Clock, UserCheck } from "lucide-react";
import { Link } from "react-router";
import { fetchBooks, fetchAllProgress, fetchSavedIds, fetchGlobalStatus, updateGlobalStatus } from "../lib/api";
import { getCoverGradient, getFullUrl } from "../lib/types";
import { BookCard } from "../components/BookCard";
import type { Book, ReadingProgress, GlobalStatus } from "../lib/types";

export function Home() {
  const userName = localStorage.getItem("books-username") || "Leitora";
  const [books, setBooks] = useState<Book[]>([]);
  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [status, setStatus] = useState<GlobalStatus | null>(null);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [statusInput, setStatusInput] = useState("");
  const [statusEmote, setStatusEmote] = useState("🐼");

  const EMOTES = ["🐼", "💕", "✨", "📖", "📚", "🤍", "🌸", "🍭", "🎈"];
  
  const CATEGORIES = ["Todos", "Romance", "Fantasia", "Ficção", "Autoajuda"];

  useEffect(() => {
    async function loadData() {
      try {
        const [b, p, s, st] = await Promise.all([
          fetchBooks(), 
          fetchAllProgress(), 
          fetchSavedIds(),
          fetchGlobalStatus().catch(() => ({ 
            username: "Sistema", 
            content: "Bem-vindos!", 
            emote: "✨", 
            updated_at: Date.now() 
          }))
        ]);
        setBooks(b);
        setProgress(p);
        setSavedIds(s);
        setStatus(st);
        setStatusInput(st.content);
        setStatusEmote(st.emote);
      } catch (err) {
        console.error("Erro ao carregar home:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleUpdateStatus = async () => {
    if (!statusInput.trim()) return;
    try {
      const newStatus = await updateGlobalStatus(statusInput.trim(), statusEmote);
      setStatus(newStatus);
      setIsEditingStatus(false);
    } catch (err: any) {
      alert("Erro ao atualizar status: " + (err.message || "Erro desconhecido"));
    }
  };

  const recommended = [...books].sort((a, b) => b.rating - a.rating).slice(0, 6);
  const recent = [...books].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)).slice(0, 6);
  
  // Pick a featured author
  const authors = Array.from(new Set(books.map(b => b.author))).filter(a => a);
  const featuredAuthor = authors[0] || "Autor Desconhecido";
  const authorBooks = books.filter(b => b.author === featuredAuthor).slice(0, 6);

  const currentlyReading = progress.find((p) => p.status === "lendo");
  const currentBook = currentlyReading
    ? books.find((b) => b.id === currentlyReading.bookId)
    : null;

  let searchResults = search.trim()
    ? books.filter(
        (b) =>
          b.title.toLowerCase().includes(search.toLowerCase()) ||
          b.author.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  if (activeCategory && activeCategory !== "Todos") {
    const categoryFiltered = books.filter(b => b.genre?.toLowerCase() === activeCategory.toLowerCase() || b.genre?.toLowerCase().includes(activeCategory.toLowerCase()));
    if (searchResults) {
      searchResults = searchResults.filter(b => categoryFiltered.includes(b));
    } else {
      searchResults = categoryFiltered.length > 0 ? categoryFiltered : [];
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-5xl animate-bounce-in">🐼</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        
        {/* Welcome Header */}
        <div className="animate-fade-in flex justify-between items-center px-2 pt-2">
          <div>
            <h1 className="text-3xl mb-1 font-black text-[var(--text-main)]">Olá, {userName}! 👋</h1>
            <p className="text-[var(--text-muted)] text-sm font-bold">O que vamos ler hoje?</p>
          </div>
          <Link to="/profile">
            <div className="w-14 h-14 rounded-[1.5rem] bg-gradient-to-br from-[var(--lavender)]/30 to-[var(--blush)]/30 flex items-center justify-center text-3xl shadow-inner hover:scale-110 hover:rotate-3 transition-transform cursor-pointer border-2 border-white">
              🐼
            </div>
          </Link>
        </div>

        {/* Banner Bonitinho */}
        <div className="relative h-44 rounded-[3rem] overflow-hidden bg-gradient-to-br from-[var(--lavender)] via-[var(--peach)] to-[var(--blush)] shadow-xl animate-scale-in">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
          <div className="absolute top-4 left-6 z-10">
            <h2 className="text-2xl font-black text-white drop-shadow-md mb-1">Mundo Mágico ✨</h2>
            <p className="text-white/80 text-xs font-bold bg-black/10 inline-block px-3 py-1 rounded-full">Explore novas histórias</p>
          </div>
          <div className="absolute -bottom-2 -right-4 text-9xl opacity-30 animate-float">📖</div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10rem] opacity-10">🐼</div>
          <div className="absolute bottom-4 left-6 flex items-center gap-2">
            <div className="w-10 h-10 rounded-full border-2 border-white/50 flex items-center justify-center text-xl bg-white/20">✨</div>
            <div className="w-10 h-10 rounded-full border-2 border-white/50 flex items-center justify-center text-xl bg-white/20">💕</div>
          </div>
        </div>

        {/* Global Shoutbox */}
        <div className="animate-fade-in relative z-20">
          {!isEditingStatus ? (
            <div 
              onClick={() => setIsEditingStatus(true)}
              className="bg-white/70 backdrop-blur-xl p-5 rounded-[2rem] border border-white/60 shadow-lg hover:shadow-xl transition-all cursor-pointer group active:scale-[0.98] mt-2 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--lavender)]/5 to-[var(--peach)]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-[var(--lavender)]/20 to-[var(--blush)]/20 rounded-[1.5rem] flex items-center justify-center text-4xl shadow-sm group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300">
                  {status?.emote || "🐼"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] text-[var(--text-main)] font-black leading-tight mb-1 truncate group-hover:text-[var(--lavender)] transition-colors">
                    "{status?.content}"
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[var(--text-muted)] bg-[var(--bg-pastel)] px-2 py-0.5 rounded-md">
                      {status?.username}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]/70 italic">
                      • {status ? new Date(status.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                    </span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0">
                  <Edit3 className="w-4 h-4 text-[var(--lavender)]" />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-[2rem] border-2 border-[var(--lavender)]/40 shadow-xl space-y-4 animate-in zoom-in-95 duration-200 z-50 relative">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {EMOTES.map(e => (
                  <button 
                    key={e}
                    onClick={() => setStatusEmote(e)}
                    className={`text-2xl p-2 rounded-xl transition-all ${statusEmote === e ? "bg-[var(--lavender)]/20 scale-110" : "hover:bg-gray-100"}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <textarea
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value)}
                maxLength={100}
                placeholder="O que você está pensando? ✨"
                className="w-full bg-[var(--bg-pastel)] p-4 rounded-2xl border-none outline-none text-sm text-[var(--text-main)] h-24 resize-none font-medium"
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsEditingStatus(false)}
                  className="flex-1 py-3 rounded-2xl bg-gray-100 font-bold text-[var(--text-muted)] text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleUpdateStatus}
                  disabled={!statusInput.trim()}
                  className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                    !statusInput.trim()
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                      : "bg-[var(--primary)] text-white shadow-[var(--primary)]/30"
                  }`}
                >
                  <Send className="w-4 h-4" /> Postar
                </button>
              </div>
            </div>
          )}
        </div>


        {/* Search & Categories */}
        <div className="space-y-4 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--lavender)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar livros, autores mágicos..."
              className="w-full pl-14 pr-5 py-4 bg-white/80 backdrop-blur-sm rounded-[2rem] outline-none border border-white/60 focus:border-[var(--lavender)]/60 focus:ring-4 focus:ring-[var(--lavender)]/10 transition-all shadow-md text-[var(--text-main)] font-medium placeholder:text-[var(--text-muted)]"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 px-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`flex-shrink-0 px-4 py-2 rounded-[1rem] text-xs font-bold transition-all active:scale-95 border ${
                  activeCategory === cat || (cat === "Todos" && !activeCategory)
                    ? "bg-gradient-to-r from-[var(--lavender)] to-[var(--primary)] text-white shadow-md border-transparent"
                    : "bg-white/60 text-[var(--text-muted)] border-white hover:bg-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {searchResults ? (
           <section className="animate-fade-in">
             <h2 className="text-lg font-black text-[var(--text-main)] mb-4 flex items-center gap-2">
               <Search className="w-5 h-5 text-[var(--lavender)]" />
               Resultados da Busca
             </h2>
             <div className="grid grid-cols-2 gap-4">
               {searchResults.map((book) => (
                 <BookCard key={book.id} book={book} />
               ))}
             </div>
           </section>
        ) : (
          <>
            {/* Continue lendo */}
            {currentBook && currentlyReading && (
              <section className="animate-fade-in">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-[var(--mint)]/30 to-[var(--sky)]/30 rounded-xl flex items-center justify-center shadow-sm">
                      <BookOpen className="w-4 h-4 text-[var(--mint)]" />
                    </div>
                    <h2 className="text-xl font-black text-[var(--text-main)]">Continue lendo</h2>
                  </div>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] bg-white px-2 py-1 rounded-lg shadow-sm">Aventura Ativa ✨</span>
                </div>
                <Link to={`/read/${currentBook.id}`}>
                  <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-5 shadow-xl hover:shadow-2xl transition-all flex gap-5 border border-white/60 group relative overflow-hidden active:scale-[0.98]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--mint)]/20 to-transparent rounded-bl-full -z-1 opacity-50 group-hover:scale-110 transition-transform" />
                    <div className="flex-shrink-0 w-24 h-32 rounded-2xl overflow-hidden shadow-lg group-hover:rotate-2 group-hover:scale-105 transition-all z-10 border border-white/50">
                      {currentBook.coverImagePath ? (
                        <img src={getFullUrl(currentBook.coverImagePath)!} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(currentBook)} flex items-center justify-center`}>
                          <BookOpen className="w-8 h-8 text-white opacity-50" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 py-2 space-y-4 z-10 flex flex-col justify-between">
                      <div>
                        <h3 className="font-black text-[var(--text-main)] text-lg line-clamp-2 leading-tight mb-1">{currentBook.title}</h3>
                        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{currentBook.author}</p>
                      </div>
                      <div>
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-[10px] font-black text-[var(--mint)] bg-[var(--mint)]/10 px-2 py-0.5 rounded-md">
                            {currentlyReading.progress}% concluído
                          </span>
                        </div>
                        <div className="w-full bg-[var(--bg-pastel)] h-2.5 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className="bg-gradient-to-r from-[var(--mint)] to-[var(--sky)] h-full transition-all duration-1000 relative" 
                            style={{ width: `${currentlyReading.progress}%` }} 
                          >
                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </section>
            )}

            {/* Recomendados (mais nota) */}
            <section className="animate-fade-in">
              <div className="flex items-center gap-2 mb-4 px-2">
                <div className="w-8 h-8 bg-[var(--blush)]/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[var(--blush)]" />
                </div>
                <h2 className="text-lg font-black text-[var(--text-main)]">Recomendados para você</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {recommended.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            </section>

            {/* Recentemente Adicionados */}
            <section className="animate-fade-in">
              <div className="flex items-center gap-2 mb-4 px-2">
                <div className="w-8 h-8 bg-[var(--sky)]/20 rounded-xl flex items-center justify-center">
                  <Clock className="w-4 h-4 text-[var(--sky)]" />
                </div>
                <h2 className="text-lg font-black text-[var(--text-main)]">Postados recentemente</h2>
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 px-2">
                {recent.map((book) => (
                  <div key={book.id} className="w-32 flex-shrink-0">
                    <BookCard book={book} variant="small" />
                  </div>
                ))}
              </div>
            </section>

            {/* De Autor X */}
            {authorBooks.length > 0 && (
              <section className="animate-fade-in">
                <div className="flex items-center gap-2 mb-4 px-2">
                  <div className="w-8 h-8 bg-[var(--lavender)]/20 rounded-xl flex items-center justify-center">
                    <UserCheck className="w-4 h-4 text-[var(--lavender)]" />
                  </div>
                  <h2 className="text-lg font-black text-[var(--text-main)]">De {featuredAuthor}</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {authorBooks.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
