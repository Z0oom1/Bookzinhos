import { useState, useEffect } from "react";
import { Search, Heart, BookOpen, Edit3, Send, Sparkles, Clock, UserCheck } from "lucide-react";
import { Link } from "react-router";
import { fetchBooks, fetchAllProgress, fetchSavedIds, fetchGlobalStatus, updateGlobalStatus } from "../lib/api";
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

  const EMOTES = ["🐼", "🐼", "🐼", "🐼", "🐼", "🐼", "🐼", "🐼", "🐼"];
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
            emote: "🐼", 
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
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        
        {/* Newspaper Zine Masthead */}
        <div className="border-4 border-black p-4 text-center space-y-2">
          <h1 className="text-3xl font-black tracking-widest uppercase m-0 leading-none">BETA 2.1 BOOKZINHOS</h1>
          <p className="text-[10px] font-bold uppercase tracking-wider border-t border-black pt-2 m-0 flex justify-between px-2">
            <span>DIÁRIO DE LEITURAS EM PRETO E BRANCO</span>
            <span>ED. LIMITADA</span>
            <span>{new Date().toLocaleDateString('pt-BR')}</span>
          </p>
        </div>

        {/* Top Ledger Bar */}
        <div className="border-b-2 border-black flex justify-between items-center text-[10px] font-bold pb-2 uppercase tracking-widest">
          <span>REGISTRO: {userName}</span>
          <div className="flex gap-4">
            <span>STATUS GLOBAL: "{status?.content || "ATIVO"}"</span>
            <Link to="/profile" className="underline hover:bg-black hover:text-white px-1">
              [ VER FICHA DE LEITOR ]
            </Link>
          </div>
        </div>

        {/* Newspaper Two-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Desk / Controls (40%) */}
          <div className="md:col-span-5 space-y-6">
            
            {/* Leitura Atual (Active Desk) */}
            <div className="border border-black p-4 space-y-3">
              <div className="border-b border-black pb-1.5 flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-wider bg-black text-white px-2 py-0.5">MESA DE LEITURA</span>
                {currentlyReading && <span className="text-[10px] font-bold">{currentlyReading.progress}%</span>}
              </div>
              
              {currentBook && currentlyReading ? (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-16 h-24 flex-shrink-0 bg-gray-100">
                      {currentBook.coverImagePath ? (
                        <img src={getFullUrl(currentBook.coverImagePath)!} className="w-full h-full object-cover border border-black" alt={currentBook.title} />
                      ) : (
                        <div className="w-full h-full border border-black flex items-center justify-center text-[10px] font-bold">SEM CAPA</div>
                      )}
                    </div>
                    <div className="flex-grow min-w-0 flex flex-col justify-between py-1">
                      <div>
                        <h3 className="font-black text-sm truncate m-0 leading-tight">{currentBook.title}</h3>
                        <p className="text-[10px] uppercase font-bold text-gray-600 m-0 mt-1">{currentBook.author}</p>
                      </div>
                      <div>
                        {/* ASCII Progress Bar */}
                        <div className="text-[9px] font-mono whitespace-pre leading-none">
                          {(() => {
                            const total = 10;
                            const filled = Math.round((currentlyReading.progress / 100) * total);
                            const empty = total - filled;
                            return `[${'#'.repeat(filled)}${'-'.repeat(empty)}]`;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Link 
                    to={`/read/${currentBook.id}`} 
                    className="block text-center w-full py-2 bg-black text-white text-[10px] font-black uppercase hover:bg-white hover:text-black border border-black"
                  >
                    [ CONTINUAR LEITURA ]
                  </Link>
                </div>
              ) : (
                <div className="text-center py-6 space-y-3">
                  <p className="text-[10px] font-black uppercase text-gray-500 m-0">Nenhum livro aberto na mesa</p>
                  <Link 
                    to="/library" 
                    className="inline-block px-4 py-2 border border-black text-[10px] font-black uppercase hover:bg-black hover:text-white"
                  >
                    [ IR PARA ACERVO ]
                  </Link>
                </div>
              )}
            </div>

            {/* Status Update Card */}
            <div className="border border-black p-4 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider border-b border-black pb-1.5 m-0">ESTADO DO LEITOR</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 border border-black flex items-center justify-center text-2xl bg-gray-50">
                  {status?.emote || "🐼"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold italic m-0">"{status?.content || "Lendo com amor e dedicação..."}"</p>
                </div>
              </div>

              {!isEditingStatus ? (
                <button 
                  onClick={() => setIsEditingStatus(true)} 
                  className="w-full py-1.5 text-center text-[10px] font-black uppercase hover:bg-black hover:text-white"
                >
                  [ ATUALIZAR ESTADO ]
                </button>
              ) : (
                <div className="space-y-2 mt-2 pt-2 border-t border-black">
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {EMOTES.map(e => (
                      <button 
                        key={e} 
                        onClick={() => setStatusEmote(e)} 
                        className={`text-sm p-1 border ${statusEmote === e ? "bg-black text-white" : ""}`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={statusInput}
                    onChange={e => setStatusInput(e.target.value)}
                    maxLength={100}
                    placeholder="Como se sente hoje?"
                    className="w-full p-2 border border-black text-xs font-bold h-16 resize-none outline-none"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsEditingStatus(false)} 
                      className="flex-1 py-1 text-[9px] font-black uppercase bg-gray-50 hover:bg-black hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleUpdateStatus} 
                      disabled={!statusInput.trim()} 
                      className="flex-grow py-1 text-[9px] font-black uppercase bg-black text-white hover:bg-white hover:text-black"
                    >
                      Enviar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Directory links */}
            <div className="border border-black p-3 space-y-2">
              <h4 className="text-[9px] font-black uppercase tracking-widest text-gray-500 m-0">// ARQUIVOS</h4>
              <div className="flex flex-col text-xs font-bold space-y-1">
                <Link to="/library" className="hover:underline py-1 border-b border-dashed border-gray-300">&rarr; CATÁLOGO GERAL</Link>
                <Link to="/profile" className="hover:underline py-1 border-b border-dashed border-gray-300">&rarr; CADASTRO DE LEITOR</Link>
                <Link to="/social" className="hover:underline py-1">&rarr; PAINEL DA COMUNIDADE</Link>
              </div>
            </div>

          </div>

          {/* Right Column: Catalog / Feed (60%) */}
          <div className="md:col-span-7 space-y-6">
            
            {/* Retro Search Console */}
            <div className="border border-black p-3 space-y-2.5">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="PROCURAR NO DIÁRIO (TÍTULO, AUTOR...)"
                className="w-full px-3 py-2 border border-black text-xs font-bold outline-none"
              />
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                    className={`px-3 py-1 text-[9px] font-black uppercase border ${
                      activeCategory === cat || (cat === "Todos" && !activeCategory)
                        ? "bg-black text-white"
                        : "bg-white text-black hover:bg-black hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Search results or Regular feed */}
            {searchResults ? (
              <div className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-wider border-b border-black pb-1.5 m-0">
                  RESULTADO DA BUSCA DE ARQUIVOS
                </h2>
                {searchResults.length === 0 ? (
                  <div className="border-2 border-dashed border-black py-8 text-center text-xs text-gray-500 italic">
                    Nenhum livro catalogado encontrado. 🐼
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {searchResults.map((book) => (
                      <BookCard key={book.id} book={book} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Recommended (Zine List) */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider border-b border-black pb-1.5 m-0 flex justify-between items-center">
                    <span>RECOMENDADOS PELO CONSELHO</span>
                    <span className="text-[9px] font-normal">// ORDENADO POR NOTA</span>
                  </h3>
                  <div className="space-y-1.5">
                    {recommended.map((book, idx) => (
                      <Link 
                        key={book.id} 
                        to={`/book/${book.id}`} 
                        className="block border border-black p-2 hover:bg-black hover:text-white group transition-colors"
                      >
                        <div className="flex justify-between items-center text-xs">
                          <div className="truncate pr-4 flex items-center gap-2">
                            <span className="font-bold text-[9px] bg-black text-white group-hover:bg-white group-hover:text-black px-1.5 py-0.5">
                              {idx + 1}
                            </span>
                            <span className="font-black truncate">{book.title}</span>
                          </div>
                          <div className="flex-shrink-0 flex items-center gap-3">
                            <span className="text-[9px] uppercase font-bold text-gray-500 group-hover:text-white">
                              {book.author}
                            </span>
                            <span className="text-[9px] flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i} className={i < book.rating ? "" : "opacity-35 grayscale"}>🐼</span>
                              ))}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Recentes */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider border-b border-black pb-1.5 m-0">
                    ADICIONADOS RECENTEMENTE
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {recent.slice(0, 4).map((book) => (
                      <BookCard key={book.id} book={book} />
                    ))}
                  </div>
                </div>

                {/* Especial Autor */}
                {authorBooks.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider border-b border-black pb-1.5 m-0">
                      SEÇÃO ESPECIAL: {featuredAuthor.toUpperCase()}
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {authorBooks.map((book) => (
                        <Link 
                          key={book.id} 
                          to={`/book/${book.id}`} 
                          className="block border border-black p-2 hover:bg-black hover:text-white text-xs"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-black">&rarr; {book.title}</span>
                            <span className="text-[9px] uppercase font-bold text-gray-500">{book.genre}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
