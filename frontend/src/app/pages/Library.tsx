import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { fetchBooks, fetchSavedIds, toggleSaved } from "../lib/api";
import { BookCard } from "../components/BookCard";
import type { Book } from "../lib/types";

export function Library() {
  const [books, setBooks] = useState<Book[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [selectedGenre, setSelectedGenre] = useState("Todos");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchBooks(), fetchSavedIds()])
      .then(([b, s]) => {
        setBooks(b);
        setSavedIds(s);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Erro na biblioteca:", err);
        setIsLoading(false);
      });
  }, []);

  const filteredBooks = books.filter((b) => {
    const matchesGenre = selectedGenre === "Todos" || b.genre === selectedGenre;
    const matchesSearch = !search.trim() || b.title.toLowerCase().includes(search.toLowerCase()) || b.author.toLowerCase().includes(search.toLowerCase());
    return matchesGenre && matchesSearch;
  });

  const availableGenres = ["Todos", ...Array.from(new Set(books.map((b) => b.genre))).sort()];

  const handleToggleSave = async (bookId: string) => {
    const currently = savedIds.includes(bookId);
    setSavedIds((prev) => currently ? prev.filter((id) => id !== bookId) : [...prev, bookId]);
    await toggleSaved(bookId, currently);
  };

  const chunkSize = 3;
  const chunkedBooks = [];
  for (let i = 0; i < filteredBooks.length; i += chunkSize) {
    chunkedBooks.push(filteredBooks.slice(i, i + chunkSize));
  }

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-5xl animate-bounce-in">🐼</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent pb-32 overflow-x-hidden">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-6 animate-fade-in">
          <h1 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight mb-1">A Biblioteca 📚</h1>
          <p className="text-[var(--text-muted)] text-[11px] font-bold uppercase tracking-widest mt-1.5">Encontre sua próxima aventura</p>
        </div>

        {/* Search */}
        <div className="relative animate-fade-in mx-1">
          <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--primary)] opacity-70" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar nos pergaminhos..."
            className="w-full pl-12 pr-4.5 py-4 bg-white/70 backdrop-blur-xl rounded-[1.75rem] outline-none border border-white/80 focus:border-[var(--primary)]/30 focus:ring-[3px] focus:ring-[var(--primary)]/5 transition-all shadow-[0_8px_30px_rgba(0,0,0,0.01)] text-xs text-[var(--text-main)] font-semibold placeholder:text-[var(--text-muted)]"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 px-1 custom-scrollbar no-scrollbar">
          {availableGenres.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-4.5 py-2 rounded-full whitespace-nowrap transition-all active:scale-95 font-extrabold text-[10px] border uppercase tracking-widest cursor-pointer ${
                selectedGenre === genre
                  ? "bg-gradient-to-r from-[var(--lavender)] to-[var(--primary)] text-white border-transparent shadow-sm"
                  : "bg-white/70 text-[var(--text-muted)] border-white/95 hover:bg-white hover:border-slate-200"
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Bookshelf Layout */}
        {filteredBooks.length === 0 ? (
          <div className="text-center py-20 text-[var(--text-muted)] bg-white/40 rounded-[2rem] border border-white/50">
            <div className="text-5xl mb-4 opacity-40">🕸️</div>
            <p className="font-bold text-xs">Esta seção da biblioteca está vazia...</p>
          </div>
        ) : (
          <div className="space-y-12 mt-10">
            {chunkedBooks.map((row, rowIndex) => (
              <div key={rowIndex} className="relative pt-6 px-4 flex justify-around items-end h-[160px] animate-fade-in" style={{ animationDelay: `${rowIndex * 0.15}s` }}>
                
                {/* The Books */}
                {row.map((book) => (
                  <div key={book.id} className="relative z-10 flex flex-col items-center">
                    <BookCard
                      book={book}
                      variant="shelf"
                      onDeleted={(id) => setBooks((b) => b.filter((x) => x.id !== id))}
                      onEdited={(updated) => setBooks((b) => b.map((x) => x.id === updated.id ? updated : x))}
                    />
                    
                    {/* Heart Button Indicator */}
                    <button
                      onClick={() => handleToggleSave(book.id)}
                      className="absolute -top-3.5 -right-3.5 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-md active:scale-90 hover:scale-105 transition-transform border border-slate-100 cursor-pointer text-xs"
                    >
                      {savedIds.includes(book.id) ? "❤️" : "🤍"}
                    </button>
                  </div>
                ))}

                {/* The Floating Glass Shelf */}
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-white/35 backdrop-blur-md rounded-md shadow-[0_8px_32px_rgba(244,63,94,0.06)] z-0 border border-white/50" />
                <div className="absolute -bottom-1.5 left-4 right-4 h-1 bg-gradient-to-r from-[var(--lavender)]/20 via-[var(--primary)]/30 to-[var(--mint)]/20 rounded-full blur-[2px] z-0" />
                
                {/* Minimalist Metallic Brackets */}
                <div className="absolute -bottom-3 left-6 w-1.5 h-3.5 bg-slate-300 rounded-b-sm z-0 border-r border-slate-400" />
                <div className="absolute -bottom-3 right-6 w-1.5 h-3.5 bg-slate-300 rounded-b-sm z-0 border-l border-slate-400" />
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-[10px] text-[var(--text-muted)] pt-8 animate-fade-in opacity-70 font-extrabold uppercase tracking-widest">
          💡 Pressione e segure um livro para opções avançadas
        </p>
      </div>
    </div>
  );
}
