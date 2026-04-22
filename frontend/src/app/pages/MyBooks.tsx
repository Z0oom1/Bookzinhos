import { useState, useEffect } from "react";
import { BookOpen, Play } from "lucide-react";
import { Link } from "react-router";
import { fetchBooks, fetchAllProgress } from "../lib/api";
import { getCoverGradient, getFullUrl } from "../lib/types";
import { BookCard } from "../components/BookCard";
import type { Book, ReadingProgress } from "../lib/types";

type TabKey = "lendo" | "finalizado" | "pausado";

export function MyBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("lendo");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchBooks(), fetchAllProgress()]).then(([b, p]) => {
      setBooks(b);
      setProgress(p);
      setIsLoading(false);
    });
  }, []);

  const getBook = (id: string) => books.find((b) => b.id === id);

  const booksInTab = progress
    .filter((p) => p.status === activeTab)
    .sort((a, b) => b.lastReadAt - a.lastReadAt);

  const currentReading = [...progress]
    .filter((p) => p.status === "lendo")
    .sort((a, b) => b.lastReadAt - a.lastReadAt)[0];
  const currentBook = currentReading ? getBook(currentReading.bookId) : null;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "lendo", label: "Lendo" },
    { key: "finalizado", label: "Finalizados" },
    { key: "pausado", label: "Pausados" },
  ];

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-5xl animate-bounce-in">🐼</div>
    </div>
  );

  const coverContent = (book: Book) => {
    const url = getFullUrl(book.coverImagePath);
    if (url) return <img src={url} className="w-full h-full object-cover" alt={book.title} />;
    return (
      <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(book)} flex items-center justify-center`}>
        <BookOpen className="w-8 h-8 text-white" />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-pastel)] pb-24 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[var(--lavender)]/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-[var(--mint)]/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" />

      <div className="bg-white/70 backdrop-blur-xl sticky top-0 z-20 px-4 py-4 flex items-center justify-between border-b border-white/60 shadow-sm">
        <h1 className="text-2xl font-black text-[var(--text-main)] bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary)] to-[var(--lavender)]">Meus Livros 📚</h1>
        <Link to="/upload" className="px-4 py-2 bg-gradient-to-r from-[var(--primary)] to-[var(--peach)] text-white rounded-[1rem] font-bold shadow-md hover:shadow-lg transition-all active:scale-95 text-sm">
          + Adicionar
        </Link>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8 relative z-10">

        {/* Current Book */}
        {currentBook && currentReading ? (
          <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-xl border border-white/60 animate-fade-in group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--mint)]/20 to-transparent rounded-bl-full -z-1 opacity-50 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[var(--mint)]/20 flex items-center justify-center">
                <BookOpen className="w-3 h-3 text-[var(--mint)]" />
              </span>
              Continue lendo <span className="animate-pulse-soft">✨</span>
            </p>
            <div className="flex gap-5 mb-5 relative z-10">
              <div className="flex-shrink-0 w-24 h-36 rounded-xl overflow-hidden shadow-lg group-hover:rotate-2 group-hover:scale-105 transition-all border border-white/50">{coverContent(currentBook)}</div>
              <div className="flex-1 space-y-3 flex flex-col justify-center">
                <div>
                  <h2 className="text-xl font-black text-[var(--text-main)] leading-tight mb-1 line-clamp-2">{currentBook.title}</h2>
                  <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">{currentBook.author}</p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-[var(--mint)] bg-[var(--mint)]/10 px-2 py-0.5 rounded-md">
                      {currentReading.progress}% concluído
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] font-bold">Pág. {currentReading.currentPage + 1} de {currentReading.totalPages}</span>
                  </div>
                  <div className="w-full bg-[var(--bg-pastel)] rounded-full h-2.5 overflow-hidden shadow-inner">
                    <div className="bg-gradient-to-r from-[var(--mint)] to-[var(--sky)] h-full transition-all duration-1000 relative" style={{ width: `${currentReading.progress}%` }}>
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Link to={`/read/${currentBook.id}`} className="relative z-10 flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-[var(--primary)] to-[var(--mint)] text-white rounded-2xl font-black transition-all active:scale-[0.98] shadow-lg hover:shadow-xl">
              <Play className="w-5 h-5 fill-current" />
              Continuar leitura
            </Link>
          </div>
        ) : (
          <div className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] p-10 text-center shadow-sm border border-white">
            <div className="text-5xl mb-4 grayscale opacity-50">📚</div>
            <p className="text-[var(--text-muted)] font-bold mb-6">Nenhum livro em leitura</p>
            <Link to="/library" className="inline-flex px-8 py-4 bg-gradient-to-r from-[var(--lavender)] to-[var(--sky)] text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 hover:scale-105">
              Explorar biblioteca ✨
            </Link>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-white/60 backdrop-blur-md rounded-[1.5rem] border border-white/60 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-3 rounded-2xl font-bold transition-all text-sm active:scale-95 ${
                activeTab === tab.key 
                  ? "bg-white text-[var(--lavender)] shadow-sm" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/40"
              }`}
            >
              {tab.label}
              <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-md ${
                activeTab === tab.key ? "bg-[var(--lavender)]/10 text-[var(--lavender)]" : "bg-black/5 opacity-60"
              }`}>
                {progress.filter((p) => p.status === tab.key).length}
              </span>
            </button>
          ))}
        </div>

        {/* Books Grid */}
        {booksInTab.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-muted)] bg-white/40 backdrop-blur-sm rounded-[2rem] border-2 border-dashed border-[var(--lavender)]/20 shadow-sm font-bold">
            <div className="text-5xl mb-4 opacity-70 grayscale">{activeTab === "lendo" ? "📖" : activeTab === "finalizado" ? "🎉" : "⏸️"}</div>
            <p>Nenhum livro aqui ainda</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {booksInTab.map(({ bookId, progress: pct }) => {
              const book = getBook(bookId);
              if (!book) return null;
              const prog = progress.find((p) => p.bookId === bookId);
              return (
                <BookCard
                  key={bookId}
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

        <p className="text-center text-xs font-bold text-[var(--text-muted)] opacity-70 pt-4">
          💡 Pressione e segure um livro para magias avançadas
        </p>
      </div>
    </div>
  );
}
