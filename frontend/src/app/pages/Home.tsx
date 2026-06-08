import { useState, useEffect } from "react";
import { Search, Heart, BookOpen, Edit3, Send, Sparkles, Clock, UserCheck } from "lucide-react";
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
        console.error("Erro ao carregar dados da Home:", err);
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
    <div className="min-h-screen bg-transparent pb-32">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        
        {/* Cabeçalho */}
        <div className="animate-fade-in flex justify-between items-center px-1 pt-2">
          <div>
            <h1 className="text-2xl font-black text-[var(--text-main)] leading-tight">Olá, {userName}! 👋</h1>
            <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-wider mt-0.5">Sua estante mágica te espera</p>
          </div>
          <Link to="/profile">
            <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-[var(--lavender)]/30 to-[var(--blush)]/30 flex items-center justify-center text-2xl shadow-inner hover:scale-105 active:scale-95 transition-all border border-[var(--lavender)]/20">
              🐼
            </div>
          </Link>
        </div>

        {/* Banner Principal */}
        <div className="relative h-40 rounded-[2rem] overflow-hidden bg-gradient-to-tr from-[var(--lavender)] via-[var(--peach)] to-[var(--blush)] shadow-[0_10px_30px_rgba(243,168,184,0.2)] animate-scale-in border border-white/20">
          <div className="absolute inset-0 bg-black/5 backdrop-blur-[0.5px]" />
          <div className="absolute top-6 left-6 z-10 space-y-2">
            <span className="text-[10px] font-black text-white bg-white/20 uppercase tracking-widest px-3 py-1 rounded-full backdrop-blur-md">
              Descoberta
            </span>
            <h2 className="text-xl font-black text-white drop-shadow-sm">Explore Histórias e Mundos ✨</h2>
          </div>
          <div className="absolute bottom-4 right-6 text-7xl opacity-20 animate-float">📖</div>
        </div>

        {/* Status Recente */}
        <div className="animate-fade-in relative">
          {!isEditingStatus ? (
            <div 
              onClick={() => setIsEditingStatus(true)}
              className="bg-white/60 hover:bg-white/95 backdrop-blur-xl p-4 rounded-[2rem] border border-white/60 shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-[0.99] relative overflow-hidden"
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-[var(--lavender)]/20 to-[var(--blush)]/20 rounded-[1.2rem] flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform duration-300">
                  {status?.emote || "🐼"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-main)] font-bold truncate">
                    "{status?.content}"
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] font-black text-[var(--primary)] uppercase tracking-wider">
                      {status?.username}
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)] italic">
                      • {status ? new Date(status.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                    </span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity border border-[var(--lavender)]/10">
                  <Edit3 className="w-3.5 h-3.5 text-[var(--primary)]" />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-[2rem] border-2 border-[var(--lavender)]/20 shadow-xl space-y-3.5 animate-in zoom-in-95 duration-200">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {EMOTES.map(e => (
                  <button 
                    key={e}
                    onClick={() => setStatusEmote(e)}
                    className={`text-xl p-1.5 rounded-lg transition-all ${statusEmote === e ? "bg-[var(--lavender)]/20 scale-110" : "hover:bg-gray-50"}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <textarea
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value)}
                maxLength={100}
                placeholder="Como você está se sentindo? ✨"
                className="w-full bg-[var(--bg-pastel)] p-3.5 rounded-xl border-none outline-none text-xs text-[var(--text-main)] h-20 resize-none font-bold placeholder:text-[var(--text-muted)]"
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsEditingStatus(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-50 font-black text-[var(--text-muted)] text-xs uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleUpdateStatus}
                  disabled={!statusInput.trim()}
                  className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 ${
                    !statusInput.trim()
                      ? "bg-gray-100 text-gray-300 cursor-not-allowed shadow-none"
                      : "bg-[var(--primary)] text-white shadow-[var(--primary)]/20"
                  }`}
                >
                  <Send className="w-3.5 h-3.5" /> Enviar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Busca e Categorias */}
        <div className="space-y-4 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--primary)] opacity-70" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar livros, autores..."
              className="w-full pl-11 pr-4 py-3 bg-white/70 backdrop-blur-sm rounded-[1.5rem] outline-none border border-white/60 focus:border-[var(--primary)]/40 focus:ring-4 focus:ring-[var(--primary)]/5 transition-all shadow-sm text-xs text-[var(--text-main)] font-bold placeholder:text-[var(--text-muted)]"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[10px] font-black transition-all border uppercase tracking-wider active:scale-95 ${
                  activeCategory === cat || (cat === "Todos" && !activeCategory)
                    ? "bg-gradient-to-r from-[var(--lavender)] to-[var(--primary)] text-white shadow-sm border-transparent"
                    : "bg-white/60 text-[var(--text-muted)] border-white/80 hover:bg-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Listagem de Resultados ou Home Padrão */}
        {searchResults ? (
          <section className="animate-fade-in space-y-4">
            <h2 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest flex items-center gap-2 px-1">
              <Search className="w-4 h-4 text-[var(--primary)]" />
              Resultados da Busca
            </h2>
            {searchResults.length === 0 ? (
              <div className="text-center py-10 bg-white/40 rounded-3xl border border-white/50">
                <p className="text-xs text-[var(--text-muted)] font-bold">Nenhum livro mágico encontrado. 🐾</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {searchResults.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            {/* Continue Lendo */}
            {currentBook && currentlyReading && (
              <section className="animate-fade-in space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[var(--primary)]" />
                    <h2 className="text-xs font-black text-[var(--text-main)] uppercase tracking-widest">Leitura Atual</h2>
                  </div>
                </div>
                <Link to={`/read/${currentBook.id}`}>
                  <div className="bg-white/70 hover:bg-white/90 backdrop-blur-xl rounded-[2rem] p-4 shadow-sm border border-white/80 flex gap-4 group relative overflow-hidden transition-all active:scale-[0.99]">
                    <div className="flex-shrink-0 w-20 h-28 rounded-xl overflow-hidden shadow-md group-hover:scale-102 transition-transform border border-white/50">
                      {currentBook.coverImagePath ? (
                        <img src={getFullUrl(currentBook.coverImagePath)!} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(currentBook)} flex items-center justify-center`}>
                          <BookOpen className="w-6 h-6 text-white opacity-40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 py-1 flex flex-col justify-between min-w-0">
                      <div>
                        <h3 className="font-black text-[var(--text-main)] text-sm line-clamp-1 mb-0.5">{currentBook.title}</h3>
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider">{currentBook.author}</p>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[9px] font-black">
                          <span className="text-[var(--primary)] bg-[var(--primary)]/5 px-2 py-0.5 rounded-md">
                            {currentlyReading.progress}% lido
                          </span>
                        </div>
                        <div className="w-full bg-[var(--bg-pastel)] h-2 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className="bg-gradient-to-r from-[var(--primary)] to-[var(--lavender)] h-full transition-all duration-500" 
                            style={{ width: `${currentlyReading.progress}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </section>
            )}

            {/* Livros Recomendados */}
            <section className="animate-fade-in space-y-3">
              <div className="flex items-center gap-1.5 px-1">
                <Sparkles className="w-4 h-4 text-[var(--primary)]" />
                <h2 className="text-xs font-black text-[var(--text-main)] uppercase tracking-widest">Recomendados</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {recommended.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            </section>

            {/* Adicionados Recentemente */}
            <section className="animate-fade-in space-y-3">
              <div className="flex items-center gap-1.5 px-1">
                <Clock className="w-4 h-4 text-[var(--primary)]" />
                <h2 className="text-xs font-black text-[var(--text-main)] uppercase tracking-widest">Recentes</h2>
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 px-1">
                {recent.map((book) => (
                  <div key={book.id} className="w-28 flex-shrink-0">
                    <BookCard book={book} variant="small" />
                  </div>
                ))}
              </div>
            </section>

            {/* Livros do Autor em Destaque */}
            {authorBooks.length > 0 && (
              <section className="animate-fade-in space-y-3">
                <div className="flex items-center gap-1.5 px-1">
                  <UserCheck className="w-4 h-4 text-[var(--primary)]" />
                  <h2 className="text-xs font-black text-[var(--text-main)] uppercase tracking-widest">Especial {featuredAuthor}</h2>
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
