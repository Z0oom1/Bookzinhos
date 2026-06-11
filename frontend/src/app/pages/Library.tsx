import { useState, useEffect, useRef } from "react";
import {
  Search, BookOpen, Bookmark, CheckCircle2, Heart, Folder,
  Layers, FileText, Grid, List, Users, Sparkles, Clock
} from "lucide-react";
import { fetchBooks, fetchSavedIds, toggleSaved, fetchAllProgress } from "../lib/api";
import { Link } from "react-router";
import { BookCard } from "../components/BookCard";
import type { Book, ReadingProgress } from "../lib/types";
import { triggerBackgroundCoverGeneration } from "../lib/coverExtractor";

export function Library() {
  const [books, setBooks] = useState<Book[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const [selectedGenre, setSelectedGenre] = useState("Todos");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [search, setSearch] = useState("");
  const [containerWidth, setContainerWidth] = useState(800);
  const mainRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!mainRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(mainRef.current);
    return () => observer.disconnect();
  }, [isLoading]);

  useEffect(() => {
    const loadData = () => {
      Promise.all([fetchBooks(), fetchSavedIds(), fetchAllProgress()])
        .then(([b, s, p]) => {
          setBooks(b || []);
          setSavedIds(s || []);
          setProgress(p || []);
          setIsLoading(false);

          // Gera capa em segundo plano para livros que não possuem capa
          triggerBackgroundCoverGeneration(b || [], (updatedBook) => {
            setBooks((prev) => prev.map((x) => (x.id === updatedBook.id ? updatedBook : x)));
          });
        })
        .catch((err) => {
          console.error("Erro na biblioteca:", err);
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

  const handleToggleSave = async (bookId: string) => {
    const currently = savedIds.includes(bookId);
    setSavedIds((prev) => currently ? prev.filter((id) => id !== bookId) : [...prev, bookId]);
    await toggleSaved(bookId, currently);
  };

  // Agrupar livros por autor de forma insensível a maiúsculas/minúsculas para as prateleiras de autor
  const authorGroups = (() => {
    const groups: { [key: string]: { displayAuthor: string; books: Book[] } } = {};
    books.forEach((book) => {
      const authorName = (book.author || "Autor Desconhecido").trim();
      const key = authorName.toLowerCase();
      if (!groups[key]) {
        groups[key] = { displayAuthor: authorName, books: [] };
      }
      groups[key].books.push(book);
    });
    
    return Object.values(groups).sort((a, b) => 
      a.displayAuthor.localeCompare(b.displayAuthor, "pt", { sensitivity: "base" })
    );
  })();

  const filteredBooksMobile = books.filter((b) => {
    const matchesGenre = selectedGenre === "Todos" || b.genre === selectedGenre;
    const matchesSearch = !search.trim() || b.title.toLowerCase().includes(search.toLowerCase()) || b.author.toLowerCase().includes(search.toLowerCase());
    return matchesGenre && matchesSearch;
  });

  const availableGenres = ["Todos", ...Array.from(new Set(books.map((b) => b.genre))).sort()];

  const lendoBooks = books.filter(b => progress.some(p => p.bookId === b.id && p.status === "lendo"));
  const lidosBooks = books.filter(b => progress.some(p => p.bookId === b.id && p.status === "finalizado"));
  const lerDepoisBooks = books.filter(b => progress.some(p => p.bookId === b.id && p.status === "ler-depois"));
  const favoritosBooks = books.filter(b => savedIds.includes(b.id));

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

  const romanceFavoritos = books.filter(b => b.genre.toLowerCase().includes("romance") && savedIds.includes(b.id));
  const aliHazelwood = books.filter(b => b.author.toLowerCase().includes("ali hazelwood"));
  const ficcaoCientifica = books.filter(b => b.genre.toLowerCase().includes("ficção") || b.genre.toLowerCase().includes("científica"));
  const suspense = books.filter(b => b.genre.toLowerCase().includes("suspense") || b.genre.toLowerCase().includes("thriller"));
  const aestheticReads = books.filter(b => ["sky-mint", "lavender-mint", "peach-lavender"].includes(b.coverColor || ""));

  const getFilteredCategoryBooks = () => {
    let list = books;
    if (selectedCategory === "lendo") {
      list = lendoBooks;
    } else if (selectedCategory === "recomendados") {
      list = recomendadosBooks;
    } else if (selectedCategory === "ler-depois") {
      list = lerDepoisBooks;
    } else if (selectedCategory === "lidos") {
      list = lidosBooks;
    } else if (selectedCategory === "favoritos") {
      list = favoritosBooks;
    } else if (selectedCategory === "pdfs") {
      list = books.filter(b => !!b.pdfPath);
    } else if (selectedCategory === "romances-favoritos") {
      list = romanceFavoritos;
    } else if (selectedCategory === "ali-hazelwood") {
      list = aliHazelwood;
    } else if (selectedCategory === "ficcao-cientifica") {
      list = ficcaoCientifica;
    } else if (selectedCategory === "suspense-thriller") {
      list = suspense;
    } else if (selectedCategory === "aesthetic-reads") {
      list = aestheticReads;
    }

    return list.filter((b) => {
      const matchesGenre = selectedGenre === "Todos" || b.genre === selectedGenre;
      const matchesSearch = !search.trim() || b.title.toLowerCase().includes(search.toLowerCase()) || b.author.toLowerCase().includes(search.toLowerCase());
      return matchesGenre && matchesSearch;
    });
  };

  const filteredBooksByCategory = getFilteredCategoryBooks();

  const sidebarMenu = [
    { key: "todos", label: "Todos os livros", count: books.length, icon: BookOpen },
    { key: "minha-biblioteca", label: "Minha Biblioteca", count: lendoBooks.length + lerDepoisBooks.length + lidosBooks.length, icon: Folder },
    { key: "autores", label: "Autores", count: authorGroups.length, icon: Users },
    { key: "ler-depois", label: "Ler depois", count: lerDepoisBooks.length, icon: Clock },
    { key: "recomendados", label: "Recomendados", count: recomendadosBooks.length, icon: Sparkles },
    { key: "lendo", label: "Lendo", count: lendoBooks.length, icon: Layers },
    { key: "lidos", label: "Lidos", count: lidosBooks.length, icon: CheckCircle2 },
    { key: "favoritos", label: "Favoritos", count: favoritosBooks.length, icon: Heart },
    { key: "pdfs", label: "PDFs", count: books.filter(b => !!b.pdfPath).length, icon: FileText },
  ];

  const collectionsMenu = [
    { key: "romances-favoritos", label: "Romances favoritos", count: romanceFavoritos.length },
    { key: "ali-hazelwood", label: "Ali Hazelwood", count: aliHazelwood.length },
    { key: "ficcao-cientifica", label: "Ficção científica", count: ficcaoCientifica.length },
    { key: "suspense-thriller", label: "Suspense", count: suspense.length },
    { key: "aesthetic-reads", label: "Aesthetic reads", count: aestheticReads.length },
  ];

  const mobileChunkSize = 3;
  const chunkedBooksMobile = [];
  for (let i = 0; i < filteredBooksMobile.length; i += mobileChunkSize) {
    chunkedBooksMobile.push(filteredBooksMobile.slice(i, i + mobileChunkSize));
  }

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-5xl animate-bounce-in">🐼</div>
    </div>
  );

  const renderDesktopShelf = (title: string, booksList: Book[], dotColorClass: string, categoryKey: string, isGrid = false) => {
    if (isGrid) {
      const chunkSize = Math.max(Math.floor((containerWidth - 100) / 128), 2);
      const chunks = [];
      for (let i = 0; i < booksList.length; i += chunkSize) {
        chunks.push(booksList.slice(i, i + chunkSize));
      }

      return (
        <div className="bg-[#faf6f3] rounded-3xl p-6 shadow-sm border border-[#f5ebe6] space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${dotColorClass}`} />
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{title}</span>
            </div>
            {categoryKey && (
              <button
                onClick={() => setSelectedCategory(categoryKey)}
                className="px-3.5 py-1.5 bg-white border border-[#f0e5de] hover:bg-slate-50 text-slate-600 rounded-xl text-[9px] font-bold uppercase tracking-widest active:scale-95 transition-all cursor-pointer"
              >
                Ver todos
              </button>
            )}
          </div>

          {booksList.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-semibold">
              Nenhum livro nesta estante.
            </div>
          ) : (
            <div className="space-y-8">
              {chunks.map((chunk, chunkIdx) => (
                <div key={chunkIdx} className="relative pt-2 pb-6 px-4">
                  <div className="flex justify-start gap-8 items-end relative z-10 px-2">
                    {chunk.map((book) => {
                      const prog = progress.find((p) => p.bookId === book.id);
                      return (
                        <div key={book.id} className="relative z-10 flex flex-col items-center w-24 flex-shrink-0 transition-transform hover:-translate-y-1 hover:scale-105">
                          <BookCard
                            book={book}
                            progress={prog}
                            variant="shelf"
                            onDeleted={(id) => setBooks((b) => b.filter((x) => x.id !== id))}
                            onEdited={(updated) => setBooks((b) => b.map((x) => x.id === updated.id ? updated : x))}
                          />

                          <button
                            onClick={() => handleToggleSave(book.id)}
                            className="absolute -top-2 -right-2 z-20 w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-md active:scale-90 hover:scale-105 transition-transform border border-slate-100 cursor-pointer text-xs"
                          >
                            {savedIds.includes(book.id) ? "❤️" : "🤍"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="absolute bottom-1 left-0 right-0 h-3 bg-gradient-to-b from-[#f3e9e3] to-[#e8dcd5] rounded-full shadow-[0_6px_10px_rgba(0,0,0,0.04)] z-0 border-t border-[#fdfbf9]" />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Horizontal Scrolling Shelf
    return (
      <div className="bg-[#faf6f3] rounded-3xl p-6 shadow-sm border border-[#f5ebe6] space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full ${dotColorClass}`} />
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{title}</span>
          </div>
          {categoryKey && (
            <button
              onClick={() => setSelectedCategory(categoryKey)}
              className="px-3.5 py-1.5 bg-white border border-[#f0e5de] hover:bg-slate-50 text-slate-600 rounded-xl text-[9px] font-bold uppercase tracking-widest active:scale-95 transition-all cursor-pointer"
            >
              Ver todos
            </button>
          )}
        </div>

        {booksList.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs font-semibold">
            Nenhum livro nesta estante.
          </div>
        ) : (
          <div className="relative pt-2 pb-6 px-4">
            <div className="flex justify-start gap-8 items-end relative z-10 px-2 overflow-x-auto styled-scrollbar">
              {booksList.map((book) => {
                const prog = progress.find((p) => p.bookId === book.id);
                return (
                  <div key={book.id} className="relative z-10 flex flex-col items-center w-24 flex-shrink-0 transition-transform hover:-translate-y-1 hover:scale-105 mb-1">
                    <BookCard
                      book={book}
                      progress={prog}
                      variant="shelf"
                      onDeleted={(id) => setBooks((b) => b.filter((x) => x.id !== id))}
                      onEdited={(updated) => setBooks((b) => b.map((x) => x.id === updated.id ? updated : x))}
                    />

                    <button
                      onClick={() => handleToggleSave(book.id)}
                      className="absolute -top-2 -right-2 z-20 w-7 h-7 flex items-center justify-center rounded-full bg-white shadow-md active:scale-90 hover:scale-105 transition-transform border border-slate-100 cursor-pointer text-xs"
                    >
                      {savedIds.includes(book.id) ? "❤️" : "🤍"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="absolute bottom-2 left-0 right-0 h-3 bg-gradient-to-b from-[#f3e9e3] to-[#e8dcd5] rounded-full shadow-[0_6px_10px_rgba(0,0,0,0.04)] z-0 border-t border-[#fdfbf9]" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen lg:min-h-0 lg:h-full bg-transparent overflow-x-hidden">
      {/* Mobile view (<lg) */}
      <div className="lg:hidden max-w-2xl mx-auto px-4 py-8 space-y-8 relative z-10">
        <div className="text-center mb-6 animate-fade-in relative">
          <h1 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight mb-1">A Biblioteca 📚</h1>
          <p className="text-[var(--text-muted)] text-[11px] font-bold uppercase tracking-widest mt-1.5">Encontre sua próxima aventura</p>
          <Link
            to="/upload"
            className="absolute right-0 top-1/2 -translate-y-1/2 px-3.5 py-2 bg-[var(--primary)] text-white rounded-xl font-extrabold text-[9px] uppercase tracking-widest shadow-md hover:scale-102 active:scale-95 transition-all cursor-pointer"
          >
            + Adicionar
          </Link>
        </div>

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

        <div className="flex gap-2 overflow-x-auto pb-2 px-1 custom-scrollbar no-scrollbar">
          {availableGenres.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-4.5 py-2 rounded-full whitespace-nowrap transition-all active:scale-95 font-extrabold text-[10px] border uppercase tracking-widest cursor-pointer ${selectedGenre === genre
                  ? "bg-[var(--primary)] text-white border-transparent shadow-sm"
                  : "bg-white/70 text-[var(--text-muted)] border-white/95 hover:bg-white hover:border-slate-200"
                }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {filteredBooksMobile.length === 0 ? (
          <div className="text-center py-20 text-[var(--text-muted)] bg-white/40 rounded-[2rem] border border-white/50">
            <div className="text-5xl mb-4 opacity-40">🕸️</div>
            <p className="font-bold text-xs">Esta seção da biblioteca está vazia...</p>
          </div>
        ) : (
          <div className="space-y-12 mt-10">
            {chunkedBooksMobile.map((row, rowIndex) => (
              <div key={rowIndex} className="relative pt-6 px-4 flex justify-around items-end h-[160px] animate-fade-in" style={{ animationDelay: `${rowIndex * 0.15}s` }}>

                {row.map((book) => (
                  <div key={book.id} className="relative z-10 flex flex-col items-center">
                    <BookCard
                      book={book}
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
                ))}

                <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-[#A0522D] to-[#8B4513] rounded-sm shadow-[0_10px_20px_rgba(0,0,0,0.4)] z-0 border-t border-[#CD853F]" />
                <div className="absolute -bottom-2 left-1 right-1 h-2 bg-[#5C4033] rounded-b-md shadow-2xl z-0" />

                <div className="absolute -bottom-4 left-4 w-2 h-6 bg-[#3E2723] rounded-b-sm shadow-md z-0" />
                <div className="absolute -bottom-4 right-4 w-2 h-6 bg-[#3E2723] rounded-b-sm shadow-md z-0" />
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-[10px] text-[var(--text-muted)] pt-8 animate-fade-in opacity-70 font-extrabold uppercase tracking-widest">
          💡 Pressione e segure um livro para opções avançadas
        </p>
      </div>

      {/* Desktop view (>=lg) */}
      <div className="hidden lg:flex flex-row h-full min-h-[calc(85vh-3.5rem)] bg-slate-50/10">
        <aside className="w-64 border-r border-slate-100 bg-white p-6 flex flex-col justify-between flex-shrink-0">
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Biblioteca</h2>

            <nav className="space-y-1">
              {sidebarMenu.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setSelectedCategory(item.key);
                      setSelectedGenre("Todos");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${selectedCategory === item.key
                        ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 opacity-80" />
                      <span>{item.label}</span>
                    </div>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${selectedCategory === item.key ? "bg-[var(--primary)]/20" : "bg-slate-100"
                      }`}>{item.count}</span>
                  </button>
                );
              })}
            </nav>

            <hr className="border-slate-100" />

            <div className="space-y-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-3">Coleções</p>
              <nav className="space-y-1">
                {collectionsMenu.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setSelectedCategory(item.key);
                      setSelectedGenre("Todos");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${selectedCategory === item.key
                        ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Folder className="w-4 h-4 opacity-60 text-slate-400" />
                      <span className="truncate max-w-[120px]">{item.label}</span>
                    </div>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${selectedCategory === item.key ? "bg-[var(--primary)]/20" : "bg-slate-100"
                      }`}>{item.count}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </aside>

        <main ref={mainRef} className="flex-1 p-8 overflow-y-auto space-y-8 bg-slate-50/30">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3.5">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Minha Biblioteca</h1>
                <Link
                  to="/upload"
                  className="px-3.5 py-1.5 bg-[var(--primary)] text-white rounded-xl font-extrabold text-[9px] uppercase tracking-widest shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  + Add Livro
                </Link>
              </div>
              <p className="text-xs text-slate-400 font-bold">{filteredBooksByCategory.length} livros</p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 outline-none focus:border-[var(--primary)]/30 transition-all cursor-pointer"
              >
                {availableGenres.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar na biblioteca..."
                  className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 outline-none focus:border-[var(--primary)]/30 focus:ring-2 focus:ring-[var(--primary)]/5 transition-all text-xs font-semibold text-slate-700 placeholder:text-slate-400"
                />
              </div>

              <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-0.5">
                <button className="p-1.5 rounded-lg bg-slate-100 text-slate-700 cursor-pointer transition-colors"><Grid className="w-3.5 h-3.5" /></button>
                <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"><List className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>

          {selectedCategory === "todos" && !search.trim() && selectedGenre === "Todos" ? (
            <div className="space-y-8 animate-fade-in">
              {renderDesktopShelf(
                "Todos os Livros",
                [...books].sort((a, b) => a.title.localeCompare(b.title, "pt")),
                "bg-blue-500",
                "",
                true
              )}
            </div>
          ) : selectedCategory === "minha-biblioteca" && !search.trim() && selectedGenre === "Todos" ? (
            <div className="space-y-8 animate-fade-in">
              {renderDesktopShelf("Lendo", lendoBooks, "bg-purple-500", "lendo")}
              {renderDesktopShelf("Recomendados", recomendadosBooks, "bg-amber-500", "recomendados")}
              {renderDesktopShelf("Ler depois", lerDepoisBooks, "bg-blue-500", "ler-depois")}
              {renderDesktopShelf("Lidos", lidosBooks, "bg-emerald-500", "lidos")}
            </div>
          ) : selectedCategory === "autores" && !search.trim() && selectedGenre === "Todos" ? (
            <div className="space-y-8 animate-fade-in">
              {renderDesktopShelf("Lendo", lendoBooks, "bg-purple-500", "lendo")}
              {renderDesktopShelf("Recomendados", recomendadosBooks, "bg-amber-500", "recomendados")}
              {authorGroups.map((group) => (
                renderDesktopShelf(
                  `Livros de ${group.displayAuthor}`,
                  group.books,
                  "bg-emerald-500",
                  ""
                )
              ))}
            </div>
          ) : (
            filteredBooksByCategory.length === 0 ? (
              <div className="text-center py-20 text-slate-400 bg-white/50 border border-slate-100 rounded-3xl">
                <p className="font-bold text-xs">Nenhum livro encontrado nesta seção.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
                {filteredBooksByCategory.map((book) => {
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
            )
          )}
        </main>
      </div>
    </div>
  );
}
