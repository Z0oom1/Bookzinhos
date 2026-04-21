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
    <div className="min-h-screen bg-gradient-to-b from-background to-[var(--lavender)]/10">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-foreground animate-fade-in">Notinhas</h1>

        {/* Book Selection with Search */}
        <div className="bg-card rounded-[20px] p-4 shadow-sm border border-border">
          <h3 className="text-foreground text-sm font-medium mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Selecione o livro
          </h3>
          
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar livro..."
              value={bookSearch}
              onChange={(e) => setBookSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
            {filteredBooks.map((book) => (
              <button
                key={book.id}
                onClick={() => setSelectedBookId(book.id)}
                className={`snap-start flex-shrink-0 px-4 py-2 rounded-[12px] text-sm whitespace-nowrap transition-all active:scale-95 ${
                  selectedBookId === book.id
                    ? "bg-gradient-to-r from-primary to-[var(--mint)] text-white shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
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
            <div className="bg-gradient-to-br from-[var(--peach)]/20 to-[var(--lavender)]/20 rounded-[24px] p-6 shadow-md border border-white/50 animate-fade-in">
              <h2 className="text-foreground text-center mb-6">O que você achou até agora?</h2>
              
              <div className="mb-6">{renderPandas()}</div>

              {rating > 0 && (
                <div className="space-y-4 animate-scale-in">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {quickFeedback.map((f) => (
                      <button
                        key={f}
                        onClick={() => setFeedback(f)}
                        className={`px-4 py-2 rounded-full text-sm transition-all active:scale-95 ${
                          feedback === f
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-white/80 text-secondary-foreground hover:bg-white"
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
                      className="w-full px-5 py-4 bg-white/90 backdrop-blur-sm rounded-[16px] outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none min-h-[120px] shadow-sm"
                    />
                    <button
                      onClick={handleSubmit}
                      disabled={isSaving || !feedback.trim()}
                      className="absolute bottom-3 right-3 p-3 bg-gradient-to-r from-primary to-[var(--mint)] text-white rounded-full transition-all active:scale-95 disabled:opacity-50 hover:shadow-lg"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* List */}
            <div className="space-y-4">
              <h3 className="text-foreground">Suas notinhas</h3>
              {notes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground bg-card rounded-[16px] border border-dashed border-border">
                  Nenhuma notinha ainda. Que tal escrever a primeira? ✍️
                </div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="bg-card rounded-[16px] p-5 shadow-sm border border-border group animate-slide-up">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                          {note.date}
                        </span>
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className="text-sm">{i < note.rating ? "🐼" : "🤍"}</span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="p-2 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-foreground text-[15px] leading-relaxed">{note.feedback}</p>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Adicione livros à biblioteca primeiro
          </div>
        )}
      </div>
    </div>
  );
}
