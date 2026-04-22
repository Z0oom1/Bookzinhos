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

  // Group books into chunks of 3 for the shelves
  const chunkSize = 3;
  const chunkedBooks = [];
  for (let i = 0; i < filteredBooks.length; i += chunkSize) {
    chunkedBooks.push(filteredBooks.slice(i, i + chunkSize));
  }

  if (isLoading) return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
      <div className="text-5xl animate-bounce-in">🐼</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-32 overflow-x-hidden">
      {/* Library Wall Texture / Wallpaper */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#E5D9C5 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.5 }} />
      
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8 relative z-10">
        <div className="text-center mb-6 animate-fade-in">
          <h1 className="text-3xl font-black text-[#5C4033] drop-shadow-sm mb-1">A Biblioteca 📚</h1>
          <p className="text-[#8B5A2B] text-sm font-bold">Encontre sua próxima aventura</p>
        </div>

        {/* Search */}
        <div className="relative animate-fade-in mx-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8B5A2B]/60" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar nos pergaminhos..."
            className="w-full pl-12 pr-4 py-4 bg-white/90 backdrop-blur-sm rounded-[2rem] outline-none focus:ring-4 focus:ring-[#8B5A2B]/20 transition-all shadow-md text-[#5C4033] font-medium border-2 border-[#E5D9C5]"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 px-2 custom-scrollbar">
          {availableGenres.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-5 py-2 rounded-2xl whitespace-nowrap transition-all active:scale-95 font-bold text-sm ${
                selectedGenre === genre
                  ? "bg-[#5C4033] text-white shadow-lg shadow-[#5C4033]/30"
                  : "bg-white text-[#8B5A2B] shadow-sm hover:bg-[#F5E6D3] border border-[#E5D9C5]"
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Bookshelf Layout */}
        {filteredBooks.length === 0 ? (
          <div className="text-center py-20 text-[#8B5A2B]/60">
            <div className="text-6xl mb-4 opacity-50 grayscale">🕸️</div>
            <p className="font-bold">Esta seção da biblioteca está vazia...</p>
          </div>
        ) : (
          <div className="space-y-12 mt-10">
            {chunkedBooks.map((row, rowIndex) => (
              <div key={rowIndex} className="relative pt-6 px-4 flex justify-around items-end h-[160px] animate-fade-in" style={{ animationDelay: `${rowIndex * 0.1}s` }}>
                
                {/* The Books */}
                {row.map((book) => (
                  <div key={book.id} className="relative z-10 flex flex-col items-center">
                    <BookCard
                      book={book}
                      variant="shelf"
                      onDeleted={(id) => setBooks((b) => b.filter((x) => x.id !== id))}
                      onEdited={(updated) => setBooks((b) => b.map((x) => x.id === updated.id ? updated : x))}
                    />
                    {/* Small Save heart indicator */}
                    <button
                      onClick={() => handleToggleSave(book.id)}
                      className="absolute -top-3 -right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-md active:scale-95 transition-transform"
                    >
                      {savedIds.includes(book.id) ? "❤️" : "🤍"}
                    </button>
                  </div>
                ))}

                {/* The Wooden Shelf */}
                <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-[#A0522D] to-[#8B4513] rounded-sm shadow-[0_10px_20px_rgba(0,0,0,0.4)] z-0 border-t border-[#CD853F]" />
                <div className="absolute -bottom-2 left-1 right-1 h-2 bg-[#5C4033] rounded-b-md shadow-2xl z-0" />
                
                {/* Shelf Side Brackets (decorative) */}
                <div className="absolute -bottom-4 left-4 w-2 h-6 bg-[#3E2723] rounded-b-sm shadow-md z-0" />
                <div className="absolute -bottom-4 right-4 w-2 h-6 bg-[#3E2723] rounded-b-sm shadow-md z-0" />
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-[#8B5A2B] pt-8 animate-fade-in opacity-70 font-bold">
          💡 Pressione e segure um livro para magias avançadas
        </p>
      </div>
    </div>
  );
}
