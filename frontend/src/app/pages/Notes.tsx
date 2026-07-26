import { useState, useEffect } from "react";
import { Search, BookOpen, Send, Trash2, Edit3, Sparkles, ChevronRight, Quote, Star } from "lucide-react";
import { useSearchParams } from "react-router";
import { fetchBooks, fetchBookNotes, addNote, deleteNote, fetchAllProgress } from "../lib/api";
import { getCoverGradient, getFullUrl } from "../lib/types";
import type { Book, Note, ReadingProgress } from "../lib/types";

const quickFeedback = ["Amei ❤️", "Confuso 🤔", "Viciante 🔥", "Emocionante 😭", "Chocante 😱"];

export function Notes() {
  const [searchParams] = useSearchParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [bookSearch, setBookSearch] = useState("");

  const [notes, setNotes] = useState<Note[]>([]);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState<ReadingProgress[]>([]);

  // Tab view: "visualizar" or "escrever"
  const [activeTab, setActiveTab] = useState<"visualizar" | "escrever">("visualizar");

  useEffect(() => {
    Promise.all([fetchBooks(), fetchAllProgress()]).then(([b, p]) => {
      setBooks(b || []);
      setProgress(p || []);
      const urlBookId = searchParams.get("bookId");
      if (urlBookId && b.some((book: Book) => book.id === urlBookId)) {
        setSelectedBookId(urlBookId);
      } else if (b.length > 0) {
        setSelectedBookId(b[0].id);
      }
      setIsLoading(false);
    });
  }, [searchParams]);

  useEffect(() => {
    if (!selectedBookId) return;
    fetchBookNotes(selectedBookId).then((n) => setNotes(n || []));
  }, [selectedBookId]);

  const handleSubmit = async () => {
    if (rating === 0 || !feedback.trim()) return;
    setIsSaving(true);
    const newNote = await addNote({ bookId: selectedBookId, feedback: feedback.trim(), rating });
    setNotes((prev) => [newNote, ...prev]);
    setRating(0);
    setFeedback("");
    setIsSaving(false);
    setActiveTab("visualizar");
  };

  const handleDelete = async (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    await deleteNote(noteId);
  };

  const renderPandas = (size: string = "text-4xl") => {
    const displayRating = hoverRating || rating;
    return (
      <div className="flex gap-3 justify-center items-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            onMouseEnter={() => setHoverRating(i + 1)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(i + 1)}
            className={`${size} transition-all duration-200 transform hover:scale-120 active:scale-90 cursor-pointer select-none`}
          >
            {i < displayRating ? "🐼" : "🤍"}
          </button>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-5xl animate-bounce-in">🐼</div>
      </div>
    );
  }

  const filteredBooks = books.filter(b => b.title.toLowerCase().includes(bookSearch.toLowerCase()));
  const selectedBook = books.find(b => b.id === selectedBookId);

  // Média de nota por pandas
  const averageRating = notes.length > 0 
    ? (notes.reduce((sum, n) => sum + n.rating, 0) / notes.length).toFixed(1) 
    : "Sem notas";

  const getBookProgressStatus = (bookId: string) => {
    const prog = progress.find((p) => p.bookId === bookId);
    if (!prog) return null;
    if (prog.status === "finalizado") return { text: "Lido", color: "bg-teal-50 text-teal-600 border-teal-100" };
    if (prog.status === "lendo") return { text: `Lendo (${prog.progress}%)`, color: "bg-rose-50 text-rose-600 border-rose-100" };
    if (prog.status === "pausado") return { text: "Pausado", color: "bg-amber-50 text-amber-600 border-amber-100" };
    return { text: "Ler Depois", color: "bg-slate-50 text-slate-500 border-slate-100" };
  };

  return (
    <div className="min-h-screen md:min-h-0 md:h-full bg-transparent overflow-x-hidden no-scrollbar">
      
      {/* Mobile-only View */}
      <div className="md:hidden pb-32">
        {/* Sticky Header */}
        <div className="bg-white/75 backdrop-blur-xl sticky top-0 z-20 px-4 py-4 flex items-center justify-between border-b border-slate-100 shadow-[0_2px_15px_rgba(0,0,0,0.015)] animate-fade-in">
          <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-1.5">
            <span>Notinhas</span>
            <span className="text-base select-none">✨</span>
          </h1>
          {selectedBook && (
            <span className="text-[9px] font-black uppercase tracking-wider bg-rose-50 text-[var(--primary)] px-2.5 py-1 rounded-full border border-rose-100">
              {selectedBook.title.substring(0, 15)}{selectedBook.title.length > 15 ? "..." : ""}
            </span>
          )}
        </div>

        <div className="max-w-2xl mx-auto px-4 py-5 space-y-6 relative z-10">
          
          {/* Mobile Book Selector (Covers Row) */}
          <div className="bg-white/60 backdrop-blur-md rounded-[2.25rem] p-4.5 shadow-[0_10px_35px_rgba(0,0,0,0.01)] border border-white/80 space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar livro..."
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100/50 rounded-xl outline-none focus:border-[var(--primary)]/30 focus:ring-4 focus:ring-[var(--primary)]/5 transition-all text-xs font-semibold placeholder:text-slate-400"
              />
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 snap-x scroll-smooth no-scrollbar px-1">
              {filteredBooks.map((book) => {
                const isSelected = selectedBookId === book.id;
                const coverUrl = getFullUrl(book.coverImagePath);
                const prog = getBookProgressStatus(book.id);
                return (
                  <button
                    key={book.id}
                    onClick={() => setSelectedBookId(book.id)}
                    className="snap-start flex-shrink-0 flex flex-col items-center w-16 focus:outline-none"
                  >
                    <div className={`w-14 aspect-[2/3] rounded-lg overflow-hidden shadow-md transition-all duration-300 relative ${
                      isSelected ? "ring-4 ring-[var(--primary)] ring-offset-2 scale-105" : "opacity-60"
                    }`}>
                      {coverUrl ? (
                        <img src={coverUrl} className="w-full h-full object-cover" alt={book.title} />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(book)} flex items-center justify-center text-[7px] text-white font-black text-center p-1`}>
                          {book.title.substring(0, 15)}
                        </div>
                      )}
                    </div>
                    <span className={`text-[8px] font-black truncate w-full text-center mt-1.5 transition-colors ${
                      isSelected ? "text-slate-800" : "text-slate-400"
                    }`}>
                      {book.title}
                    </span>
                  </button>
                );
              })}
              {filteredBooks.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center w-full font-bold">Nenhum livro encontrado</p>
              )}
            </div>
          </div>

          {selectedBookId ? (
            <>
              {/* Selected Book Header Metrics */}
              <div className="bg-gradient-to-br from-white/70 to-slate-50/50 backdrop-blur-md rounded-[2.25rem] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] border border-white flex items-center gap-4 animate-scale-in">
                <div className="w-14 aspect-[2/3] rounded-xl overflow-hidden shadow-md flex-shrink-0">
                  {selectedBook?.coverImagePath ? (
                    <img src={getFullUrl(selectedBook.coverImagePath)!} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${selectedBook ? getCoverGradient(selectedBook) : ""} flex items-center justify-center text-[8px] text-white font-bold p-1`} />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <h2 className="text-sm font-black text-slate-800 line-clamp-1">{selectedBook?.title}</h2>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{selectedBook?.author}</p>
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-[9px] font-black text-slate-500 flex items-center gap-1">
                      Média: {averageRating} 🐼
                    </span>
                    <span className="text-[9px] text-slate-350">•</span>
                    <span className="text-[9px] font-black text-slate-500">
                      {notes.length} {notes.length === 1 ? "nota" : "notas"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Segmented Controls Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/10 shadow-inner">
                <button
                  onClick={() => setActiveTab("visualizar")}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === "visualizar"
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  Reflexões ({notes.length})
                </button>
                <button
                  onClick={() => setActiveTab("escrever")}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === "escrever"
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  Escrever ✍️
                </button>
              </div>

              {/* ACTIVE TAB CONTENT */}
              {activeTab === "escrever" ? (
                /* Write Review tab */
                <div className="bg-white/60 backdrop-blur-md rounded-[2.25rem] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.015)] border border-white/80 animate-fade-in space-y-6">
                  <h3 className="text-slate-800 font-black text-center text-xs uppercase tracking-wider">O que achou até agora?</h3>
                  
                  <div className="mb-2">{renderPandas("text-4xl")}</div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {quickFeedback.map((f) => (
                        <button
                          key={f}
                          onClick={() => setFeedback(f)}
                          className={`px-3.5 py-1.5 rounded-full text-[9px] font-black transition-all border uppercase tracking-wider cursor-pointer ${
                            feedback === f
                              ? "bg-[var(--primary)] text-white border-transparent shadow-sm"
                              : "bg-white text-slate-500 hover:bg-slate-50 border-slate-200"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Escreva sua reflexão ou o que está sentindo..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-[var(--primary)]/30 focus:ring-4 focus:ring-[var(--primary)]/5 transition-all resize-none min-h-[120px] text-xs font-semibold placeholder:text-slate-400"
                      />
                      <button
                        onClick={handleSubmit}
                        disabled={isSaving || !feedback.trim() || rating === 0}
                        className={`absolute bottom-3 right-3 p-3.5 rounded-full transition-all duration-300 active:scale-95 shadow-md flex items-center justify-center cursor-pointer ${
                          isSaving || !feedback.trim() || rating === 0
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                            : "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/10 hover:shadow-[var(--primary)]/20"
                        }`}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* View Reviews tab */
                <div className="space-y-4 animate-fade-in">
                  {notes.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 bg-white/40 backdrop-blur-sm rounded-[2rem] border border-slate-200/40 font-bold text-xs shadow-sm">
                      Nenhuma notinha ainda. Que tal ser o primeiro a escrever? ✍️
                    </div>
                  ) : (
                    notes.map((note) => (
                      <div key={note.id} className="bg-white/60 backdrop-blur-md rounded-[2.25rem] p-5.5 border border-white shadow-[0_10px_35px_rgba(0,0,0,0.01)] hover:shadow-md transition-shadow group animate-slide-up relative">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-wider truncate">
                              {note.username || "Leitor"}
                            </span>
                            <span className="text-[8px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
                              {note.date}
                            </span>
                            <div className="flex bg-slate-50/50 px-2 py-0.5 rounded-full border border-slate-100 flex-shrink-0">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i} className="text-[10px] select-none">{i < note.rating ? "🐼" : "🤍"}</span>
                              ))}
                            </div>
                          </div>
                          {note.username?.toLowerCase() === localStorage.getItem("books-username")?.toLowerCase() && (
                            <button
                              onClick={() => handleDelete(note.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 rounded-full transition-colors shadow-sm border border-slate-100 cursor-pointer flex-shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-slate-700 text-xs leading-relaxed font-semibold italic pl-1">
                          "{note.feedback}"
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 text-slate-400 font-extrabold bg-white/45 backdrop-blur-md rounded-[2.5rem] border-2 border-dashed border-[var(--lavender)]/30 uppercase tracking-widest text-xs">
              Adicione livros à biblioteca primeiro 📚
            </div>
          )}
        </div>
      </div>

      {/* Desktop Widescreen Layout (>=lg) - Split Pane */}
      <div className="hidden md:flex flex-row h-full min-h-[calc(85vh-3.5rem)] overflow-hidden no-scrollbar bg-slate-50/10 rounded-3xl border border-white/20">
        
        {/* Left Column (Books Selector Sidebar) */}
        <aside className="w-80 border-r border-slate-100 bg-white p-6 flex flex-col space-y-6 flex-shrink-0 no-scrollbar">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Estante de Livros</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Selecione para ver anotações</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar livro..."
              value={bookSearch}
              onChange={(e) => setBookSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100/50 rounded-xl outline-none focus:border-[var(--primary)]/30 focus:ring-4 focus:ring-[var(--primary)]/5 transition-all text-xs font-semibold placeholder:text-slate-400 shadow-inner"
            />
          </div>

          {/* Books Selector List */}
          <div className="flex-grow overflow-y-auto pr-1 space-y-2.5 no-scrollbar">
            {filteredBooks.map((book) => {
              const isSelected = selectedBookId === book.id;
              const coverUrl = getFullUrl(book.coverImagePath);
              const prog = getBookProgressStatus(book.id);
              
              return (
                <button
                  key={book.id}
                  onClick={() => {
                    setSelectedBookId(book.id);
                    setActiveTab("visualizar");
                  }}
                  className={`w-full flex items-start gap-4 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-slate-50 border-[var(--primary)]/20 shadow-sm"
                      : "bg-white border-transparent hover:bg-slate-50/50 hover:border-slate-100"
                  }`}
                >
                  <div className="w-10 aspect-[2/3] rounded-lg overflow-hidden shadow-sm flex-shrink-0 border border-slate-200/50">
                    {coverUrl ? (
                      <img src={coverUrl} className="w-full h-full object-cover" alt={book.title} />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(book)}`} />
                    )}
                  </div>
                  <div className="min-w-0 space-y-1 flex-1 py-0.5">
                    <h4 className={`text-xs font-black truncate leading-snug transition-colors ${
                      isSelected ? "text-[var(--primary)]" : "text-slate-800"
                    }`}>
                      {book.title}
                    </h4>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider truncate">{book.author}</p>
                    
                    {prog && (
                      <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border mt-1.5 ${prog.color}`}>
                        {prog.text}
                      </span>
                    )}
                  </div>
                  <ChevronRight className={`w-4 h-4 mt-2.5 text-slate-350 transition-transform ${
                    isSelected ? "translate-x-0.5 text-[var(--primary)]" : ""
                  }`} />
                </button>
              );
            })}

            {filteredBooks.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <p className="font-bold text-xs">Nenhum livro cadastrado</p>
              </div>
            )}
          </div>
        </aside>

        {/* Right Column (Workspace) */}
        <main className="flex-1 p-8 overflow-y-auto no-scrollbar flex flex-col space-y-8 bg-slate-50/30">
          {selectedBook ? (
            <div className="flex-grow flex flex-col space-y-8 max-w-4xl mx-auto w-full">
              
              {/* Header Overview Card */}
              <div className={`bg-gradient-to-br ${getCoverGradient(selectedBook)} p-6 md:p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-white flex gap-6 items-center relative overflow-hidden animate-scale-in`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full pointer-events-none" />
                
                <div className="w-20 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/60 flex-shrink-0">
                  {selectedBook.coverImagePath ? (
                    <img src={getFullUrl(selectedBook.coverImagePath)!} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(selectedBook)}`} />
                  )}
                </div>

                <div className="space-y-2 z-10">
                  <span className="inline-block px-3 py-1 bg-white/70 text-slate-700 text-[9px] font-black rounded-full border border-white/50 uppercase tracking-wider">
                    Resenhas & Reflexões
                  </span>
                  <h3 className="font-black text-slate-900 text-2xl leading-tight">
                    {selectedBook.title}
                  </h3>
                  <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest">
                    {selectedBook.author}
                  </p>
                  
                  <div className="flex items-center gap-4 pt-1 text-[10px] font-black text-slate-700">
                    <span className="bg-white/60 px-2.5 py-0.5 rounded-md border border-white/40">
                      Média: {averageRating} 🐼
                    </span>
                    <span className="text-slate-400">•</span>
                    <span>{notes.length} anotações de leitores</span>
                  </div>
                </div>
              </div>

              {/* Segmented control for switching tabs */}
              <div className="flex bg-slate-100/70 backdrop-blur p-1 rounded-2xl w-80 shadow-inner border border-slate-200/10">
                <button
                  onClick={() => setActiveTab("visualizar")}
                  className={`flex-grow py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === "visualizar"
                      ? "bg-white text-slate-800 shadow-sm border border-slate-100"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Todas as Notas ({notes.length})
                </button>
                <button
                  onClick={() => setActiveTab("escrever")}
                  className={`flex-grow py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === "escrever"
                      ? "bg-white text-slate-800 shadow-sm border border-slate-100"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Nova Notinha ✍️
                </button>
              </div>

              {/* TAB CONTENT PANEL */}
              <div className="flex-grow">
                {activeTab === "escrever" ? (
                  /* Write Form */
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-150/40 shadow-[0_12px_45px_-5px_rgba(0,0,0,0.015)] space-y-6 max-w-xl animate-fade-in">
                    <div className="space-y-1.5 text-center">
                      <h4 className="text-slate-800 font-black text-sm uppercase tracking-wider">Escrever Notinha</h4>
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Avalie o livro de 1 a 5 pandas e compartilhe suas reflexões</p>
                    </div>

                    <div className="mb-2">{renderPandas("text-5xl")}</div>

                    <div className="space-y-5">
                      <div className="flex flex-wrap gap-2 justify-center">
                        {quickFeedback.map((f) => (
                          <button
                            key={f}
                            onClick={() => setFeedback(f)}
                            className={`px-4 py-1.5 rounded-full text-[9px] font-black transition-all border uppercase tracking-wider cursor-pointer ${
                              feedback === f
                                ? "bg-[var(--primary)] text-white border-transparent shadow-sm"
                                : "bg-white text-slate-500 hover:bg-slate-50 border-slate-200"
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>

                      <div className="relative">
                        <textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="Digite aqui sua notinha ou reflexão de leitura..."
                          className="w-full px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl outline-none focus:border-[var(--primary)]/30 focus:ring-4 focus:ring-[var(--primary)]/5 transition-all resize-none min-h-[160px] text-xs font-semibold placeholder:text-slate-400"
                        />
                        <button
                          onClick={handleSubmit}
                          disabled={isSaving || !feedback.trim() || rating === 0}
                          className={`absolute bottom-4 right-4 p-4 rounded-full transition-all duration-300 active:scale-95 shadow-md flex items-center justify-center cursor-pointer ${
                            isSaving || !feedback.trim() || rating === 0
                              ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                              : "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/10 hover:shadow-[var(--primary)]/20 hover:scale-105"
                          }`}
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Notes List */
                  <div className="space-y-4 max-h-[58vh] overflow-y-auto pr-2 no-scrollbar animate-fade-in">
                    {notes.length === 0 ? (
                      <div className="text-center py-20 text-slate-400 bg-white/50 border border-slate-100 rounded-[2.5rem]">
                        <p className="font-bold text-xs">Ainda não há nenhuma nota de leitura para este livro. Seja o primeiro a escrever! ✍️</p>
                      </div>
                    ) : (
                      notes.map((note) => (
                        <div key={note.id} className="bg-white p-5 rounded-[2.25rem] border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:shadow-md transition-shadow group relative flex flex-col justify-between animate-slide-up">
                          <div className="flex items-start justify-between gap-4 mb-3.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-wider">
                                {note.username || "Leitor"}
                              </span>
                              <span className="text-[8px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-full">
                                {note.date}
                              </span>
                              <div className="flex bg-slate-50/50 px-2.5 py-0.5 rounded-full border border-slate-100">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <span key={i} className="text-xs select-none">{i < note.rating ? "🐼" : "🤍"}</span>
                                ))}
                              </div>
                            </div>
                            {/* Only show delete button if it belongs to the current user */}
                            {note.username?.toLowerCase() === localStorage.getItem("books-username")?.toLowerCase() && (
                              <button
                                onClick={() => handleDelete(note.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 shadow-sm border border-slate-100 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          
                          <div className="flex gap-2.5 items-start pl-1">
                            <Quote className="w-3.5 h-3.5 text-[var(--primary)]/30 transform rotate-180 flex-shrink-0 mt-0.5" />
                            <p className="text-slate-700 text-xs leading-relaxed font-semibold italic">
                              {note.feedback}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-24 text-slate-400 bg-white/50 border border-slate-100 rounded-[2.5rem] flex flex-col justify-center items-center gap-3">
              <span className="text-3xl select-none">📚</span>
              <p className="font-bold text-xs uppercase tracking-wider">Selecione um livro na barra lateral para ver ou escrever reflexões.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
