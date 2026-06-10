import { useState, useEffect } from "react";
import { Search, BookOpen, Edit3, Send, Sparkles, Clock, UserCheck, Layout, Bookmark } from "lucide-react";
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
  const [desktopTab, setDesktopTab] = useState("geral");
  const [isLoading, setIsLoading] = useState(true);
  
  const [status, setStatus] = useState<GlobalStatus | null>(null);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [statusInput, setStatusInput] = useState("");
  const [statusEmote, setStatusEmote] = useState("🐼");

  const EMOTES = ["🐼", "💕", "✨", "📖", "📚", "🤍", "🌸", "🍭", "🎈"];
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

  // Sidebar Menu on Desktop
  const desktopSidebarMenu = [
    { key: "geral", label: "Painel Geral", icon: Layout },
    { key: "lendo", label: "Leitura Atual", icon: BookOpen, disabled: !currentBook },
    { key: "recomendados", label: "Recomendados", icon: Sparkles },
    { key: "recentes", label: "Mais Recentes", icon: Clock },
    { key: "especial", label: `Especial ${featuredAuthor}`, icon: UserCheck, disabled: authorBooks.length === 0 },
  ];

  return (
    <div className="min-h-screen lg:min-h-0 lg:h-full bg-transparent overflow-x-hidden no-scrollbar">
      {/* Mobile-only View */}
      <div className="lg:hidden max-w-2xl mx-auto px-4 py-6 space-y-8 no-scrollbar">
        {/* Cabeçalho */}
        <div className="animate-fade-in flex justify-between items-center px-1 pt-2">
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--text-main)] tracking-tight">Olá, {userName}! 👋</h1>
            <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest mt-1">Sua estante mágica te espera</p>
          </div>
          <Link to="/profile">
            <div className="w-12 h-12 rounded-[1.25rem] bg-[var(--lavender)]/40 flex items-center justify-center text-2xl shadow-sm hover:scale-105 active:scale-95 transition-all border border-white/80">
              🐼
            </div>
          </Link>
        </div>

        {/* Banner Principal */}
        <div className="relative h-44 rounded-[2.25rem] overflow-hidden bg-[var(--blush)]/70 shadow-[0_12px_40px_rgba(244,63,94,0.05)] animate-scale-in border border-white/30">
          <div className="absolute inset-0 bg-black/[0.02] backdrop-blur-[0.5px]" />
          <div className="absolute top-8 left-8 z-10 space-y-2.5">
            <span className="text-[9px] font-extrabold text-[var(--primary)] bg-white/95 uppercase tracking-widest px-3.5 py-1.5 rounded-full shadow-sm">
              Descoberta
            </span>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight leading-tight">Explore Histórias e<br />Mundos Encantados ✨</h2>
          </div>
          <div className="absolute bottom-4 right-8 text-8xl opacity-15 animate-float select-none pointer-events-none">📖</div>
        </div>

        {/* Status Recente */}
        <div className="animate-fade-in relative">
          {!isEditingStatus ? (
            <div 
              onClick={() => setIsEditingStatus(true)}
              className="bg-white/70 hover:bg-white/90 backdrop-blur-xl p-4.5 rounded-[2rem] border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.04)] transition-all cursor-pointer group active:scale-[0.99] relative overflow-hidden"
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 bg-[var(--blush)]/50 rounded-[1.2rem] flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform duration-300">
                  {status?.emote || "🐼"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--text-main)] font-semibold truncate leading-relaxed">
                    "{status?.content}"
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] font-extrabold text-[var(--primary)] uppercase tracking-widest">
                      {status?.username}
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)] font-medium">
                      • {status ? new Date(status.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                    </span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity border border-slate-100">
                  <Edit3 className="w-3.5 h-3.5 text-[var(--primary)]" />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-[2.25rem] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.08)] space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {EMOTES.map(e => (
                  <button 
                    key={e}
                    onClick={() => setStatusEmote(e)}
                    className={`text-xl p-2 rounded-xl transition-all cursor-pointer ${statusEmote === e ? "bg-[var(--primary)]/10 scale-110" : "hover:bg-slate-50"}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <textarea
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value)}
                maxLength={100}
                placeholder="Como você está se sentindo? ✨"
                className="w-full bg-slate-50 p-4 rounded-2xl border-none outline-none text-xs text-[var(--text-main)] h-20 resize-none font-semibold placeholder:text-[var(--text-muted)]"
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsEditingStatus(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-50 font-bold text-[var(--text-muted)] text-[10px] uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleUpdateStatus}
                  disabled={!statusInput.trim()}
                  className={`flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                    !statusInput.trim()
                      ? "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                      : "bg-[var(--primary)] text-white shadow-[var(--primary)]/10 hover:shadow-[var(--primary)]/20 active:scale-[0.98]"
                  }`}
                >
                  <Send className="w-3.5 h-3.5" /> Enviar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Busca e Categorias */}
        <div className="space-y-4 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--primary)] opacity-70" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar livros, autores..."
              className="w-full pl-12 pr-4.5 py-3.5 bg-white/70 backdrop-blur-xl rounded-[1.75rem] outline-none border border-white/80 focus:border-[var(--primary)]/30 focus:ring-[3px] focus:ring-[var(--primary)]/5 transition-all shadow-[0_8px_30px_rgba(0,0,0,0.01)] text-xs text-[var(--text-main)] font-semibold placeholder:text-[var(--text-muted)]"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-[10px] font-extrabold transition-all border uppercase tracking-widest active:scale-95 cursor-pointer ${
                  activeCategory === cat || (cat === "Todos" && !activeCategory)
                    ? "bg-[var(--primary)] text-white shadow-sm border-transparent"
                    : "bg-white/70 text-[var(--text-muted)] border-white/90 hover:bg-white hover:border-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Listagem de Resultados ou Home Padrão */}
        {searchResults ? (
          <section className="animate-fade-in space-y-4">
            <h2 className="text-xs font-extrabold text-[var(--text-main)] uppercase tracking-widest flex items-center gap-2 px-1">
              <Search className="w-4 h-4 text-[var(--primary)]" />
              Resultados da Busca
            </h2>
            {searchResults.length === 0 ? (
              <div className="text-center py-12 bg-white/50 rounded-[2rem] border border-white/80">
                <p className="text-xs text-[var(--text-muted)] font-bold">Nenhum livro mágico encontrado. 🐾</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {searchResults.map((book) => {
                  const prog = progress.find((p) => p.bookId === book.id);
                  return <BookCard key={book.id} book={book} progress={prog} />;
                })}
              </div>
            )}
          </section>
        ) : (
          <>
            {currentBook && currentlyReading && (
              <section className="animate-fade-in space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[var(--primary)]" />
                    <h2 className="text-[10px] font-extrabold text-[var(--text-main)] uppercase tracking-widest">Leitura Atual</h2>
                  </div>
                </div>
                <Link to={`/read/${currentBook.id}`}>
                  <div className="bg-white/75 hover:bg-white/90 backdrop-blur-xl rounded-[2rem] p-4.5 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-white/80 flex gap-5 group relative overflow-hidden transition-all active:scale-[0.99]">
                    <div className="flex-shrink-0 w-20 h-28 rounded-2xl overflow-hidden shadow-md group-hover:scale-[1.02] transition-transform border border-white/50">
                      {currentBook.coverImagePath ? (
                        <img src={getFullUrl(currentBook.coverImagePath)!} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(currentBook)} flex items-center justify-center`}>
                          <BookOpen className="w-6 h-6 text-white opacity-40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 py-1 flex flex-col justify-between min-w-0">
                      <div>
                        <h3 className="font-extrabold text-[var(--text-main)] text-sm line-clamp-1 mb-1">{currentBook.title}</h3>
                        <p className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">{currentBook.author}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[9px] font-extrabold">
                          <span className="text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded-md">
                            {currentlyReading.progress}% lido
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className="bg-[var(--primary)] h-full transition-all duration-500 rounded-full" 
                            style={{ width: `${currentlyReading.progress}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </section>
            )}

            <section className="animate-fade-in space-y-4">
              <div className="flex items-center gap-1.5 px-1">
                <Sparkles className="w-4 h-4 text-[var(--primary)]" />
                <h2 className="text-[10px] font-extrabold text-[var(--text-main)] uppercase tracking-widest">Recomendados</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {recommended.map((book) => {
                  const prog = progress.find((p) => p.bookId === book.id);
                  return <BookCard key={book.id} book={book} progress={prog} />;
                })}
              </div>
            </section>

            <section className="animate-fade-in space-y-4">
              <div className="flex items-center gap-1.5 px-1">
                <Clock className="w-4 h-4 text-[var(--primary)]" />
                <h2 className="text-[10px] font-extrabold text-[var(--text-main)] uppercase tracking-widest">Recentes</h2>
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 px-1">
                {recent.map((book) => {
                  const prog = progress.find((p) => p.bookId === book.id);
                  return (
                    <div key={book.id} className="w-28 flex-shrink-0">
                      <BookCard book={book} progress={prog} variant="small" />
                    </div>
                  );
                })}
              </div>
            </section>

            {authorBooks.length > 0 && (
              <section className="animate-fade-in space-y-4">
                <div className="flex items-center gap-1.5 px-1">
                  <UserCheck className="w-4 h-4 text-[var(--primary)]" />
                  <h2 className="text-[10px] font-extrabold text-[var(--text-main)] uppercase tracking-widest">Especial {featuredAuthor}</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {authorBooks.map((book) => {
                    const prog = progress.find((p) => p.bookId === book.id);
                    return <BookCard key={book.id} book={book} progress={prog} />;
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Desktop Widescreen Layout (>=lg) */}
      <div className="hidden lg:flex flex-row h-full min-h-[calc(85vh-3.5rem)] bg-slate-50/10 overflow-hidden no-scrollbar">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-slate-100 bg-white p-6 flex flex-col justify-between flex-shrink-0 no-scrollbar">
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Início</h2>
            
            <nav className="space-y-1">
              {desktopSidebarMenu.map((item) => {
                const Icon = item.icon;
                if (item.disabled) return null;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setDesktopTab(item.key);
                      setSearch("");
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      desktopTab === item.key
                        ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    <Icon className="w-4 h-4 opacity-80" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <hr className="border-slate-100" />
            
            {/* Quick Categories */}
            <div className="space-y-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-3">Gêneros</p>
              <div className="flex flex-col gap-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      setActiveCategory(activeCategory === cat ? null : cat);
                      setDesktopTab("geral");
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      activeCategory === cat || (cat === "Todos" && !activeCategory)
                        ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    # {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Right content page */}
        <main className="flex-1 p-8 overflow-y-auto space-y-8 bg-slate-50/30 no-scrollbar">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Olá, {userName}! 👋</h1>
              <p className="text-xs text-slate-400 font-bold">Explore o painel principal da sua estante mágica</p>
            </div>

            {/* Search Bar */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar livros, autores..."
                className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 outline-none focus:border-[var(--primary)]/30 focus:ring-2 focus:ring-[var(--primary)]/5 transition-all text-xs font-semibold text-slate-700 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Search results or selected tabs */}
          {searchResults ? (
            <div className="space-y-4">
              <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Search className="w-4 h-4 text-[var(--primary)]" />
                Resultados da Busca
              </h2>
              {searchResults.length === 0 ? (
                <div className="text-center py-20 text-slate-400 bg-white/50 border border-slate-100 rounded-3xl">
                  <p className="font-bold text-xs">Nenhum livro mágico encontrado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
                  {searchResults.map((book) => {
                    const prog = progress.find((p) => p.bookId === book.id);
                    return <BookCard key={book.id} book={book} progress={prog} />;
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Generalized view tab */}
              {desktopTab === "geral" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                  {/* Left Column (Banner + Status Shoutbox) */}
                  <div className="md:col-span-2 space-y-6">
                    {/* banner */}
                    <div className="relative h-48 rounded-[2.25rem] overflow-hidden bg-[var(--blush)]/70 shadow-sm border border-white/45 flex items-center p-8">
                      <div className="space-y-2">
                        <span className="text-[9px] font-extrabold text-[var(--primary)] bg-white/95 uppercase tracking-widest px-3 py-1 rounded-full">
                          Destaque
                        </span>
                        <h2 className="text-2xl font-black text-slate-800 leading-tight">Explore Histórias e<br />Mundos Encantados ✨</h2>
                      </div>
                      <div className="absolute bottom-4 right-8 text-9xl opacity-10 select-none pointer-events-none">📖</div>
                    </div>

                    {/* Shoutbox widget */}
                    <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] border border-white/80 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest">Shoutbox / Status Recente</h3>
                        {!isEditingStatus && (
                          <button 
                            onClick={() => setIsEditingStatus(true)}
                            className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-wider hover:opacity-85 cursor-pointer"
                          >
                            Atualizar
                          </button>
                        )}
                      </div>

                      {!isEditingStatus ? (
                        <div className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                          <div className="w-12 h-12 bg-[var(--blush)]/50 rounded-xl flex items-center justify-center text-3xl shadow-inner select-none">
                            {status?.emote || "🐼"}
                          </div>
                          <div>
                            <p className="text-xs text-slate-700 font-semibold italic">"{status?.content}"</p>
                            <p className="text-[9px] font-black text-[var(--primary)] uppercase tracking-widest mt-1.5">{status?.username}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            {EMOTES.map(e => (
                              <button 
                                key={e}
                                onClick={() => setStatusEmote(e)}
                                className={`text-xl p-2 rounded-xl transition-all cursor-pointer ${statusEmote === e ? "bg-[var(--primary)]/10 scale-110" : "hover:bg-slate-50"}`}
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={statusInput}
                            onChange={(e) => setStatusInput(e.target.value)}
                            maxLength={100}
                            placeholder="Como você está se sentindo? ✨"
                            className="w-full bg-slate-50 p-4 rounded-2xl border-none outline-none text-xs text-[var(--text-main)] h-20 resize-none font-semibold placeholder:text-[var(--text-muted)]"
                          />
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setIsEditingStatus(false)}
                              className="flex-grow py-2.5 rounded-xl bg-slate-50 font-bold text-[var(--text-muted)] text-[10px] uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                              Cancelar
                            </button>
                            <button 
                              onClick={handleUpdateStatus}
                              disabled={!statusInput.trim()}
                              className={`flex-grow py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                                !statusInput.trim()
                                  ? "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                                  : "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/10"
                              }`}
                            >
                              Enviar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column (Currently Reading) */}
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Em Leitura</h3>
                    {currentBook && currentlyReading ? (
                      <Link to={`/read/${currentBook.id}`} className="block">
                        <div className="bg-white rounded-[2.25rem] p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col gap-4 group">
                          <div className="w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-sm border border-slate-100 flex items-center justify-center relative bg-slate-50">
                            {currentBook.coverImagePath ? (
                              <img src={getFullUrl(currentBook.coverImagePath)!} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300" />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(currentBook)} flex items-center justify-center`}>
                                <BookOpen className="w-12 h-12 text-white opacity-40" />
                              </div>
                            )}
                          </div>
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-extrabold text-slate-800 text-xs line-clamp-1 leading-snug">{currentBook.title}</h4>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{currentBook.author}</p>
                            </div>
                            
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-[9px] font-extrabold text-slate-500">
                                <span>{currentlyReading.progress}% concluído</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden shadow-inner">
                                <div className="bg-[var(--primary)] h-full rounded-full" style={{ width: `${currentlyReading.progress}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div className="bg-white/50 rounded-[2.25rem] p-8 text-center border-2 border-dashed border-slate-200">
                        <p className="text-xs text-slate-400 font-bold">Nenhuma leitura ativa.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Lendo Tab */}
              {desktopTab === "lendo" && currentBook && currentlyReading && (
                <div className="max-w-md mx-auto animate-fade-in">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Leitura Atual</h3>
                  <Link to={`/read/${currentBook.id}`}>
                    <div className="bg-white rounded-[2.5rem] p-6 shadow-md border border-slate-100 flex gap-6 group hover:shadow-lg transition-all">
                      <div className="w-32 aspect-[2/3] rounded-2xl overflow-hidden shadow-md flex-shrink-0">
                        {currentBook.coverImagePath ? (
                          <img src={getFullUrl(currentBook.coverImagePath)!} className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(currentBook)} flex items-center justify-center`}>
                            <BookOpen className="w-12 h-12 text-white opacity-40" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 py-2 flex flex-col justify-between">
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-sm">{currentBook.title}</h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{currentBook.author}</p>
                          <p className="text-xs text-slate-500 line-clamp-3 mt-3 font-medium leading-relaxed">{currentBook.description}</p>
                        </div>
                        <div className="space-y-2.5 pt-4">
                          <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500">
                            <span className="bg-[var(--primary)]/10 text-[var(--primary)] px-2.5 py-0.5 rounded-md">{currentlyReading.progress}% lido</span>
                            <span>Pág. {currentlyReading.currentPage + 1} de {currentlyReading.totalPages}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner">
                            <div className="bg-[var(--primary)] h-full rounded-full" style={{ width: `${currentlyReading.progress}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              )}

              {/* Recomendados Tab */}
              {desktopTab === "recomendados" && (
                <div className="space-y-4 animate-fade-in">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recomendados para Você</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                    {recommended.map((book) => {
                      const prog = progress.find((p) => p.bookId === book.id);
                      return <BookCard key={book.id} book={book} progress={prog} />;
                    })}
                  </div>
                </div>
              )}

              {/* Recentes Tab */}
              {desktopTab === "recentes" && (
                <div className="space-y-4 animate-fade-in">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Livros Recentes</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                    {recent.map((book) => {
                      const prog = progress.find((p) => p.bookId === book.id);
                      return <BookCard key={book.id} book={book} progress={prog} />;
                    })}
                  </div>
                </div>
              )}

              {/* Especial Tab */}
              {desktopTab === "especial" && (
                <div className="space-y-4 animate-fade-in">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Especial do Autor: {featuredAuthor}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                    {authorBooks.map((book) => {
                      const prog = progress.find((p) => p.bookId === book.id);
                      return <BookCard key={book.id} book={book} progress={prog} />;
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
