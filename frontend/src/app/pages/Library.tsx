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

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-5xl animate-bounce-in">🐼</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-[var(--mint)]/10">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-foreground animate-fade-in">Biblioteca</h1>

        {/* Search */}
        <div className="relative animate-fade-in">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar na biblioteca..."
            className="w-full pl-12 pr-4 py-3 bg-gradient-to-r from-[var(--blush)]/30 to-[var(--sky)]/30 rounded-[16px] outline-none focus:ring-2 focus:ring-primary/50 focus:shadow-lg transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {availableGenres.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-4 py-2 rounded-[12px] whitespace-nowrap transition-all active:scale-95 ${
                selectedGenre === genre
                  ? "bg-gradient-to-r from-primary to-[var(--mint)] text-white shadow-lg"
                  : "bg-white/80 backdrop-blur-sm text-secondary-foreground shadow-sm hover:shadow-md"
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Books — long-press mostra menu, clique vai para detalhes, coração salva */}
        {filteredBooks.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-4xl mb-3">🔍</div>
            <p>Nenhum livro encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBooks.map((book) => (
              <div key={book.id} className="relative">
                <BookCard
                  book={book}
                  variant="list"
                  onDeleted={(id) => setBooks((b) => b.filter((x) => x.id !== id))}
                  onEdited={(updated) => setBooks((b) => b.map((x) => x.id === updated.id ? updated : x))}
                />
                {/* Saved button overlay */}
                <button
                  onClick={() => handleToggleSave(book.id)}
                  className={`absolute top-3 right-3 px-3 py-1.5 rounded-[10px] text-xs transition-all active:scale-95 ${
                    savedIds.includes(book.id)
                      ? "bg-gradient-to-r from-primary to-[var(--mint)] text-white shadow-md"
                      : "bg-white/90 text-muted-foreground"
                  }`}
                >
                  {savedIds.includes(book.id) ? "❤️ Salvo" : "🤍 Salvar"}
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground pt-2 animate-fade-in">
          💡 Pressione e segure um livro para mais opções
        </p>
      </div>
    </div>
  );
}
