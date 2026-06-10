import { useState, useEffect } from "react";
import { Search, BookOpen, Send, Trash2 } from "lucide-react";
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

  useEffect(() => {
    fetchBooks().then((b) => {
      setBooks(b);
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
    fetchBookNotes(selectedBookId).then(setNotes);
  }, [selectedBookId]);

  const handleSubmit = async () => {
    if (rating === 0 || !feedback.trim()) return;
    setIsSaving(true);
    const newNote = await addNote({ bookId: selectedBookId, feedback: feedback.trim(), rating });
    setNotes((prev) => [newNote, ...prev]);
    setRating(0);
    setFeedback("");
    setIsSaving(false);
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

  return (
    <div className="min-h-screen bg-transparent pb-32 relative overflow-hidden">
      
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-xl sticky top-0 z-20 px-4 py-4.5 flex items-center justify-between border-b border-white/60 shadow-sm animate-fade-in">
        <h1 className="text-xl font-extrabold text-[var(--text-main)] bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary)] to-[var(--lavender)] tracking-tight">Notinhas ✨</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 relative z-10">

        {/* Book Selection with Search */}
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
                    ? "bg-gradient-to-r from-[var(--lavender)] to-[var(--primary)] text-white border-transparent shadow-sm"
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
            {/* Form */}
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
                          ? "bg-gradient-to-r from-[var(--primary)] to-[var(--peach)] text-white border-transparent shadow-sm"
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

            {/* List */}
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
  );
}
