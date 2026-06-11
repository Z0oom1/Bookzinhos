import { useState, useEffect } from "react";
import { BookOpen, Play, Heart, Bookmark, CheckCircle2, Layers, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { fetchBooks, fetchAllProgress, fetchSavedIds } from "../lib/api";
import { getCoverGradient, getFullUrl } from "../lib/types";
import { BookCard } from "../components/BookCard";
import type { Book, ReadingProgress } from "../lib/types";

type TabKey = "lendo" | "recomendados" | "finalizado" | "favoritos";

export function MyBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("lendo");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = () => {
      Promise.all([fetchBooks(), fetchAllProgress(), fetchSavedIds()])
        .then(([b, p, s]) => {
          setBooks(b || []);
          setProgress(p || []);
          setSavedIds(s || []);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Erro ao carregar estante:", err);
          setIsLoading(false);
        });
    };

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

  const getBook = (id: string) => books.find((b) => b.id === id);

  const recomendadosBooks = (() => {
    const activeBookIds = progress.map(p => p.bookId);
    const activeBooks = books.filter(b => activeBookIds.includes(b.id));
    const genreCounts: Record<string, number> = {};
    activeBooks.forEach(b => {
      if (b.genre) {
        const g = b.genre.trim().toLowerCase();
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      }
    });

    const unread = books.filter(b => !progress.some(p => p.bookId === b.id && (p.status === "finalizado" || p.status === "lendo")));

    if (activeBooks.length > 0) {
      const scored = unread.map(b => {
        const g = (b.genre || "").trim().toLowerCase();
        const score = genreCounts[g] || 0;
        return { book: b, score };
      });
      scored.sort((a, b) => b.score - a.score || b.book.addedAt - a.book.addedAt);
      return scored.map(x => x.book);
    }
    return unread;
  })();

  const booksInTab = activeTab === "favoritos"
    ? books.filter(b => savedIds.includes(b.id))
    : activeTab === "recomendados"
    ? recomendadosBooks
    : books.filter(b => {
        const prog = progress.find(p => p.bookId === b.id);
        return prog && prog.status === activeTab;
      });

  const currentReading = [...progress]
    .filter((p) => p.status === "lendo")
    .sort((a, b) => b.lastReadAt - a.lastReadAt)[0];
  const currentBook = currentReading ? getBook(currentReading.bookId) : null;

  const tabs: { key: TabKey; label: string; count: number; icon: any }[] = [
    { key: "lendo", label: "Lendo", count: progress.filter((p) => p.status === "lendo").length, icon: Layers },
    { key: "recomendados", label: "Recomendados", count: recomendadosBooks.length, icon: Sparkles },
    { key: "finalizado", label: "Lidos", count: progress.filter((p) => p.status === "finalizado").length, icon: CheckCircle2 },
    { key: "favoritos", label: "Estante", count: savedIds.length, icon: Heart },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-5xl animate-bounce-in">🐼</div>
      </div>
    );
  }

  const coverContent = (book: Book) => {
    const url = getFullUrl(book.coverImagePath);
    if (url) return <img src={url} className="w-full h-full object-cover" alt={book.title} />;
    return (
      <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(book)} flex items-center justify-center`}>
        <BookOpen className="w-6 h-6 text-white" />
      </div>
    );
  };

  return (
    <div className="min-h-screen lg:min-h-0 lg:h-full bg-transparent overflow-x-hidden no-scrollbar">
      
      {/* Mobile-only View */}
      <div className="lg:hidden pb-32">
        {/* Cabeçalho */}
        <div className="bg-white/70 backdrop-blur-xl sticky top-0 z-20 px-4 py-4.5 flex items-center justify-between border-b border-white/60 shadow-sm animate-fade-in">
          <h1 className="text-xl font-extrabold text-[var(--text-main)] tracking-tight">
            Minha Estante 📚
          </h1>
          <Link 
            to="/upload" 
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-xl font-extrabold shadow-md hover:shadow-lg active:scale-95 transition-all text-[10px] uppercase tracking-widest"
          >
            + Adicionar
          </Link>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 relative z-10">
          {/* Livro Lendo no Momento */}
          {currentBook && currentReading && activeTab === "lendo" ? (
            <div className="bg-white/70 backdrop-blur-xl rounded-[2.25rem] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-white/80 group relative overflow-hidden animate-fade-in">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--mint)]/10 rounded-bl-full pointer-events-none opacity-50 group-hover:scale-105 transition-transform" />
              <p className="text-[9px] font-extrabold text-[var(--text-main)] mb-3 flex items-center gap-1.5 uppercase tracking-widest">
                <span className="w-5 h-5 rounded-full bg-[var(--mint)]/20 flex items-center justify-center">
                  <BookOpen className="w-3 h-3 text-[var(--mint)]" />
                </span>
                Lendo agora <span className="animate-pulse-soft">✨</span>
              </p>
              <div className="flex gap-5 mb-4 relative z-10">
                <div className="flex-shrink-0 w-20 h-28 rounded-2xl overflow-hidden shadow-md group-hover:scale-[1.02] transition-transform border border-white/50">
                  {coverContent(currentBook)}
                </div>
                <div className="flex-1 space-y-2 flex flex-col justify-center min-w-0">
                  <div>
                    <h2 className="text-base font-extrabold text-[var(--text-main)] leading-tight line-clamp-1">{currentBook.title}</h2>
                    <p className="text-[9px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest mt-0.5">{currentBook.author}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-extrabold">
                      <span className="text-[var(--mint)] bg-[var(--mint)]/10 px-2 py-0.5 rounded-md">
                        {currentReading.progress}% concluído
                      </span>
                      <span className="text-[var(--text-muted)] font-medium">Pág. {currentReading.currentPage + 1} de {currentReading.totalPages}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                      <div 
                        className="bg-[var(--mint)] h-full transition-all duration-500 rounded-full" 
                        style={{ width: `${currentReading.progress}%` }} 
                      />
                    </div>
                  </div>
                </div>
              </div>
              <Link 
                to={`/read/${currentBook.id}`} 
                className="relative z-10 flex items-center justify-center gap-1.5 w-full py-3.5 bg-[var(--primary)] text-white rounded-xl font-extrabold text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] shadow-md hover:shadow-lg"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Continuar
              </Link>
            </div>
          ) : activeTab === "lendo" && (
            <div className="bg-white/50 backdrop-blur-xl rounded-[2.25rem] p-8 text-center shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-white/80 animate-fade-in">
              <div className="text-4xl mb-3 opacity-60">📖</div>
              <p className="text-[10px] text-[var(--text-muted)] font-extrabold uppercase tracking-widest mb-4">Nenhum livro em leitura ativa</p>
              <Link 
                to="/library" 
                className="inline-flex px-6 py-3 bg-[var(--primary)] text-white font-extrabold text-[10px] uppercase tracking-widest rounded-xl shadow-md transition-all active:scale-95 hover:scale-102"
              >
                Ver Biblioteca
              </Link>
            </div>
          )}

          {/* Seleção de Abas */}
          <div className="flex gap-1.5 p-1 bg-white/70 backdrop-blur-md rounded-2xl border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.01)]">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2.5 rounded-xl font-extrabold transition-all text-[9px] uppercase tracking-widest active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === tab.key 
                    ? "bg-white text-[var(--primary)] shadow-sm" 
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md ${
                  activeTab === tab.key ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "bg-slate-100 opacity-60"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Grade de Livros */}
          {booksInTab.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-muted)] bg-white/40 backdrop-blur-sm rounded-[2.25rem] border-2 border-dashed border-[var(--lavender)]/30 shadow-sm font-bold animate-fade-in">
              <div className="text-4xl mb-3 opacity-50">
                {activeTab === "lendo" ? "📖" : activeTab === "finalizado" ? "🎉" : activeTab === "recomendados" ? "✨" : "❤️"}
              </div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest">Nenhum livro nesta categoria</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 animate-fade-in">
              {booksInTab.map((book) => {
                const prog = progress.find((p) => p.bookId === book.id);
                return (
                  <BookCard
                    key={book.id}
                    book={book}
                    progress={prog}
                    variant="grid"
                    onDeleted={(id) => setBooks((b) => b.filter((x) => x.id !== id))}
                    onEdited={(updated) => setBooks((b) => b.map((x) => x.id === updated.id ? updated : x))}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Widescreen Layout (>=lg) */}
      <div className="hidden lg:flex flex-row h-full min-h-[calc(85vh-3.5rem)] bg-slate-50/10 overflow-hidden no-scrollbar">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-slate-100 bg-white p-6 flex flex-col justify-between flex-shrink-0 no-scrollbar">
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Estante</h2>
            
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      activeTab === tab.key
                        ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 opacity-80" />
                      <span>{tab.label}</span>
                    </div>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                      activeTab === tab.key ? "bg-[var(--primary)]/20" : "bg-slate-100"
                    }`}>{tab.count}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Right content page */}
        <main className="flex-1 p-8 overflow-y-auto space-y-8 bg-slate-50/30 no-scrollbar">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                {activeTab === "lendo" ? "Livros Lendo" : activeTab === "finalizado" ? "Livros Concluídos" : activeTab === "recomendados" ? "Recomendações" : "Minha Estante"}
              </h1>
              <p className="text-xs text-slate-400 font-bold">{booksInTab.length} livros salvos</p>
            </div>

            <Link 
              to="/upload" 
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-xl font-extrabold shadow-md hover:shadow-lg active:scale-95 transition-all text-[10px] uppercase tracking-widest"
            >
              + Adicionar Livro
            </Link>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
            {/* Main Books Grid */}
            <div className="xl:col-span-2 space-y-6">
              {booksInTab.length === 0 ? (
                <div className="text-center py-20 text-slate-400 bg-white/50 border border-slate-100 rounded-3xl animate-fade-in">
                  <div className="text-4xl mb-3 opacity-60">📚</div>
                  <p className="font-bold text-xs">Nenhum livro nesta categoria da estante.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 animate-fade-in">
                  {booksInTab.map((book) => {
                    const prog = progress.find((p) => p.bookId === book.id);
                    return (
                      <BookCard
                        key={book.id}
                        book={book}
                        progress={prog}
                        variant="grid"
                        onDeleted={(id) => setBooks((b) => b.filter((x) => x.id !== id))}
                        onEdited={(updated) => setBooks((b) => b.map((x) => x.id === updated.id ? updated : x))}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column (Focus Widget / Lendo no Momento) */}
            {(activeTab === "lendo" || activeTab === "finalizado") && (
              <div className="space-y-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Destaque de Leitura</h3>
                {currentBook && currentReading ? (
                  <div className="bg-white rounded-[2.25rem] p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--mint)]/10 rounded-bl-full pointer-events-none opacity-40 group-hover:scale-105 transition-transform" />
                    <p className="text-[9.5px] font-extrabold text-slate-700 mb-4 flex items-center gap-1.5 uppercase tracking-widest relative z-10">
                      <span className="w-5 h-5 rounded-full bg-[var(--mint)]/20 flex items-center justify-center">
                        <BookOpen className="w-3 h-3 text-[var(--mint)]" />
                      </span>
                      Lendo agora ✨
                    </p>
                    <div className="flex gap-5 mb-5 relative z-10">
                      <div className="flex-shrink-0 w-20 h-28 rounded-2xl overflow-hidden shadow-sm border border-white/50">
                        {coverContent(currentBook)}
                      </div>
                      <div className="flex-1 space-y-2 flex flex-col justify-center min-w-0">
                        <div>
                          <h2 className="text-sm font-extrabold text-slate-800 leading-snug line-clamp-1">{currentBook.title}</h2>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{currentBook.author}</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-[9px] font-extrabold text-slate-500">
                            <span className="text-[var(--mint)] bg-[var(--mint)]/10 px-2 py-0.5 rounded-md">
                              {currentReading.progress}%
                            </span>
                            <span>Pág. {currentReading.currentPage + 1} de {currentReading.totalPages}</span>
                          </div>
                          <div className="w-full bg-slate-50 rounded-full h-1.5 overflow-hidden shadow-inner">
                            <div 
                              className="bg-[var(--mint)] h-full transition-all duration-500 rounded-full" 
                              style={{ width: `${currentReading.progress}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <Link 
                      to={`/read/${currentBook.id}`} 
                      className="relative z-10 flex items-center justify-center gap-1.5 w-full py-3 bg-[var(--primary)] text-white rounded-xl font-extrabold text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] shadow-md hover:shadow-lg"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Continuar
                    </Link>
                  </div>
                ) : (
                  <div className="bg-white/50 rounded-[2.25rem] p-8 text-center border-2 border-dashed border-slate-200">
                    <p className="text-xs text-slate-400 font-bold">Nenhum livro em leitura ativa.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
