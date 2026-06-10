import { useState, useEffect } from "react";
import { Search, BookOpen, Send, Trash2, Edit3 } from "lucide-react";
import { useSearchParams } from "react-router";
import { fetchBooks, fetchBookNotes, addNote, deleteNote } from "../lib/api";
import type { Book, Note } from "../lib/types";

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

  // Desktop active pane view: "escrever" or "visualizar"
  const [desktopTab, setDesktopTab] = useState("Visualizar");

  useEffect(() => {
    fetchBooks().then((b) => {
      setBooks(b || []);
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
    // Switch to visual page after saving note on desktop
    setDesktopTab("Visualizar");
  };

  const handleDelete = async (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    await deleteNote(noteId);
  };

  const renderPandas = () => {
    const displayRating = hoverRating || rating;
    return (
      <div className="flex gap-2.5 justify-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            onMouseEnter={() => setHoverRating(i + 1)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(i + 1)}
            className="text-4xl transition-transform hover:scale-110 active:scale-95 cursor-pointer select-none"
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

  return (
    <div className="min-h-screen lg:min-h-0 lg:h-full bg-transparent overflow-x-hidden no-scrollbar">
      
      {/* Mobile-only View */}
      <div className="lg:hidden pb-32">
        <div className="bg-white/70 backdrop-blur-xl sticky top-0 z-20 px-4 py-4.5 flex items-center justify-between border-b border-white/60 shadow-sm animate-fade-in">
          <h1 className="text-xl font-extrabold text-[var(--text-main)] tracking-tight">Notinhas ✨</h1>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 relative z-10">
          <div className="bg-white/70 backdrop-blur-xl rounded-[2.25rem] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.01)] border border-white/80">
            <h3 className="text-[var(--text-main)] text-sm font-extrabold mb-4 flex items-center gap-2 uppercase tracking-wide">
              <BookOpen className="w-5 h-5 text-[var(--primary)]" />
              Selecione o livro
            </h3>
            
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--primary)] opacity-70" />
              <input
                type="text"
                placeholder="Buscar livro..."
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                className="w-full pl-11 pr-4.5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-[var(--primary)]/30 focus:ring-4 focus:ring-[var(--primary)]/5 transition-all text-xs font-semibold placeholder:text-[var(--text-muted)]"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar snap-x px-1 no-scrollbar">
              {filteredBooks.map((book) => (
                <button
                  key={book.id}
                  onClick={() => setSelectedBookId(book.id)}
                  className={`snap-start flex-shrink-0 px-4 py-2.5 rounded-full text-[10px] font-extrabold whitespace-nowrap transition-all border uppercase tracking-widest cursor-pointer ${
                    selectedBookId === book.id
                      ? "bg-[var(--primary)] text-white border-transparent shadow-sm"
                      : "bg-white text-[var(--text-muted)] hover:bg-slate-50 border-slate-200"
                  }`}
                >
                  {book.title}
                </button>
              ))}
              {filteredBooks.length === 0 && (
                <p className="text-xs text-[var(--text-muted)] py-4 text-center w-full font-bold">Nenhum livro encontrado</p>
              )}
            </div>
          </div>

          {selectedBookId ? (
            <>
              <div className="bg-white/70 backdrop-blur-xl rounded-[2.25rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-white/80 animate-fade-in relative overflow-hidden group">
                <h2 className="text-[var(--text-main)] font-extrabold text-center text-sm mb-6 uppercase tracking-wider">O que você achou até agora?</h2>
                
                <div className="mb-8">{renderPandas()}</div>

                <div className="space-y-6 relative z-10">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {quickFeedback.map((f) => (
                      <button
                        key={f}
                        onClick={() => setFeedback(f)}
                        className={`px-4.5 py-2 rounded-full text-[10px] font-extrabold transition-all border uppercase tracking-widest cursor-pointer ${
                          feedback === f
                            ? "bg-[var(--primary)] text-white border-transparent shadow-sm"
                            : "bg-white text-[var(--text-muted)] hover:bg-slate-50 border-slate-200"
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
                      placeholder="Ou escreva o que está sentindo..."
                      className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-[var(--primary)]/30 focus:ring-4 focus:ring-[var(--primary)]/5 transition-all resize-none min-h-[120px] text-xs font-semibold placeholder:text-[var(--text-muted)]"
                    />
                    <button
                      onClick={handleSubmit}
                      disabled={isSaving || !feedback.trim() || rating === 0}
                      className={`absolute bottom-3 right-3 p-3.5 rounded-full transition-all duration-300 active:scale-95 shadow-md flex items-center justify-center cursor-pointer ${
                        isSaving || !feedback.trim() || rating === 0
                          ? "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                          : "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/10 hover:-translate-y-0.5 hover:shadow-[var(--primary)]/20"
                      }`}
                    >
                      <Send className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-extrabold text-[var(--text-main)] uppercase tracking-widest pl-2">Suas notinhas</h3>
                {notes.length === 0 ? (
                  <div className="text-center py-12 text-[var(--text-muted)] bg-white/40 backdrop-blur-sm rounded-[2rem] border border-white/80 font-bold text-xs shadow-sm">
                    Nenhuma notinha ainda. Que tal escrever a primeira? ✍️
                  </div>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="bg-white/70 backdrop-blur-xl rounded-[2.25rem] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.01)] border border-white/80 hover:shadow-md transition-shadow group animate-slide-up">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-extrabold text-[var(--text-muted)] bg-slate-50 border border-slate-100 px-3 py-1 rounded-full shadow-inner">
                            {note.date}
                          </span>
                          <div className="flex bg-white/50 px-2.5 py-1 rounded-full border border-slate-100">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i} className="text-xs select-none">{i < note.rating ? "🐼" : "🤍"}</span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="p-2 text-[var(--text-muted)] hover:text-red-500 bg-white hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 shadow-sm border border-slate-100 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[var(--text-main)] text-xs leading-relaxed font-semibold">{note.feedback}</p>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-[var(--text-muted)] font-extrabold bg-white/45 backdrop-blur-md rounded-[2.5rem] border-2 border-dashed border-[var(--lavender)]/30 uppercase tracking-widest text-xs">
              Adicione livros à biblioteca primeiro 📚
            </div>
          )}
        </div>
      </div>

      {/* Desktop Widescreen Layout (>=lg) */}
      <div className="hidden lg:flex flex-row h-full min-h-[calc(85vh-3.5rem)] bg-slate-50/10 overflow-hidden no-scrollbar">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-slate-100 bg-white p-6 flex flex-col justify-between flex-shrink-0 no-scrollbar">
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Notinhas</h2>
            
            <nav className="space-y-1">
              <button
                onClick={() => setDesktopTab("Visualizar")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  desktopTab === "Visualizar"
                    ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <BookOpen className="w-4 h-4 opacity-80" />
                <span>Visualizar Notas</span>
              </button>
              <button
                onClick={() => setDesktopTab("Escrever")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  desktopTab === "Escrever"
                    ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Edit3 className="w-4 h-4 opacity-80" />
                <span>Escrever Nota</span>
              </button>
            </nav>

            <hr className="border-slate-100" />

            {/* Book Selector Submenu */}
            <div className="space-y-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-3">Seus Livros</p>
              
              {/* Sidebar book search */}
              <div className="relative mx-3 mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar livros..."
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 bg-slate-50 rounded-lg outline-none border-none text-[10px] font-semibold text-slate-600 placeholder:text-slate-400"
                />
              </div>

              <div className="max-h-56 overflow-y-auto no-scrollbar space-y-1 px-1">
                {filteredBooks.map((book) => (
                  <button
                    key={book.id}
                    onClick={() => setSelectedBookId(book.id)}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-[11px] font-bold truncate transition-all cursor-pointer ${
                      selectedBookId === book.id
                        ? "bg-slate-100 text-slate-800"
                        : "text-slate-500 hover:bg-slate-50/50 hover:text-slate-800"
                    }`}
                  >
                    {book.title}
                  </button>
                ))}
                {filteredBooks.length === 0 && (
                  <p className="text-[10px] text-slate-400 px-3 py-2 font-medium">Nenhum livro</p>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Right content page */}
        <main className="flex-1 p-8 overflow-y-auto space-y-8 bg-slate-50/30 no-scrollbar">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                {desktopTab === "Escrever" ? "Nova Notinha" : "Notinhas do Livro"}
              </h1>
              {selectedBook && (
                <p className="text-xs text-slate-400 font-bold">Livro selecionado: <span className="text-slate-600">{selectedBook.title}</span></p>
              )}
            </div>
          </div>

          {!selectedBookId ? (
            <div className="text-center py-20 text-slate-400 bg-white/50 border border-slate-100 rounded-3xl animate-fade-in">
              <p className="font-bold text-xs">Adicione livros e selecione-os na barra lateral para ver ou escrever notas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start animate-fade-in">
              {/* Main notes list / write form */}
              <div className="xl:col-span-2 space-y-6">
                {desktopTab === "Escrever" ? (
                  /* Form widget */
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                    <h2 className="text-slate-800 font-extrabold text-sm uppercase tracking-wider text-center">O que você está achando da leitura?</h2>
                    
                    <div className="mb-2">{renderPandas()}</div>

                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2 justify-center">
                        {quickFeedback.map((f) => (
                          <button
                            key={f}
                            onClick={() => setFeedback(f)}
                            className={`px-4 py-1.5 rounded-full text-[9px] font-extrabold transition-all border uppercase tracking-widest cursor-pointer ${
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
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[var(--primary)]/30 focus:ring-4 focus:ring-[var(--primary)]/5 transition-all resize-none min-h-[140px] text-xs font-semibold placeholder:text-slate-400"
                        />
                        <button
                          onClick={handleSubmit}
                          disabled={isSaving || !feedback.trim() || rating === 0}
                          className={`absolute bottom-3 right-3 p-3.5 rounded-full transition-all duration-300 active:scale-95 shadow-md flex items-center justify-center cursor-pointer ${
                            isSaving || !feedback.trim() || rating === 0
                              ? "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                              : "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/10"
                          }`}
                        >
                          <Send className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Visualizing notes list */
                  <div className="space-y-4">
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest pl-2">Suas Reflexões</h3>
                    
                    {notes.length === 0 ? (
                      <div className="text-center py-16 text-slate-400 bg-white/50 border border-slate-100 rounded-[2.5rem]">
                        <p className="font-bold text-xs">Nenhuma notinha ainda. Clique em "Escrever Nota" para começar! ✍️</p>
                      </div>
                    ) : (
                      notes.map((note) => (
                        <div key={note.id} className="bg-white p-6 rounded-[2.25rem] border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.01)] hover:shadow-md transition-shadow group relative flex flex-col justify-between">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <span className="text-[9px] font-extrabold text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full">
                                {note.date}
                              </span>
                              <div className="flex bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <span key={i} className="text-xs select-none">{i < note.rating ? "🐼" : "🤍"}</span>
                                ))}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDelete(note.id)}
                              className="p-2 text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 shadow-sm border border-slate-100 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-slate-700 text-xs leading-relaxed font-semibold">{note.feedback}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Right Column (Selected Book Preview Card) */}
              <div className="space-y-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informações do Livro</h3>
                {selectedBook && (
                  <div className="bg-white p-5 rounded-[2.25rem] border border-slate-100 shadow-sm space-y-4">
                    <div className="w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-sm border border-slate-100 flex items-center justify-center bg-slate-50">
                      {selectedBook.coverImagePath ? (
                        <img src={getFullUrl(selectedBook.coverImagePath)!} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(selectedBook)} flex items-center justify-center`}>
                          <BookOpen className="w-12 h-12 text-white opacity-40" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-xs leading-snug">{selectedBook.title}</h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{selectedBook.author}</p>
                      <span className="inline-block px-3 py-1 bg-slate-50 text-[9px] font-extrabold rounded-full text-slate-500 uppercase tracking-widest mt-2">
                        {selectedBook.genre}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
