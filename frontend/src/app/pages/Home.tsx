import { useState, useEffect } from "react";
import { Search, BookOpen, Edit3, Send, Bookmark, ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { fetchBooks, fetchAllProgress, fetchSavedIds, fetchGlobalStatus, updateGlobalStatus } from "../lib/api";
import { getFullUrl } from "../lib/types";
import { BookCard } from "../components/BookCard";
import type { Book, ReadingProgress, GlobalStatus } from "../lib/types";
import { triggerBackgroundCoverGeneration } from "../lib/coverExtractor";
import { useOpenBook } from "../lib/readerChoice";

export function Home() {
  const openBook = useOpenBook();
  const userName = localStorage.getItem("books-username") || "Leitora";
  const [books, setBooks] = useState<Book[]>([]);
  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [status, setStatus] = useState<GlobalStatus | null>(null);
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [statusInput, setStatusInput] = useState("");
  const [statusEmote, setStatusEmote] = useState("🐼");

  const EMOTES = ["🐼", "💕", "✨", "📖", "📚", "🤍", "🌸", "🍭", "🎈"];

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

  const recent = [...books].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)).slice(0, 8);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-5xl animate-bounce-in">🐼</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Wrapper Centralizado */}
      <div className="max-w-4xl mx-auto px-6 py-8 md:py-12 space-y-10 animate-fade-in">

        {/* HEADER AREA */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                {getGreeting().text}, {userName}
              </h1>
              <span className="text-xl select-none">{getGreeting().icon}</span>
            </div>

            {/* Status Pill (Compact Shoutbox) */}
            <button
              onClick={() => {
                setStatusInput(status?.content || "");
                setStatusEmote(status?.emote || "🐼");
                setIsEditingStatus(true);
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-full border border-slate-100 cursor-pointer transition-colors text-[12px] font-medium text-slate-500 group"
            >
              <span className="text-sm select-none">{status?.emote || "🐼"}</span>
              <span className="font-semibold text-slate-700 border-r border-slate-200 pr-2">
                {status?.username || "Status"}
              </span>
              <span className="truncate max-w-[150px] md:max-w-[280px] text-slate-500">
                {status?.content || "Como você está se sentindo?"}
              </span>
              <Edit3 className="w-3 h-3 text-slate-300 group-hover:text-[var(--primary)] transition-colors ml-1" />
            </button>
          </div>

          {/* Search Bar - Minimal & Sleek */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar livros, autores..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100 focus:border-[var(--primary)]/30 focus:ring-2 focus:ring-[var(--primary)]/5 focus:bg-white transition-all text-sm text-slate-700 placeholder:text-slate-400"
            />
          </div>
        </header>

        {/* SEARCH RESULTS IF SEARCH IS ACTIVE */}
        {search.trim() ? (
          <section className="space-y-5 animate-fade-in">
            <h2 className="text-[13px] font-semibold text-slate-500">Resultados da busca</h2>
            {!searchResults || searchResults.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-sm text-slate-400 font-medium">Nenhum livro encontrado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-8">
                {searchResults.map((book) => {
                  const prog = progress.find((p) => p.bookId === book.id);
                  return <BookCard key={book.id} book={book} progress={prog} />;
                })}
              </div>
            )}
          </section>
        ) : (
          <>
            {/* HERO CURRENT READING */}
            {currentBook && currentlyReading ? (
              <section className="space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 pl-0.5">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <h2 className="text-[12px] font-semibold text-slate-500">Leitura atual</h2>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openBook(currentBook)}
                  onKeyDown={(e) => e.key === "Enter" && openBook(currentBook)}
                  className="group cursor-pointer bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200 p-5 md:p-7 flex flex-col md:flex-row gap-6"
                >
                  {/* Book Cover */}
                  <div className="w-24 md:w-32 aspect-[2/3] rounded-md overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.12),0_6px_16px_-4px_rgba(0,0,0,0.18)] ring-1 ring-black/5 flex-shrink-0 mx-auto md:mx-0 bg-slate-100">
                    {currentBook.coverImagePath ? (
                      <img src={getFullUrl(currentBook.coverImagePath)!} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                        <BookOpen className="w-10 h-10 text-slate-400" />
                      </div>
                    )}
                  </div>

                  {/* Book Metadata & Progress details */}
                  <div className="flex-1 flex flex-col justify-between min-w-0 text-center md:text-left">
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-medium text-slate-400">
                        Página {currentlyReading.currentPage + 1} de {currentlyReading.totalPages}
                      </p>
                      <h3 className="font-semibold text-slate-900 text-lg md:text-xl line-clamp-1 leading-snug">
                        {currentBook.title}
                      </h3>
                      <p className="text-[12px] text-slate-500">{currentBook.author}</p>
                      <p className="text-[13px] text-slate-500 line-clamp-2 leading-relaxed mt-1.5 hidden md:block">
                        {currentBook.description || "Sem descrição disponível para este livro."}
                      </p>
                    </div>

                    <div className="space-y-2.5 pt-4">
                      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div
                          className="bg-[var(--primary)] h-full rounded-full transition-all duration-500"
                          style={{ width: `${currentlyReading.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[12px] font-medium text-slate-500">
                        <span>{currentlyReading.progress}% concluído</span>
                        <span className="text-[var(--primary)] font-semibold inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">
                          Abrir leitor <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              /* No reading active placeholder */
              <section className="animate-fade-in">
                <div className="bg-slate-50 rounded-2xl p-10 text-center border border-slate-100 space-y-3">
                  <div className="text-3xl select-none opacity-60">📖</div>
                  <h3 className="font-semibold text-slate-700 text-sm">Nenhuma leitura ativa</h3>
                  <p className="text-[13px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Sua estante está pronta. Escolha um livro da biblioteca para começar sua próxima leitura.
                  </p>
                  <Link
                    to="/library"
                    className="inline-block px-5 py-2.5 bg-[var(--primary)] text-white text-[12px] font-semibold rounded-lg shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                  >
                    Escolher livro
                  </Link>
                </div>
              </section>
            )}

            {/* HORIZONTAL RECENT BOOKS CAROUSEL */}
            <section className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between px-0.5">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-3.5 h-3.5 text-slate-400" />
                  <h2 className="text-[12px] font-semibold text-slate-500">Sua estante recente</h2>
                </div>
                <Link
                  to="/library"
                  className="text-[12px] font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Ver tudo
                </Link>
              </div>

              {books.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-sm text-slate-400 font-medium">Nenhum livro cadastrado ainda.</p>
                  <Link to="/upload" className="inline-block mt-3 text-[12px] font-semibold text-[var(--primary)] hover:underline">
                    + Enviar primeiro livro
                  </Link>
                </div>
              ) : (
                <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2 pt-1 px-0.5 snap-x scroll-smooth">
                  {recent.map((book) => {
                    const prog = progress.find((p) => p.bookId === book.id);
                    return (
                      <div key={book.id} className="snap-start flex-shrink-0 w-28 md:w-32">
                        <BookCard book={book} progress={prog} />
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* SHOUTBOX MODAL / EDIT DIALOG */}
      {isEditingStatus && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setIsEditingStatus(false)}
        >
          <div className="absolute inset-0 bg-slate-900/20" />

          <div
            className="relative bg-white rounded-2xl p-6 md:p-7 space-y-5 shadow-2xl border border-slate-100 w-full max-w-md animate-bounce-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <h3 className="text-slate-800 font-semibold text-sm">Atualizar meu status</h3>
              <p className="text-[12px] text-slate-400">Como está sua leitura ou sentimento hoje?</p>
            </div>

            {/* Emotes container */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {EMOTES.map(e => (
                <button
                  key={e}
                  onClick={() => setStatusEmote(e)}
                  className={`text-2xl p-2 rounded-lg transition-all cursor-pointer ${
                    statusEmote === e
                      ? "bg-[var(--primary)]/10 border border-[var(--primary)]/20"
                      : "hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>

            {/* Status input textarea */}
            <textarea
              value={statusInput}
              onChange={(e) => setStatusInput(e.target.value)}
              maxLength={100}
              placeholder="Qual seu status do dia?..."
              className="w-full bg-slate-50 p-4 rounded-xl border border-slate-100 outline-none text-sm text-slate-700 h-24 resize-none focus:border-[var(--primary)]/30 focus:ring-2 focus:ring-[var(--primary)]/5 transition-all"
            />

            {/* Modal Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setIsEditingStatus(false)}
                className="flex-grow py-2.5 bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-500 font-medium text-[13px] rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={!statusInput.trim()}
                className={`flex-grow py-2.5 font-medium text-[13px] rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  !statusInput.trim()
                    ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                    : "bg-[var(--primary)] text-white hover:opacity-90"
                }`}
              >
                <Send className="w-3.5 h-3.5" /> Salvar status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
