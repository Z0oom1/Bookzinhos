import { useState, useEffect } from "react";
import { Search, Heart, BookOpen, Edit3, Send, Sparkles, Clock, UserCheck } from "lucide-react";
import { Link } from "react-router";
import { fetchBooks, fetchAllProgress, fetchSavedIds, fetchGlobalStatus, updateGlobalStatus, toggleSaved } from "../lib/api";
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

  const handleToggleSave = async (bookId: string) => {
    const currently = savedIds.includes(bookId);
    setSavedIds((prev) => currently ? prev.filter((id) => id !== bookId) : [...prev, bookId]);
    await toggleSaved(bookId, currently);
  };

  const renderBookShelf = (booksList: Book[], keyPrefix: string) => {
    const chunked = [];
    for (let i = 0; i < booksList.length; i += 3) {
      chunked.push(booksList.slice(i, i + 3));
    }

    return (
      <div className="space-y-12 mt-6">
        {chunked.map((row, rowIndex) => (
          <div key={`${keyPrefix}-row-${rowIndex}`} className="relative pt-6 px-4 flex justify-around items-end h-[160px] animate-fade-in" style={{ animationDelay: `${rowIndex * 0.15}s` }}>
            {row.map((book) => {
              const prog = progress.find((p) => p.bookId === book.id);
              return (
                <div key={book.id} className="relative z-10 flex flex-col items-center">
                  <BookCard
                    book={book}
                    progress={prog}
                    variant="shelf"
                    onDeleted={(id) => setBooks((b) => b.filter((x) => x.id !== id))}
                    onEdited={(updated) => setBooks((b) => b.map((x) => x.id === updated.id ? updated : x))}
                  />
                  <button
                    onClick={() => handleToggleSave(book.id)}
                    className="absolute -top-3.5 -right-3.5 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-md active:scale-90 hover:scale-105 transition-transform border border-slate-100 cursor-pointer text-xs"
                  >
                    {savedIds.includes(book.id) ? "❤️" : "🤍"}
                  </button>
                </div>
              );
            })}

            {/* The Wooden Shelf */}
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-[#A0522D] to-[#8B4513] rounded-sm shadow-[0_10px_20px_rgba(0,0,0,0.4)] z-0 border-t border-[#CD853F]" />
            <div className="absolute -bottom-2 left-1 right-1 h-2 bg-[#5C4033] rounded-b-md shadow-2xl z-0" />
            
            {/* Shelf Side Brackets */}
            <div className="absolute -bottom-4 left-4 w-2 h-6 bg-[#3E2723] rounded-b-sm shadow-md z-0" />
            <div className="absolute -bottom-4 right-4 w-2 h-6 bg-[#3E2723] rounded-b-sm shadow-md z-0" />
          </div>
        ))}
      </div>
    );
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
            <h1 className="text-2xl font-extrabold text-[var(--text-main)] tracking-tight">Olá, {userName}! 👋</h1>
            <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest mt-1">Sua estante mágica te espera</p>
          </div>
          <Link to="/profile">
            <div className="w-12 h-12 rounded-[1.25rem] bg-[var(--lavender)]/40 flex items-center justify-center text-2xl shadow-sm hover:scale-105 active:scale-95 transition-all border border-white/80">
              🐼
            </div>
          </Link>
        </div>

        {/* Banner Principal */}
        <div className="relative h-44 rounded-[2.25rem] overflow-hidden bg-[var(--blush)]/70 shadow-[0_12px_40px_rgba(244,63,94,0.05)] animate-scale-in border border-white/30">
          <div className="absolute inset-0 bg-black/[0.02] backdrop-blur-[0.5px]" />
          <div className="absolute top-8 left-8 z-10 space-y-2.5">
            <span className="text-[9px] font-extrabold text-[var(--primary)] bg-white/95 uppercase tracking-widest px-3.5 py-1.5 rounded-full shadow-sm">
              Descoberta
            </span>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight leading-tight">Explore Histórias e<br />Mundos Encantados ✨</h2>
          </div>
          <div className="absolute bottom-4 right-8 text-8xl opacity-15 animate-float select-none pointer-events-none">📖</div>
        </div>

        {/* Status Recente */}
        <div className="animate-fade-in relative">
          {!isEditingStatus ? (
            <div 
              onClick={() => setIsEditingStatus(true)}
              className="bg-white/70 hover:bg-white/90 backdrop-blur-xl p-4.5 rounded-[2rem] border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.04)] transition-all cursor-pointer group active:scale-[0.99] relative overflow-hidden"
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 bg-[var(--blush)]/50 rounded-[1.2rem] flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform duration-300">
                  {status?.emote || "🐼"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--text-main)] font-semibold truncate leading-relaxed">
                    "{status?.content}"
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] font-extrabold text-[var(--primary)] uppercase tracking-widest">
                      {status?.username}
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)] font-medium">
                      • {status ? new Date(status.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                    </span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity border border-slate-100">
                  <Edit3 className="w-3.5 h-3.5 text-[var(--primary)]" />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-[2.25rem] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.08)] space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {EMOTES.map(e => (
                  <button 
                    key={e}
                    onClick={() => setStatusEmote(e)}
                    className={`text-xl p-2 rounded-xl transition-all cursor-pointer ${statusEmote === e ? "bg-[var(--primary)]/10 scale-110" : "hover:bg-slate-50"}`}
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
                className="w-full bg-slate-50 p-4 rounded-2xl border-none outline-none text-xs text-[var(--text-main)] h-20 resize-none font-semibold placeholder:text-[var(--text-muted)]"
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsEditingStatus(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-50 font-bold text-[var(--text-muted)] text-[10px] uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleUpdateStatus}
                  disabled={!statusInput.trim()}
                  className={`flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                    !statusInput.trim()
                      ? "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                      : "bg-[var(--primary)] text-white shadow-[var(--primary)]/10 hover:shadow-[var(--primary)]/20 active:scale-[0.98]"
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
            <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--primary)] opacity-70" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar livros, autores..."
              className="w-full pl-12 pr-4.5 py-3.5 bg-white/70 backdrop-blur-xl rounded-[1.75rem] outline-none border border-white/80 focus:border-[var(--primary)]/30 focus:ring-[3px] focus:ring-[var(--primary)]/5 transition-all shadow-[0_8px_30px_rgba(0,0,0,0.01)] text-xs text-[var(--text-main)] font-semibold placeholder:text-[var(--text-muted)]"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-[10px] font-extrabold transition-all border uppercase tracking-widest active:scale-95 cursor-pointer ${
                  activeCategory === cat || (cat === "Todos" && !activeCategory)
                    ? "bg-[var(--primary)] text-white shadow-sm border-transparent"
                    : "bg-white/70 text-[var(--text-muted)] border-white/90 hover:bg-white hover:border-slate-200"
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
            <h2 className="text-xs font-extrabold text-[var(--text-main)] uppercase tracking-widest flex items-center gap-2 px-1">
              <Search className="w-4 h-4 text-[var(--primary)]" />
              Resultados da Busca
            </h2>
            {searchResults.length === 0 ? (
              <div className="text-center py-12 bg-white/50 rounded-[2rem] border border-white/80">
                <p className="text-xs text-[var(--text-muted)] font-bold">Nenhum livro mágico encontrado. 🐾</p>
              </div>
            ) : (
              renderBookShelf(searchResults, "search")
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
                    <h2 className="text-[10px] font-extrabold text-[var(--text-main)] uppercase tracking-widest">Leitura Atual</h2>
                  </div>
                </div>
                <Link to={`/read/${currentBook.id}`}>
                  <div className="bg-white/75 hover:bg-white/90 backdrop-blur-xl rounded-[2rem] p-4.5 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-white/80 flex gap-5 group relative overflow-hidden transition-all active:scale-[0.99]">
                    <div className="flex-shrink-0 w-20 h-28 rounded-2xl overflow-hidden shadow-md group-hover:scale-[1.02] transition-transform border border-white/50">
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
                        <h3 className="font-extrabold text-[var(--text-main)] text-sm line-clamp-1 mb-1">{currentBook.title}</h3>
                        <p className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">{currentBook.author}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[9px] font-extrabold">
                          <span className="text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded-md">
                            {currentlyReading.progress}% lido
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className="bg-[var(--primary)] h-full transition-all duration-500 rounded-full" 
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
            <section className="animate-fade-in space-y-4">
              <div className="flex items-center gap-1.5 px-1">
                <Sparkles className="w-4 h-4 text-[var(--primary)]" />
                <h2 className="text-[10px] font-extrabold text-[var(--text-main)] uppercase tracking-widest">Recomendados</h2>
              </div>
              {renderBookShelf(recommended, "rec")}
            </section>

            {/* Adicionados Recentemente */}
            <section className="animate-fade-in space-y-4">
              <div className="flex items-center gap-1.5 px-1">
                <Clock className="w-4 h-4 text-[var(--primary)]" />
                <h2 className="text-[10px] font-extrabold text-[var(--text-main)] uppercase tracking-widest">Recentes</h2>
              </div>
              {renderBookShelf(recent, "recent")}
            </section>

            {/* Livros do Autor em Destaque */}
            {authorBooks.length > 0 && (
              <section className="animate-fade-in space-y-4">
                <div className="flex items-center gap-1.5 px-1">
                  <UserCheck className="w-4 h-4 text-[var(--primary)]" />
                  <h2 className="text-[10px] font-extrabold text-[var(--text-main)] uppercase tracking-widest">Especial {featuredAuthor}</h2>
                </div>
                {renderBookShelf(authorBooks, "author")}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
