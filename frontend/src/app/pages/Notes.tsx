import { useState, useEffect } from "react";
import { Search, BookOpen, Send, Trash2, Edit3 } from "lucide-react";
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

  // Desktop active pane view: "escrever" or "visualizar"
  const [desktopTab, setDesktopTab] = useState("Visualizar");

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

  const readBooks = books.filter((b) =>
    progress.some((p) => p.bookId === b.id && p.status === "finalizado")
  );

  // Se não houver nenhum livro lido, mostramos todos os livros que possuem progresso,
  // e se ainda assim não houver, mostramos todos os livros da biblioteca para que possam selecionar e dar notas.
  const displayBooks = readBooks.length > 0 
    ? readBooks 
    : (books.filter((b) => progress.some((p) => p.bookId === b.id)).length > 0
        ? books.filter((b) => progress.some((p) => p.bookId === b.id))
        : books);

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
                          <span className="text-[10px] font-extrabold text-[var(--primary)] uppercase tracking-wider">
                            {note.username || "Leitor"}
                          </span>
                          <span className="text-[9px] font-extrabold text-[var(--text-muted)] bg-slate-50 border border-slate-100 px-3 py-1 rounded-full shadow-inner">
                            {note.date}
                          </span>
                          <div className="flex bg-white/50 px-2.5 py-1 rounded-full border border-slate-100">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i} className="text-xs select-none">{i < note.rating ? "🐼" : "🤍"}</span>
                            ))}
                          </div>
                        </div>
                        {note.username?.toLowerCase() === localStorage.getItem("books-username")?.toLowerCase() && (
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="p-2 text-[var(--text-muted)] hover:text-red-500 bg-white hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 shadow-sm border border-slate-100 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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
      <div className="hidden lg:flex flex-col h-full min-h-[calc(85vh-3.5rem)] bg-slate-50/10 overflow-y-auto p-8 space-y-8 no-scrollbar">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Pergaminhos de Notinhas ✨</h1>
            <p className="text-xs text-slate-400 font-bold">Compartilhe suas reflexões e veja o que outros leitores acharam</p>
          </div>
          {selectedBook && (
            <div className="bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selecionado:</span>
              <span className="text-xs font-extrabold text-[var(--primary)]">{selectedBook.title}</span>
            </div>
          )}
        </div>

        {/* Top Shelf (Read Books) */}
        <div className="bg-[#faf6f3] rounded-3xl p-6 shadow-sm border border-[#f5ebe6] space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                {readBooks.length > 0 ? "Seus Livros Lidos" : "Livros na Biblioteca"}
              </span>
            </div>
            {readBooks.length === 0 && (
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                Nenhum livro finalizado ainda
              </span>
            )}
          </div>

          <div className="relative pt-2 pb-2">
            <div className="flex justify-start gap-8 items-end relative z-10 px-2 overflow-x-auto styled-scrollbar pb-4">
              {displayBooks.map((book) => {
                const isSelected = selectedBookId === book.id;
                const coverUrl = getFullUrl(book.coverImagePath);
                return (
                  <div 
                    key={book.id}
                    onClick={() => setSelectedBookId(book.id)}
                    className={`relative z-10 flex flex-col items-center w-24 flex-shrink-0 cursor-pointer origin-bottom transition-all duration-300 hover:scale-110 hover:-translate-y-2 ${
                      isSelected ? "scale-105" : ""
                    }`}
                  >
                    {/* Book Cover */}
                    <div className={`w-full aspect-[2/3] rounded-[2px] rounded-r-[6px] overflow-hidden shadow-md border-l-[3px] border-black/10 relative ${
                      isSelected ? "ring-4 ring-[var(--primary)] ring-offset-2" : ""
                    }`}>
                      {coverUrl ? (
                        <img src={coverUrl} className="w-full h-full object-cover" alt={book.title} />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(book)} flex items-center justify-center p-2 text-[8px] text-center font-extrabold text-white`}>
                          {book.title}
                        </div>
                      )}
                      {/* Spine Highlight */}
                      <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-r from-white/20 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-black/15 mix-blend-multiply pointer-events-none" />
                    </div>
                    {/* Tiny visual shelf shadow */}
                    <div className="absolute -bottom-1 -right-1 w-10 h-1.5 bg-black/10 blur-sm rounded-full -z-10" />
                  </div>
                );
              })}
            </div>
            <div className="absolute bottom-2 left-0 right-0 h-3 bg-gradient-to-b from-[#f3e9e3] to-[#e8dcd5] rounded-full shadow-[0_6px_10px_rgba(0,0,0,0.04)] z-0 border-t border-[#fdfbf9]" />
          </div>
        </div>

        {selectedBookId ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start animate-fade-in">
            {/* Left Column: Form to Write a Note */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-slate-800 font-black text-base uppercase tracking-wider">O que achou de "{selectedBook?.title}"?</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Escreva sua notinha e dê uma nota de 1 a 5 pandas</p>
              </div>
              
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
                        ? "bg-slate-150 text-slate-300 cursor-not-allowed shadow-none"
                        : "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/10 hover:scale-105"
                    }`}
                  >
                    <Send className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: List of All Notes for this Book */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest pl-2 flex items-center gap-1.5">
                <span>Reflexões de Leitores</span>
                <span className="bg-slate-100 text-[10px] text-slate-500 font-extrabold px-2 py-0.5 rounded-full">
                  {notes.length}
                </span>
              </h3>
              
              {notes.length === 0 ? (
                <div className="text-center py-16 text-slate-400 bg-white/50 border border-slate-100 rounded-[2.5rem]">
                  <p className="font-bold text-xs">Ainda não há nenhuma nota de leitura para este livro. Seja o primeiro a escrever! ✍️</p>
                </div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="bg-white p-5 rounded-[2.25rem] border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.01)] hover:shadow-md transition-shadow group relative flex flex-col justify-between">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-wider">
                          {note.username || "Leitor"}
                        </span>
                        <span className="text-[9px] font-extrabold text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-full">
                          {note.date}
                        </span>
                        <div className="flex bg-slate-50/50 px-2 py-0.5 rounded-full border border-slate-100">
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
                    <p className="text-slate-700 text-xs leading-relaxed font-semibold">{note.feedback}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-slate-400 bg-white/50 border border-slate-100 rounded-3xl animate-fade-in">
            <p className="font-bold text-xs">Adicione livros e selecione-os acima para ver ou escrever notas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
