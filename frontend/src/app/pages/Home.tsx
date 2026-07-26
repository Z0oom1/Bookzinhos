import { useState, useEffect } from "react";
import { Search, BookOpen, Edit3, Send, Bookmark } from "lucide-react";
import { Link } from "react-router";
import { fetchBooks, fetchAllProgress, fetchSavedIds, fetchGlobalStatus, updateGlobalStatus } from "../lib/api";
import { getCoverGradient, getFullUrl } from "../lib/types";
import { BookCard } from "../components/BookCard";
import type { Book, ReadingProgress, GlobalStatus } from "../lib/types";
import { triggerBackgroundCoverGeneration } from "../lib/coverExtractor";
import { useOpenBook } from "../lib/readerChoice";

const THEMES: Record<string, { bg: string; text: string; primary: string; accent: string; border: string; accentText: string }> = {
  "lavender-mint": {
    bg: "from-[var(--lavender)]/20 via-slate-50/40 to-[var(--mint)]/20",
    text: "text-purple-900",
    primary: "text-purple-600 bg-purple-50",
    accent: "rgba(147, 51, 234, 0.08)",
    border: "border-purple-200/50",
    accentText: "text-purple-700"
  },
  "peach-lavender": {
    bg: "from-[var(--peach)]/25 via-slate-50/40 to-[var(--lavender)]/25",
    text: "text-rose-905",
    primary: "text-rose-600 bg-rose-50",
    accent: "rgba(244, 63, 94, 0.08)",
    border: "border-rose-200/50",
    accentText: "text-rose-700"
  },
  "mint-sky": {
    bg: "from-[var(--mint)]/20 via-slate-50/40 to-[var(--sky)]/20",
    text: "text-teal-900",
    primary: "text-teal-600 bg-teal-50",
    accent: "rgba(13, 148, 136, 0.08)",
    border: "border-teal-200/50",
    accentText: "text-teal-700"
  },
  "blush-lavender": {
    bg: "from-[var(--blush)]/30 via-slate-50/40 to-[var(--lavender)]/25",
    text: "text-pink-900",
    primary: "text-pink-600 bg-pink-50",
    accent: "rgba(219, 39, 119, 0.08)",
    border: "border-pink-200/50",
    accentText: "text-pink-700"
  },
  "peach-mint": {
    bg: "from-[var(--peach)]/25 via-slate-50/40 to-[var(--mint)]/25",
    text: "text-amber-900",
    primary: "text-amber-600 bg-amber-50",
    accent: "rgba(217, 119, 6, 0.08)",
    border: "border-amber-200/50",
    accentText: "text-amber-700"
  },
  "lemon-peach": {
    bg: "from-[var(--lemon)]/20 via-slate-50/40 to-[var(--peach)]/25",
    text: "text-amber-950",
    primary: "text-amber-700 bg-amber-50/50",
    accent: "rgba(245, 158, 11, 0.08)",
    border: "border-amber-200/40",
    accentText: "text-amber-800"
  },
  "sky-mint": {
    bg: "from-[var(--sky)]/25 via-slate-50/40 to-[var(--mint)]/25",
    text: "text-sky-900",
    primary: "text-sky-600 bg-sky-50",
    accent: "rgba(2, 132, 199, 0.08)",
    border: "border-sky-200/50",
    accentText: "text-sky-700"
  },
  "lavender-peach": {
    bg: "from-[var(--lavender)]/25 via-slate-50/40 to-[var(--peach)]/25",
    text: "text-indigo-900",
    primary: "text-indigo-600 bg-indigo-50",
    accent: "rgba(79, 70, 229, 0.08)",
    border: "border-indigo-200/50",
    accentText: "text-indigo-700"
  },
  "mint-peach": {
    bg: "from-[var(--mint)]/20 via-slate-50/40 to-[var(--peach)]/25",
    text: "text-emerald-900",
    primary: "text-emerald-600 bg-emerald-50",
    accent: "rgba(5, 150, 105, 0.08)",
    border: "border-emerald-200/50",
    accentText: "text-emerald-700"
  },
  "blush-mint": {
    bg: "from-[var(--blush)]/30 via-slate-50/40 to-[var(--mint)]/25",
    text: "text-rose-900",
    primary: "text-rose-600 bg-rose-50",
    accent: "rgba(225, 29, 72, 0.08)",
    border: "border-rose-200/50",
    accentText: "text-rose-700"
  }
};

const getBookThemeKey = (book: Book) => {
  const list = ["lavender-mint", "peach-lavender", "mint-sky", "blush-lavender", "peach-mint", "lemon-peach", "sky-mint", "lavender-peach", "mint-peach", "blush-mint"];
  return book.coverColor ?? list[parseInt(book.id, 10) % list.length];
};

export function Home() {
  const openBook = useOpenBook();
  const userName = localStorage.getItem("books-username") || "Leitora";
  const [books, setBooks] = useState<Book[]>([]);
  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  const [status, setStatus] = useState<GlobalStatus | null>(null);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [statusInput, setStatusInput] = useState("");
  const [statusEmote, setStatusEmote] = useState("🐼");

  const EMOTES = ["🐼", "💕", "✨", "📖", "📚", "🤍", "🌸", "🍭", "🎈"];

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
        setBooks(b || []);
        setProgress(p || []);
        setSavedIds(s || []);
        setStatus(st);
        setStatusInput(st.content);
        setStatusEmote(st.emote);

        // Gera capa em segundo plano para livros que não possuem capa
        triggerBackgroundCoverGeneration(b || [], (updatedBook) => {
          setBooks((prev) => prev.map((x) => (x.id === updatedBook.id ? updatedBook : x)));
        });
      } catch (err) {
        console.error("Erro ao carregar dados da Home:", err);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();

    // Sincroniza dados a cada 10 segundos
    const interval = setInterval(loadData, 10000);

    // Sincroniza dados quando a página ganha foco
    window.addEventListener("focus", loadData);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", loadData);
    };
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: "Bom dia", icon: "🌅" };
    if (hour >= 12 && hour < 18) return { text: "Boa tarde", icon: "☀️" };
    return { text: "Boa noite", icon: "🌙" };
  };

  // Algoritmo de livro mais lido (maior progresso, desempatando pelo último lido)
  const activeProgress = progress.filter((p) => p.progress > 0);
  const mostReadProgress = activeProgress.length > 0 
    ? [...activeProgress].sort((a, b) => {
        if (b.progress !== a.progress) {
          return b.progress - a.progress;
        }
        return b.lastReadAt - a.lastReadAt;
      })[0] 
    : null;
  const mostReadBook = mostReadProgress 
    ? books.find((b) => b.id === mostReadProgress.bookId) 
    : null;

  const getTheme = () => {
    if (!mostReadBook) return THEMES["lavender-mint"];
    const key = getBookThemeKey(mostReadBook);
    return THEMES[key] || THEMES["lavender-mint"];
  };

  const activeTheme = getTheme();

  const recent = [...books].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)).slice(0, 8);
  
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-5xl animate-bounce-in">🐼</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${activeTheme.bg} no-scrollbar pb-12 transition-all duration-700`}>
      {/* Wrapper Centralizado */}
      <div className="max-w-4xl mx-auto px-6 py-8 md:py-12 space-y-10 animate-fade-in">
        
        {/* HEADER AREA */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className={`text-3xl font-black ${activeTheme.text} tracking-tight transition-colors duration-700`}>
                {getGreeting().text}, {userName}!
              </h1>
              <span className="text-3xl animate-float inline-block select-none">{getGreeting().icon}</span>
            </div>
            
            {/* Status Pill (Compact Shoutbox) */}
            <div 
              onClick={() => {
                setStatusInput(status?.content || "");
                setStatusEmote(status?.emote || "🐼");
                setIsEditingStatus(true);
              }}
              className={`inline-flex items-center gap-2 px-3 py-1.5 bg-white/70 hover:bg-white backdrop-blur-md rounded-full border ${activeTheme.border} shadow-sm cursor-pointer transition-all duration-700 active:scale-95 text-[11px] font-bold text-slate-600 group`}
            >
              <span className="text-base select-none">{status?.emote || "🐼"}</span>
              <span className={`font-black uppercase text-[9px] tracking-wider border-r ${activeTheme.border} pr-2 ${activeTheme.accentText} transition-all duration-700`}>
                {status?.username || "Status"}
              </span>
              <span className="truncate max-w-[150px] md:max-w-[280px] italic text-slate-600 font-medium">
                "{status?.content || "Como você está se sentindo?"}"
              </span>
              <span className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100/50 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                <Edit3 className="w-2.5 h-2.5 text-[var(--primary)]" />
              </span>
            </div>
          </div>

          {/* Search Bar - Minimal & Sleek */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar livros, autores..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/75 backdrop-blur-md rounded-2xl border border-slate-100 focus:border-[var(--primary)]/30 focus:ring-2 focus:ring-[var(--primary)]/5 transition-all text-xs font-semibold text-slate-700 placeholder:text-slate-400 shadow-sm"
            />
          </div>
        </header>

        {/* SEARCH RESULTS IF SEARCH IS ACTIVE */}
        {search.trim() ? (
          <section className="space-y-5 animate-fade-in">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Resultados da Busca</h2>
            {!searchResults || searchResults.length === 0 ? (
              <div className="text-center py-16 bg-white/50 rounded-3xl border border-slate-200/40">
                <p className="text-xs text-slate-400 font-bold">Nenhum livro mágico encontrado. 🐾</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {searchResults.map((book) => {
                  const prog = progress.find((p) => p.bookId === book.id);
                  return <BookCard key={book.id} book={book} progress={prog} />;
                })}
              </div>
            )}
          </section>
        ) : (
          <>
            {/* HERO CURRENT READING */}
            {currentBook && currentlyReading ? (
              <section className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 pl-1">
                  <BookOpen className={`w-4 h-4 ${activeTheme.accentText} transition-colors duration-700`} />
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Leitura Atual</h2>
                </div>
                <div role="button" tabIndex={0} onClick={() => openBook(currentBook)} onKeyDown={(e) => e.key === "Enter" && openBook(currentBook)} className="block group cursor-pointer">
                  <div className={`bg-gradient-to-br ${getCoverGradient(currentBook)} rounded-[2.5rem] p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-white/50 flex flex-col md:flex-row gap-6 md:gap-8 relative overflow-hidden transition-all duration-700 active:scale-[0.995] hover:shadow-[0_25px_60px_rgba(0,0,0,0.12)]`}>
                    
                    {/* Glass backdrop glow */}
                    <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/20 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />
                    
                    {/* Book Cover with 3D-like styling */}
                    <div className="w-28 md:w-36 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/60 relative bg-slate-50 flex-shrink-0 mx-auto md:mx-0 transition-transform duration-500 group-hover:scale-[1.02]">
                      {currentBook.coverImagePath ? (
                        <img src={getFullUrl(currentBook.coverImagePath)!} className="w-full h-full object-cover animate-fade-in" />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(currentBook)} flex items-center justify-center`}>
                          <BookOpen className="w-12 h-12 text-white/50" />
                        </div>
                      )}
                      
                      {/* Floating Badge */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                        <span className="bg-white/95 backdrop-blur px-4 py-1.5 rounded-xl text-[9px] font-black text-slate-800 uppercase tracking-widest shadow-sm">
                          Continuar Lendo
                        </span>
                      </div>
                    </div>
                    
                    {/* Book Metadata & Progress details */}
                    <div className="flex-1 flex flex-col justify-between py-2 text-center md:text-left min-w-0 z-10">
                      <div className="space-y-3">
                        <span className="inline-block px-3 py-1 text-slate-700 bg-white/60 backdrop-blur-sm text-[9px] font-black rounded-full border border-white/50 uppercase tracking-wider">
                          Páginas lidas: {currentlyReading.currentPage + 1} de {currentlyReading.totalPages}
                        </span>
                        <h3 className="font-black text-slate-900 text-xl md:text-2xl line-clamp-1 leading-snug group-hover:text-black transition-colors mt-2">
                          {currentBook.title}
                        </h3>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                          {currentBook.author}
                        </p>
                        <p className="text-xs text-slate-700 line-clamp-2 md:line-clamp-3 leading-relaxed font-semibold mt-2">
                          {currentBook.description || "Sem descrição disponível para este livro."}
                        </p>
                      </div>
                      
                      <div className="space-y-3 pt-6 md:pt-4">
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-700">
                          <span className="bg-white/60 backdrop-blur-sm px-2.5 py-0.5 rounded-md border border-white/50">
                            {currentlyReading.progress}% concluído
                          </span>
                          <span className="text-[9px] font-black uppercase text-slate-800 group-hover:translate-x-1 transition-all duration-750 inline-flex items-center gap-1">
                            Abrir Leitor →
                          </span>
                        </div>
                        
                        {/* Elegant progress bar container that works on a colored background */}
                        <div className="w-full bg-white/30 h-2 rounded-full overflow-hidden shadow-inner border border-white/20">
                          <div 
                            className="bg-white h-full rounded-full transition-all duration-500 shadow-sm" 
                            style={{ width: `${currentlyReading.progress}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              /* No reading active placeholder */
              <section className="animate-fade-in">
                <div className={`bg-white/40 backdrop-blur-md rounded-[2.5rem] p-10 text-center border-2 ${activeTheme.border} space-y-3 shadow-[0_15px_45px_rgba(0,0,0,0.01)] transition-all duration-700`}>
                  <div className="text-4xl select-none">📖</div>
                  <h3 className="font-black text-slate-700 text-sm uppercase tracking-widest">Nenhuma leitura ativa</h3>
                  <p className="text-xs text-slate-400 font-semibold max-w-sm mx-auto leading-relaxed">
                    Sua estante mágica está pronta. Escolha qualquer livro da biblioteca para começar sua próxima jornada.
                  </p>
                  <Link 
                    to="/library" 
                    className="inline-block px-5 py-2.5 bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-md shadow-[var(--primary)]/10 hover:shadow-[var(--primary)]/20 hover:scale-[1.03] active:scale-95 transition-all cursor-pointer"
                  >
                    Escolher Livro
                  </Link>
                </div>
              </section>
            )}

            {/* HORIZONTAL RECENT BOOKS CAROUSEL */}
            <section className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Bookmark className={`w-4 h-4 ${activeTheme.accentText} transition-colors duration-700`} />
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sua Estante Recente</h2>
                </div>
                <Link 
                  to="/library" 
                  className={`text-[9px] font-black ${activeTheme.accentText} uppercase tracking-wider hover:underline transition-colors duration-700`}
                >
                  Ver Tudo
                </Link>
              </div>

              {books.length === 0 ? (
                <div className="text-center py-16 bg-white/40 backdrop-blur-sm rounded-3xl border border-slate-100/50">
                  <p className="text-xs text-slate-400 font-bold">Nenhum livro cadastrado ainda. 🐾</p>
                  <Link to="/upload" className="inline-block mt-3 text-[10px] font-black text-[var(--primary)] uppercase tracking-widest hover:underline">
                    + Enviar primeiro livro
                  </Link>
                </div>
              ) : (
                <div className="flex gap-5 overflow-x-auto no-scrollbar pb-4 pt-1 px-1 snap-x scroll-smooth">
                  {recent.map((book) => {
                    const prog = progress.find((p) => p.bookId === book.id);
                    return (
                      <div key={book.id} className="snap-start flex-shrink-0 w-32 md:w-36">
                        <BookCard book={book} progress={prog} />
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* SHOUTBOX MODAL / EDIT DIALOG (TRANSLUCENT OVERLAY) */}
      {isEditingStatus && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setIsEditingStatus(false)}
        >
          {/* Frosted glass backdrop */}
          <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-sm" />
          
          {/* Modal Container */}
          <div
            className="relative bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-8 space-y-5 shadow-[0_30px_70px_rgba(0,0,0,0.15)] border border-white w-full max-w-md animate-bounce-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5">
              <h3 className="text-slate-800 font-black text-sm uppercase tracking-widest">Atualizar meu Status</h3>
              <p className="text-[10px] text-slate-400 font-bold">Como está sua leitura ou sentimento hoje? ✨</p>
            </div>

            {/* Emotes container */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {EMOTES.map(e => (
                <button 
                  key={e}
                  onClick={() => setStatusEmote(e)}
                  className={`text-2xl p-2 rounded-xl transition-all cursor-pointer ${
                    statusEmote === e 
                      ? "bg-[var(--primary)]/10 scale-110 border border-[var(--primary)]/20" 
                      : "hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>

            {/* Status input textarea */}
            <textarea
              value={statusInput}
              onChange={(e) => setStatusInput(e.target.value)}
              maxLength={100}
              placeholder="Qual seu status do dia?..."
              className="w-full bg-slate-50/70 p-4 rounded-2xl border border-slate-100/50 outline-none text-xs text-slate-700 h-24 resize-none font-semibold placeholder:text-slate-400 border border-slate-100"
            />

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setIsEditingStatus(false)}
                className="flex-grow py-3 bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-400 font-black text-[9px] uppercase tracking-widest rounded-xl transition-colors cursor-pointer active:scale-95"
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdateStatus}
                disabled={!statusInput.trim()}
                className={`flex-grow py-3 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                  !statusInput.trim()
                    ? "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                    : "bg-[var(--primary)] text-white shadow-[var(--primary)]/10 hover:shadow-[var(--primary)]/20 active:scale-[0.98]"
                }`}
              >
                <Send className="w-3.5 h-3.5" /> Salvar Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
