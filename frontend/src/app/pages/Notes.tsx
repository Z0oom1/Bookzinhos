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
      if (urlBookId && b.some((book) => book.id === urlBookId)) {
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
      <div className="flex gap-2 justify-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            onMouseEnter={() => setHoverRating(i + 1)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(i + 1)}
            className="text-4xl transition-transform hover:scale-110 active:scale-95"
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
    <div className="min-h-screen bg-[var(--bg-pastel)] pb-24 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[var(--lavender)]/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-[var(--peach)]/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
      
      <div className="bg-white/70 backdrop-blur-xl sticky top-0 z-20 px-4 py-4 flex items-center gap-4 border-b border-white/60 shadow-sm">
        <h1 className="text-2xl font-black text-[var(--text-main)] bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary)] to-[var(--lavender)]">Notinhas ✨</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 relative z-10">

        {/* Book Selection with Search */}
        <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] p-5 shadow-lg border border-white">
          <h3 className="text-[var(--text-main)] text-sm font-black mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[var(--lavender)]" />
            Selecione o livro
          </h3>
          
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Buscar livro..."
              value={bookSearch}
              onChange={(e) => setBookSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/80 rounded-2xl text-sm outline-none border border-transparent focus:border-[var(--lavender)]/40 focus:ring-4 focus:ring-[var(--lavender)]/10 transition-all shadow-sm font-medium text-[var(--text-main)]"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar snap-x px-1">
            {filteredBooks.map((book) => (
              <button
                key={book.id}
                onClick={() => setSelectedBookId(book.id)}
                className={`snap-start flex-shrink-0 px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all active:scale-95 ${
                  selectedBookId === book.id
                    ? "bg-gradient-to-r from-[var(--lavender)] to-[var(--sky)] text-white shadow-md"
                    : "bg-white/80 text-[var(--text-muted)] hover:bg-white shadow-sm border border-white"
                }`}
              >
                {book.title}
              </button>
            ))}
            {filteredBooks.length === 0 && (
              <p className="text-sm text-muted-foreground py-2 text-center w-full">Nenhum livro encontrado</p>
            )}
          </div>
        </div>

        {selectedBookId ? (
          <>
            {/* Form */}
            <div className="bg-gradient-to-br from-white/70 to-white/40 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-xl border border-white/80 animate-fade-in relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--lavender)]/5 to-[var(--peach)]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <h2 className="text-[var(--text-main)] font-black text-center text-xl mb-6">O que você achou até agora?</h2>
              
              <div className="mb-8">{renderPandas()}</div>

              <div className="space-y-6 relative z-10">
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickFeedback.map((f) => (
                    <button
                      key={f}
                      onClick={() => setFeedback(f)}
                      className={`px-5 py-2.5 rounded-[1.5rem] text-sm font-bold transition-all active:scale-95 border ${
                        feedback === f
                          ? "bg-gradient-to-r from-[var(--primary)] to-[var(--peach)] text-white shadow-md border-transparent"
                          : "bg-white/60 text-[var(--text-muted)] hover:bg-white border-white/80"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <div className="relative group/input">
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Ou escreva o que está sentindo..."
                    className="w-full px-6 py-5 bg-white/60 backdrop-blur-md rounded-[2rem] outline-none border border-white/60 focus:border-[var(--lavender)]/60 focus:ring-4 focus:ring-[var(--lavender)]/10 transition-all resize-none min-h-[140px] shadow-sm text-[var(--text-main)] font-medium placeholder:text-[var(--text-muted)]/70"
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={isSaving || !feedback.trim() || rating === 0}
                    className={`absolute bottom-4 right-4 p-4 rounded-full transition-all duration-300 active:scale-95 shadow-md flex items-center justify-center ${
                      isSaving || !feedback.trim() || rating === 0
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                        : "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30 hover:-translate-y-1 hover:shadow-xl"
                    }`}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* List */}
            <div className="space-y-5">
              <h3 className="text-xl font-black text-[var(--text-main)] pl-2">Suas notinhas</h3>
              {notes.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-muted)] bg-white/40 backdrop-blur-sm rounded-[2rem] border-2 border-dashed border-[var(--lavender)]/20 shadow-sm font-medium">
                  Nenhuma notinha ainda. Que tal escrever a primeira? ✍️
                </div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="bg-white/70 backdrop-blur-md rounded-[2rem] p-6 shadow-sm border border-white/60 hover:shadow-md transition-shadow group animate-slide-up">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-pastel)] px-3 py-1 rounded-full shadow-inner border border-white">
                          {note.date}
                        </span>
                        <div className="flex bg-white/50 px-2 py-1 rounded-full shadow-sm">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className="text-sm">{i < note.rating ? "🐼" : "🤍"}</span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="p-2 text-[var(--text-muted)] hover:text-red-500 bg-white hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[var(--text-main)] text-[15px] leading-relaxed font-medium">{note.feedback}</p>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-[var(--text-muted)] font-bold bg-white/40 backdrop-blur-md rounded-[3rem] border-2 border-dashed border-[var(--lavender)]/30">
            Adicione livros à biblioteca primeiro 📚
          </div>
        )}
      </div>
    </div>
  );
}
