import { useState, useEffect } from "react";
import { Search, BookOpen, Edit3, Send, Sparkles, Clock, UserCheck, Layout, Bookmark, BookMarked, PenTool } from "lucide-react";
import { Link } from "react-router";
import { fetchBooks, fetchAllProgress, fetchSavedIds, fetchGlobalStatus, updateGlobalStatus, fetchStats } from "../lib/api";
import { getCoverGradient, getFullUrl } from "../lib/types";
import { BookCard } from "../components/BookCard";
import type { Book, ReadingProgress, GlobalStatus, Stats } from "../lib/types";
import { triggerBackgroundCoverGeneration } from "../lib/coverExtractor";

export function Home() {
  const userName = localStorage.getItem("books-username") || "Leitora";
  const [books, setBooks] = useState<Book[]>([]);
  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
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
        const [b, p, s, st, stt] = await Promise.all([
          fetchBooks(), 
          fetchAllProgress(), 
          fetchSavedIds(),
          fetchGlobalStatus().catch(() => ({ 
            username: "Sistema", 
            content: "Bem-vindos!", 
            emote: "✨", 
            updated_at: Date.now() 
          })),
          fetchStats().catch(() => ({ finished: 0, reading: 0, notesCount: 0 }))
        ]);
        setBooks(b || []);
        setProgress(p || []);
        setSavedIds(s || []);
        setStatus(st);
        setStatusInput(st.content);
        setStatusEmote(st.emote);
        setStats(stt);

        // Gera capa em segundo plano para livros que não possuem capa
        triggerBackgroundCoverGeneration(b || [], (updatedBook) => {
          setBooks((prev) => prev.map((x) => (x.id === updatedBook.id ? updatedBook : x)));
        });
      } catch (err) {
        console.error("Erro ao carregar dados da Home:", err);
      } finally {
        setIsLoading(false);
      }
    }
    
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: "Bom dia", icon: "🌅" };
    if (hour >= 12 && hour < 18) return { text: "Boa tarde", icon: "☀️" };
    return { text: "Boa noite", icon: "🌙" };
  };

  const statsItems = [
    {
      label: "Minha Estante",
      value: books.length,
      icon: BookMarked,
      colorClass: "bg-[var(--lavender)]/25 text-purple-600 border-purple-100/50",
      iconColor: "text-purple-500",
    },
    {
      label: "Lendo Agora",
      value: progress.filter((p) => p.status === "lendo").length || stats?.reading || 0,
      icon: BookOpen,
      colorClass: "bg-[var(--blush)]/25 text-rose-600 border-rose-100/50",
      iconColor: "text-rose-500",
    },
    {
      label: "Lidos",
      value: progress.filter((p) => p.status === "finalizado").length || stats?.finished || 0,
      icon: Sparkles,
      colorClass: "bg-[var(--mint)]/25 text-teal-600 border-teal-100/50",
      iconColor: "text-teal-500",
    },
    {
      label: "Anotações",
      value: stats?.notesCount || 0,
      icon: PenTool,
      colorClass: "bg-[var(--peach)]/25 text-amber-600 border-amber-100/50",
      iconColor: "text-amber-500",
    }
  ];

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

  // Sidebar Menu on Desktop (Reused as top segmented navigation)
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
      <div className="lg:hidden max-w-2xl mx-auto px-4 py-6 space-y-7 no-scrollbar">
        {/* Cabeçalho */}
        <div className="animate-fade-in flex justify-between items-center px-1 pt-2">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight">
              {getGreeting().text}, {userName}! {getGreeting().icon}
            </h1>
            <p className="text-[var(--text-muted)] text-[9px] font-black uppercase tracking-widest">Sua estante mágica te espera</p>
          </div>
          <Link to="/profile">
            <div className="w-11 h-11 rounded-2xl bg-[var(--lavender)]/30 backdrop-blur-md flex items-center justify-center text-xl shadow-sm hover:scale-105 active:scale-95 transition-all border border-white/80">
              🐼
            </div>
          </Link>
        </div>

        {/* Banner Principal */}
        <div className="relative h-40 rounded-[2.25rem] overflow-hidden bg-gradient-to-br from-[var(--blush)] via-[var(--lavender)]/50 to-[var(--sky)]/40 shadow-[0_12px_45px_-5px_rgba(244,63,94,0.05)] animate-scale-in border border-white/70">
          <div className="absolute inset-0 bg-black/[0.01] backdrop-blur-[0.5px]" />
          <div className="absolute top-7 left-7 z-10 space-y-2">
            <span className="text-[8px] font-black text-[var(--primary)] bg-white/95 uppercase tracking-widest px-3 py-1 rounded-full shadow-sm border border-slate-100/50">
              Descoberta ✨
            </span>
            <h2 className="text-xl font-black text-slate-800 tracking-tight leading-snug">Explore Histórias e<br />Mundos Encantados 💫</h2>
          </div>
          <div className="absolute bottom-2 right-6 text-7xl opacity-20 animate-float select-none pointer-events-none">📖</div>
        </div>

        {/* Estatísticas Grid Mobile */}
        <div className="grid grid-cols-2 gap-3 animate-fade-in">
          {statsItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="bg-white/60 backdrop-blur-md rounded-2xl p-3.5 border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-center gap-3 active:scale-98 transition-all">
                <div className={`p-2 rounded-xl ${item.colorClass} border flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${item.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider truncate">{item.label}</p>
                  <p className="text-base font-black text-slate-850 tracking-tight">{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Status Recente */}
        <div className="animate-fade-in relative">
          {!isEditingStatus ? (
            <div 
              onClick={() => setIsEditingStatus(true)}
              className="bg-white/60 hover:bg-white/80 backdrop-blur-md p-4.5 rounded-[2rem] border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-md transition-all cursor-pointer group active:scale-[0.99] relative overflow-hidden"
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-[var(--blush)] to-[var(--lavender)]/30 rounded-[1.2rem] flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform duration-300">
                  {status?.emote || "🐼"}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[8px] font-black text-[var(--primary)] uppercase tracking-wider bg-[var(--primary)]/10 px-2 py-0.5 rounded-md">
                    {status?.username}
                  </span>
                  <p className="text-xs text-[var(--text-main)] font-bold italic mt-1.5 leading-relaxed">
                    "{status?.content}"
                  </p>
                  <p className="text-[8px] text-[var(--text-muted)] font-bold uppercase tracking-wider mt-1">
                    Atualizado às {status ? new Date(status.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity border border-slate-100/50">
                  <Edit3 className="w-3.5 h-3.5 text-[var(--primary)]" />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-md p-5 rounded-[2rem] border border-white/85 shadow-[0_20px_50px_rgba(0,0,0,0.05)] space-y-4 animate-in zoom-in-95 duration-200">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Como você está se sentindo? ✨</p>
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
                placeholder="Qual seu status do dia?..."
                className="w-full bg-slate-50/70 p-3.5 rounded-xl border border-slate-100/50 outline-none text-xs text-[var(--text-main)] h-20 resize-none font-semibold placeholder:text-[var(--text-muted)]"
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsEditingStatus(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-50 font-black text-[9px] uppercase tracking-widest text-[var(--text-muted)] hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleUpdateStatus}
                  disabled={!statusInput.trim()}
                  className={`flex-1 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                    !statusInput.trim()
                      ? "bg-slate-150 text-slate-350 cursor-not-allowed shadow-none"
                      : "bg-[var(--primary)] text-white shadow-[var(--primary)]/10 hover:shadow-[var(--primary)]/20 active:scale-[0.98]"
                  }`}
                >
                  <Send className="w-3 h-3" /> Enviar
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
            {/* Lendo Agora Mobile */}
            {currentBook && currentlyReading && (
              <section className="animate-fade-in space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[var(--primary)]" />
                    <h2 className="text-[10px] font-extrabold text-[var(--text-main)] uppercase tracking-widest">Leitura Atual</h2>
                  </div>
                </div>
                <Link to={`/read/${currentBook.id}`} className="block group">
                  <div className="bg-white/60 hover:bg-white/80 backdrop-blur-md rounded-[2.25rem] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.015)] border border-white/85 flex gap-5 group relative overflow-hidden transition-all active:scale-[0.99] hover:shadow-md">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-[var(--primary)]/5 rounded-bl-full pointer-events-none" />
                    
                    <div className="flex-shrink-0 w-20 h-28 rounded-2xl overflow-hidden shadow-lg border border-white/60 relative group-hover:scale-102 transition-transform duration-300">
                      {currentBook.coverImagePath ? (
                        <img src={getFullUrl(currentBook.coverImagePath)!} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(currentBook)} flex items-center justify-center`}>
                          <BookOpen className="w-6 h-6 text-white opacity-40" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 py-1 flex flex-col justify-between min-w-0">
                      <div className="space-y-1">
                        <span className="text-[8px] font-black text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Pág. {currentlyReading.currentPage + 1} de {currentlyReading.totalPages}
                        </span>
                        <h3 className="font-black text-[var(--text-main)] text-sm line-clamp-1 group-hover:text-[var(--primary)] transition-colors leading-snug">{currentBook.title}</h3>
                        <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider">{currentBook.author}</p>
                      </div>
                      
                      <div className="space-y-2 pt-2">
                        <div className="flex justify-between items-center text-[9px] font-black">
                          <span className="text-[var(--primary)]">
                            {currentlyReading.progress}% lido
                          </span>
                          <span className="text-slate-400 group-hover:text-[var(--primary)] transition-colors flex items-center gap-1 font-bold text-[8px] uppercase tracking-wider">
                            Lendo →
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden shadow-inner border border-slate-200/20">
                          <div 
                            className="bg-gradient-to-r from-[var(--primary)] to-[var(--lavender)] h-full transition-all duration-500 rounded-full" 
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
      <div className="hidden lg:flex flex-col max-w-6xl mx-auto w-full p-8 space-y-8 animate-fade-in">
        {/* Header e Segmented Control */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 bg-white/50 backdrop-blur-md p-6 rounded-3xl border border-white/80 shadow-[0_12px_40px_rgba(0,0,0,0.025)]">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-850 tracking-tight flex items-center gap-2">
              <span>{getGreeting().text}, {userName}!</span>
              <span className="text-2xl animate-float inline-block select-none">{getGreeting().icon}</span>
            </h1>
            <p className="text-xs text-slate-400 font-bold">Hoje é um ótimo dia para ler uma história mágica ✨</p>
          </div>

          {/* Segmented Control / Navegação de abas da Home */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto shadow-inner border border-slate-200/10">
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
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-98 ${
                    desktopTab === item.key
                      ? "bg-white text-slate-850 shadow-sm border border-slate-100"
                      : "text-slate-500 hover:text-slate-850"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 opacity-80" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Painel de Estatísticas / Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
          {statsItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="bg-white/60 backdrop-blur-md rounded-2xl p-4 border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.015)] flex items-center gap-3.5 hover:shadow-md hover:translate-y-[-2px] transition-all">
                <div className={`p-2.5 rounded-xl ${item.colorClass} border flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${item.iconColor}`} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-450 uppercase tracking-wider">{item.label}</p>
                  <p className="text-xl font-black text-slate-850 tracking-tight">{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Caixa de Busca Principal (Desktop) */}
        <div className="relative w-full max-w-md mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar livros por título, autor..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/65 backdrop-blur-md rounded-2xl border border-white/80 outline-none focus:border-[var(--primary)]/30 focus:ring-2 focus:ring-[var(--primary)]/5 transition-all text-xs font-semibold text-slate-700 placeholder:text-slate-400 shadow-sm"
          />
        </div>

        {/* Conteúdo Principal (Resultados de Busca vs Abas) */}
        {searchResults ? (
          <div className="space-y-4 border border-slate-100 bg-white/50 backdrop-blur-md p-6 rounded-3xl border border-white/85 shadow-[0_12px_40px_rgba(0,0,0,0.015)]">
            <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Search className="w-4 h-4 text-[var(--primary)]" />
              Resultados da Busca (Filtro por Gênero: {activeCategory || "Todos"})
            </h2>
            {searchResults.length === 0 ? (
              <div className="text-center py-20 text-slate-450 bg-white/40 border border-slate-100 rounded-[2rem]">
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
            {/* Aba Painel Geral */}
            {desktopTab === "geral" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fade-in items-start">
                {/* Left/Main Column (2/3 width) */}
                <div className="xl:col-span-2 space-y-8">
                  {/* Banner de destaque */}
                  <div className="relative h-48 rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-[var(--blush)] via-[var(--lavender)]/50 to-[var(--sky)]/40 shadow-[0_12px_45px_-5px_rgba(244,63,94,0.05)] border border-white/70 flex items-center p-8 group transition-all duration-500 hover:shadow-lg">
                    <div className="absolute top-0 right-0 w-44 h-44 bg-white/20 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />
                    <div className="space-y-3 relative z-10">
                      <span className="text-[9px] font-black text-[var(--primary)] bg-white/95 uppercase tracking-widest px-3.5 py-1.5 rounded-full shadow-sm border border-slate-100/50">
                        Estante Mágica ✨
                      </span>
                      <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">Explore Histórias e<br />Mundos Encantados 💫</h2>
                      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Mantenha sua rotina de leitura ativa e divertida</p>
                    </div>
                    <div className="absolute bottom-4 right-8 text-9xl opacity-20 group-hover:rotate-6 transition-transform duration-500 select-none pointer-events-none animate-float">📖</div>
                  </div>

                  {/* Lendo Agora (Se houver leitura ativa) */}
                  {currentBook && currentlyReading ? (
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Leitura Ativa</h3>
                      <Link to={`/read/${currentBook.id}`} className="block group">
                        <div className="bg-white/60 hover:bg-white/80 backdrop-blur-md rounded-[2.5rem] p-6 shadow-[0_10px_35px_rgba(0,0,0,0.015)] hover:shadow-md border border-white/85 transition-all duration-300 flex flex-col md:flex-row gap-6 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--primary)]/5 rounded-bl-full pointer-events-none" />
                          
                          <div className="w-full md:w-32 aspect-[2/3] rounded-2xl overflow-hidden shadow-lg border border-white/60 flex items-center justify-center relative bg-slate-50 flex-shrink-0 transition-transform duration-500 group-hover:scale-102">
                            {currentBook.coverImagePath ? (
                              <img src={getFullUrl(currentBook.coverImagePath)!} className="w-full h-full object-cover" />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(currentBook)} flex items-center justify-center`}>
                                <BookOpen className="w-12 h-12 text-white opacity-40" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                              <span className="bg-white/95 backdrop-blur px-3.5 py-1.5 rounded-xl text-[9px] font-black text-slate-850 uppercase tracking-widest shadow-sm">Continuar Lendo</span>
                            </div>
                          </div>
                          
                          <div className="flex-1 py-1 flex flex-col justify-between min-w-0">
                            <div className="space-y-2">
                              <span className="text-[8px] font-black text-[var(--primary)] bg-[var(--primary)]/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                Lendo Atualmente
                              </span>
                              <h4 className="font-black text-slate-850 text-lg line-clamp-1 leading-snug group-hover:text-[var(--primary)] transition-colors mt-2">{currentBook.title}</h4>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{currentBook.author}</p>
                              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium mt-1">{currentBook.description || "Sem descrição disponível para este livro."}</p>
                            </div>
                            
                            <div className="space-y-2 pt-4">
                              <div className="flex justify-between items-center text-[10px] font-black text-slate-550">
                                <span className="bg-[var(--primary)]/10 text-[var(--primary)] px-2.5 py-0.5 rounded-md">{currentlyReading.progress}% lido</span>
                                <span>Pág. {currentlyReading.currentPage + 1} de {currentlyReading.totalPages}</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner border border-slate-200/10">
                                <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--lavender)] h-full transition-all duration-500" style={{ width: `${currentlyReading.progress}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ) : (
                    <div className="bg-white/40 backdrop-blur-sm rounded-[2.5rem] p-8 text-center border-2 border-dashed border-slate-200/60">
                      <p className="text-xs text-slate-400 font-bold">Nenhuma leitura ativa no momento. Que tal escolher uma história na biblioteca?</p>
                      <Link to="/library" className="inline-block mt-3 px-4 py-2 bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-sm hover:scale-105 active:scale-95 transition-all">Explorar Biblioteca</Link>
                    </div>
                  )}

                  {/* Shoutbox / Status do Casal */}
                  <div className="bg-white/60 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/80 shadow-[0_10px_35px_rgba(0,0,0,0.015)] space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse-soft" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Shoutbox / Status do Casal</h3>
                      </div>
                      {!isEditingStatus && (
                        <button 
                          onClick={() => setIsEditingStatus(true)}
                          className="px-3.5 py-1.5 bg-white/80 hover:bg-slate-50 text-[9px] font-black text-[var(--primary)] border border-slate-100 rounded-xl uppercase tracking-widest active:scale-95 transition-all cursor-pointer shadow-sm"
                        >
                          Atualizar Status
                        </button>
                      )}
                    </div>

                    {!isEditingStatus ? (
                      <div className="flex items-center gap-5 bg-gradient-to-br from-slate-50/60 to-slate-100/30 p-5 rounded-3xl border border-white/60 shadow-inner group">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-4xl shadow-md border border-slate-100/50 select-none group-hover:scale-105 transition-transform duration-300">
                          {status?.emote || "🐼"}
                        </div>
                        <div className="space-y-1.5 min-w-0">
                          <p className="text-xs text-slate-700 font-bold italic leading-relaxed truncate">"{status?.content}"</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-[var(--primary)] uppercase tracking-widest bg-white px-2 py-0.5 rounded-md border border-slate-100/50">{status?.username}</span>
                            <span className="text-[9px] text-slate-400 font-bold">• {status ? new Date(status.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-in zoom-in-95 duration-200">
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
                          className="w-full bg-slate-50 p-4 rounded-2xl border-none outline-none text-xs text-[var(--text-main)] h-20 resize-none font-semibold placeholder:text-[var(--text-muted)] border border-slate-100"
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setIsEditingStatus(false)}
                            className="flex-grow py-2.5 rounded-xl bg-slate-50 font-black text-[var(--text-muted)] text-[9px] uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors"
                          >
                            Cancelar
                          </button>
                          <button 
                            onClick={handleUpdateStatus}
                            disabled={!statusInput.trim()}
                            className={`flex-grow py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                              !statusInput.trim()
                                ? "bg-slate-100 text-slate-350 cursor-not-allowed shadow-none"
                                : "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/10"
                            }`}
                          >
                            Enviar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Recomendados (Inline Geral) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[var(--primary)]" />
                        <h3 className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Recomendados para Você</h3>
                      </div>
                      <button onClick={() => setDesktopTab("recomendados")} className="text-[9px] font-black text-[var(--primary)] uppercase tracking-wider hover:underline">Ver todos</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                      {recommended.slice(0, 3).map((book) => {
                        const prog = progress.find((p) => p.bookId === book.id);
                        return <BookCard key={book.id} book={book} progress={prog} />;
                      })}
                    </div>
                  </div>

                  {/* Especial Autor (Inline Geral) */}
                  {authorBooks.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-[var(--primary)] animate-pulse-soft" />
                          <h3 className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Especial {featuredAuthor}</h3>
                        </div>
                        <button onClick={() => setDesktopTab("especial")} className="text-[9px] font-black text-[var(--primary)] uppercase tracking-wider hover:underline">Ver todos</button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                        {authorBooks.slice(0, 3).map((book) => {
                          const prog = progress.find((p) => p.bookId === book.id);
                          return <BookCard key={book.id} book={book} progress={prog} />;
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column (1/3 width) */}
                <div className="space-y-8">
                  {/* Gêneros Mágicos */}
                  <div className="bg-white/60 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/80 shadow-[0_10px_35px_rgba(0,0,0,0.015)] space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Gêneros Mágicos</h3>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          onClick={() => {
                            setActiveCategory(activeCategory === cat ? null : cat);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer active:scale-95 ${
                            activeCategory === cat || (cat === "Todos" && !activeCategory)
                              ? "bg-[var(--primary)] text-white border-transparent"
                              : "bg-white text-[var(--text-muted)] border-slate-100 hover:border-slate-200"
                          }`}
                        >
                          # {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mais Recentes vertical list stack */}
                  <div className="bg-white/60 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/80 shadow-[0_10px_35px_rgba(0,0,0,0.015)] space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Mais Recentes</h3>
                      <button onClick={() => setDesktopTab("recentes")} className="text-[9px] font-black text-[var(--primary)] uppercase tracking-wider hover:underline">Ver todos</button>
                    </div>
                    <div className="flex flex-col gap-4">
                      {recent.slice(0, 3).map((book) => {
                        const prog = progress.find((p) => p.bookId === book.id);
                        return <BookCard key={book.id} book={book} progress={prog} variant="list" />;
                      })}
                    </div>
                  </div>

                  {/* Atalhos Rápidos */}
                  <div className="bg-white/60 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/80 shadow-[0_10px_35px_rgba(0,0,0,0.015)] space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Atalhos Rápidos</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <Link to="/upload" className="flex flex-col items-center justify-center p-4 bg-slate-50/60 hover:bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all text-center group cursor-pointer">
                        <span className="text-xl group-hover:scale-110 transition-transform">📤</span>
                        <span className="text-[9px] font-black text-slate-650 uppercase tracking-wider mt-2">Enviar Livro</span>
                      </Link>
                      <Link to="/social" className="flex flex-col items-center justify-center p-4 bg-slate-50/60 hover:bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all text-center group cursor-pointer">
                        <span className="text-xl group-hover:scale-110 transition-transform">💬</span>
                        <span className="text-[9px] font-black text-slate-650 uppercase tracking-wider mt-2">Chat Social</span>
                      </Link>
                      <Link to="/notes" className="flex flex-col items-center justify-center p-4 bg-slate-50/60 hover:bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all text-center group cursor-pointer">
                        <span className="text-xl group-hover:scale-110 transition-transform">✍️</span>
                        <span className="text-[9px] font-black text-slate-650 uppercase tracking-wider mt-2">Ver Notas</span>
                      </Link>
                      <Link to="/profile" className="flex flex-col items-center justify-center p-4 bg-slate-50/60 hover:bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all text-center group cursor-pointer">
                        <span className="text-xl group-hover:scale-110 transition-transform">🐼</span>
                        <span className="text-[9px] font-black text-slate-650 uppercase tracking-wider mt-2">Meu Perfil</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Leitura Atual Tab */}
            {desktopTab === "lendo" && currentBook && currentlyReading && (
              <div className="max-w-2xl mx-auto animate-fade-in">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Leitura Atual</h3>
                <Link to={`/read/${currentBook.id}`} className="block group">
                  <div className="bg-white/60 backdrop-blur-md rounded-[2.5rem] p-6 shadow-md border border-white/80 flex gap-6 hover:shadow-lg transition-all">
                    <div className="w-36 aspect-[2/3] rounded-2xl overflow-hidden shadow-lg border border-white/60 flex-shrink-0 transition-transform duration-350 group-hover:scale-102">
                      {currentBook.coverImagePath ? (
                        <img src={getFullUrl(currentBook.coverImagePath)!} className="w-full h-full object-cover animate-fade-in" />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(currentBook)} flex items-center justify-center`}>
                          <BookOpen className="w-12 h-12 text-white opacity-40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 py-2 flex flex-col justify-between min-w-0">
                      <div className="space-y-3">
                        <span className="text-[8px] font-black text-[var(--primary)] bg-[var(--primary)]/10 px-2.5 py-1 rounded-full uppercase tracking-wider">Lendo Agora</span>
                        <h4 className="font-black text-slate-850 text-xl group-hover:text-[var(--primary)] transition-colors leading-snug">{currentBook.title}</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{currentBook.author}</p>
                        <p className="text-xs text-slate-500 line-clamp-4 font-medium leading-relaxed mt-2">{currentBook.description || "Sem descrição disponível para este livro."}</p>
                      </div>
                      <div className="space-y-2.5 pt-4">
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-550">
                          <span className="bg-[var(--primary)]/10 text-[var(--primary)] px-2.5 py-0.5 rounded-md">{currentlyReading.progress}% lido</span>
                          <span>Pág. {currentlyReading.currentPage + 1} de {currentlyReading.totalPages}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner border border-slate-200/10">
                          <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--lavender)] h-full rounded-full" style={{ width: `${currentlyReading.progress}%` }} />
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
      </div>
    </div>
  );
}
