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
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-foreground">Meus Livros</h1>
          <Link to="/upload" className="px-4 py-2 bg-primary text-primary-foreground rounded-[12px] transition-all active:scale-95 text-sm">
            + Adicionar
          </Link>
        </div>

        {/* Current Book */}
        {currentBook && currentReading ? (
          <div className="bg-gradient-to-br from-[var(--peach)]/30 via-[var(--lavender)]/30 to-[var(--mint)]/30 rounded-[24px] p-6 shadow-xl border border-white/50 animate-fade-in">
            <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">Continue lendo <span className="animate-pulse-soft">📖</span></p>
            <div className="flex gap-4 mb-4">
              <div className="flex-shrink-0 w-24 h-32 rounded-lg overflow-hidden shadow-lg">{coverContent(currentBook)}</div>
              <div className="flex-1 space-y-2">
                <h2 className="text-foreground">{currentBook.title}</h2>
                <p className="text-sm text-muted-foreground">{currentBook.author}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="text-primary">{currentReading.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-primary via-[var(--mint)] to-primary h-2 rounded-full transition-all" style={{ width: `${currentReading.progress}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">Página {currentReading.currentPage + 1} de {currentReading.totalPages}</p>
                </div>
              </div>
            </div>
            <Link to={`/read/${currentBook.id}`} className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-primary to-[var(--mint)] text-white rounded-[16px] transition-all active:scale-[0.98] shadow-lg hover:shadow-xl">
              <Play className="w-5 h-5 fill-current" />
              Continuar leitura
            </Link>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-[var(--peach)]/20 to-[var(--lavender)]/20 rounded-[24px] p-8 text-center shadow-lg border border-white/50">
            <div className="text-4xl mb-3">📚</div>
            <p className="text-muted-foreground mb-4">Nenhum livro em leitura</p>
            <Link to="/library" className="inline-flex px-6 py-3 bg-gradient-to-r from-primary to-[var(--mint)] text-white rounded-[16px] shadow-lg transition-all active:scale-95">
              Explorar biblioteca
            </Link>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 relative transition-all active:scale-95 ${activeTab === tab.key ? "text-primary" : "text-muted-foreground"}`}
            >
              {tab.label}
              <span className="ml-1 text-xs opacity-60">({progress.filter((p) => p.status === tab.key).length})</span>
              {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-[var(--mint)] rounded-full" />}
            </button>
          ))}
        </div>

        {/* Books Grid */}
        {booksInTab.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-4xl mb-3">{activeTab === "lendo" ? "📖" : activeTab === "finalizado" ? "🎉" : "⏸️"}</div>
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

        <p className="text-center text-xs text-muted-foreground pt-2">
          💡 Pressione e segure um livro para mais opções
        </p>
      </div>
    </div>
  );
}
