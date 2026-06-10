import { useState, useEffect } from "react";
import { BookOpen, Play } from "lucide-react";
import { Link } from "react-router";
import { fetchBooks, fetchAllProgress, fetchSavedIds } from "../lib/api";
import { getCoverGradient, getFullUrl } from "../lib/types";
import { BookCard } from "../components/BookCard";
import type { Book, ReadingProgress } from "../lib/types";

type TabKey = "lendo" | "finalizado" | "pausado" | "favoritos";

export function MyBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("lendo");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  const getBook = (id: string) => books.find((b) => b.id === id);

  const booksInTab = activeTab === "favoritos"
    ? books.filter(b => savedIds.includes(b.id))
    : books.filter(b => {
        const prog = progress.find(p => p.bookId === b.id);
        return prog && prog.status === activeTab;
      });

  const currentReading = [...progress]
    .filter((p) => p.status === "lendo")
    .sort((a, b) => b.lastReadAt - a.lastReadAt)[0];
  const currentBook = currentReading ? getBook(currentReading.bookId) : null;

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "lendo", label: "Lendo", count: progress.filter((p) => p.status === "lendo").length },
    { key: "finalizado", label: "Lidos", count: progress.filter((p) => p.status === "finalizado").length },
    { key: "pausado", label: "Pausados", count: progress.filter((p) => p.status === "pausado").length },
    { key: "favoritos", label: "Amei ❤️", count: savedIds.length },
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
    <div className="min-h-screen bg-transparent pb-32 relative overflow-hidden">
      
      {/* Cabeçalho */}
      <div className="bg-white/70 backdrop-blur-xl sticky top-0 z-20 px-4 py-4.5 flex items-center justify-between border-b border-white/60 shadow-sm animate-fade-in">
        <h1 className="text-xl font-extrabold text-[var(--text-main)] bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary)] to-[var(--lavender)] tracking-tight">
          Minha Estante 📚
        </h1>
        <Link 
          to="/upload" 
          className="px-4 py-2 bg-gradient-to-r from-[var(--primary)] to-[var(--peach)] text-white rounded-xl font-extrabold shadow-md hover:shadow-lg active:scale-95 transition-all text-[10px] uppercase tracking-widest"
        >
          + Adicionar
        </Link>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 relative z-10">

        {/* Livro Lendo no Momento */}
        {currentBook && currentReading && activeTab !== "favoritos" ? (
          <div className="bg-white/70 backdrop-blur-xl rounded-[2.25rem] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-white/80 group relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--mint)]/20 to-transparent rounded-bl-full pointer-events-none opacity-50 group-hover:scale-105 transition-transform" />
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
                      className="bg-gradient-to-r from-[var(--mint)] to-[var(--sky)] h-full transition-all duration-500 rounded-full" 
                      style={{ width: `${currentReading.progress}%` }} 
                    />
                  </div>
                </div>
              </div>
            </div>
            <Link 
              to={`/read/${currentBook.id}`} 
              className="relative z-10 flex items-center justify-center gap-1.5 w-full py-3.5 bg-gradient-to-r from-[var(--primary)] to-[var(--mint)] text-white rounded-xl font-extrabold text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] shadow-md hover:shadow-lg"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Continuar
            </Link>
          </div>
        ) : activeTab !== "favoritos" && (
          <div className="bg-white/50 backdrop-blur-xl rounded-[2.25rem] p-8 text-center shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-white/80 animate-fade-in">
            <div className="text-4xl mb-3 opacity-60">📖</div>
            <p className="text-[10px] text-[var(--text-muted)] font-extrabold uppercase tracking-widest mb-4">Nenhum livro em leitura ativa</p>
            <Link 
              to="/library" 
              className="inline-flex px-6 py-3 bg-gradient-to-r from-[var(--lavender)] to-[var(--sky)] text-white font-extrabold text-[10px] uppercase tracking-widest rounded-xl shadow-md transition-all active:scale-95 hover:scale-102"
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
              {activeTab === "lendo" ? "📖" : activeTab === "finalizado" ? "🎉" : activeTab === "pausado" ? "⏸️" : "❤️"}
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
  );
}
