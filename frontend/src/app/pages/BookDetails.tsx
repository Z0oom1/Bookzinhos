import { useParams, useNavigate } from "react-router";
import { ArrowLeft, BookOpen, Heart, Play, Share2, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchBook, fetchSavedIds, toggleSaved, fetchProgress, fetchAllUsers, sendMessage, saveProgress } from "../lib/api";
import { getCoverGradient, getFullUrl } from "../lib/types";
import type { Book, ReadingProgress, UserProfile } from "../lib/types";

export function BookDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const myUsername = localStorage.getItem("books-username");

  useEffect(() => {
    if (!id) return;
    Promise.all([fetchBook(id), fetchSavedIds(), fetchProgress(id), fetchAllUsers()])
      .then(([b, savedIds, p, allUsers]) => {
        setBook(b);
        setIsSaved(savedIds.includes(id));
        setProgress(p);
        setUsers(allUsers.filter(u => u.username !== myUsername));
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Erro ao carregar livro:", err);
        setIsLoading(false);
      });
  }, [id, myUsername]);

  const handleToggleSave = async () => {
    if (!id) return;
    const next = await toggleSaved(id, isSaved);
    setIsSaved(next);
  };

  const handleToggleRead = async () => {
    if (!id || !book) return;
    const isCurrentlyFinished = progress?.status === "finalizado";
    const nextStatus = isCurrentlyFinished ? "pausado" : "finalizado";
    
    const newProgress: ReadingProgress = {
      bookId: id,
      currentPage: isCurrentlyFinished ? 0 : (book.pages?.length || 1) - 1,
      totalPages: book.pages?.length || 1,
      progress: isCurrentlyFinished ? 0 : 100,
      status: nextStatus
    };
    
    await saveProgress(newProgress);
    setProgress(newProgress);
  };

  const handleShare = async (targetUsername: string) => {
    if (!book) return;
    try {
      await sendMessage(targetUsername, `Recomendei o livro "${book.title}" para você! 📖✨`, book.id);
      alert(`Livro compartilhado com ${targetUsername}!`);
      setShowShare(false);
    } catch (err) {
      alert("Erro ao compartilhar.");
    }
  };

  const renderRating = (rating: number) => (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className="text-base">
          {i < rating ? "🐼" : "🤍"}
        </span>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-5xl animate-bounce-in">🐼</div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <div className="text-4xl">📚</div>
          <h2 className="text-foreground">Livro não encontrado</h2>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-primary text-white rounded-[16px] transition-all active:scale-95"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const isFinished = progress?.status === "finalizado";

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Modal de Compartilhamento */}
      {showShare && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end justify-center animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-t-[3rem] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
            <h3 className="text-xl font-black text-[var(--text-main)] mb-6 text-center">Compartilhar com... 🐾</h3>
            <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2">
              {users.length === 0 ? (
                <p className="text-center py-4 text-[var(--text-muted)] italic">Nenhum leitor online... 💨</p>
              ) : (
                users.map(u => (
                  <button
                    key={u.username}
                    onClick={() => handleShare(u.username)}
                    className="flex items-center gap-4 p-4 rounded-[2rem] bg-[var(--bg-pastel)] hover:bg-[var(--lavender)]/10 transition-colors border border-[var(--lavender)]/5 text-left group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">
                      {u.avatar || "👤"}
                    </div>
                    <span className="font-bold text-[var(--text-main)] flex-1">{u.username}</span>
                    <Heart className="w-5 h-5 text-[var(--blush)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => setShowShare(false)}
              className="w-full mt-6 py-4 rounded-[2rem] bg-gray-100 font-bold text-[var(--text-muted)] active:scale-95 transition-transform"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Header com gradiente */}
      <div className="relative bg-gradient-to-b from-[var(--peach)]/40 via-[var(--lavender)]/40 to-transparent pb-8">
        <div className="max-w-2xl mx-auto px-4 pt-6">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md active:scale-95 transition-all animate-fade-in"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <button
              onClick={() => setShowShare(true)}
              className="p-3 bg-[var(--blush)] text-white rounded-full shadow-lg shadow-[var(--blush)]/30 active:scale-95 transition-all flex items-center gap-2 font-bold px-4 text-xs"
            >
              <Share2 className="w-4 h-4" /> Compartilhar
            </button>
          </div>

          <div className="flex gap-6 animate-scale-in">
            <div
              className={`flex-shrink-0 w-32 h-44 bg-gradient-to-br ${getCoverGradient(book)} rounded-[16px] shadow-xl flex items-center justify-center overflow-hidden relative`}
            >
              {book.coverImagePath ? (
                <img src={getFullUrl(book.coverImagePath)!} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <BookOpen className="w-12 h-12 text-white" />
              )}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h1 className="text-foreground mb-1">{book.title}</h1>
                <p className="text-muted-foreground">{book.author}</p>
              </div>
              <div className="space-y-1">
                {renderRating(book.rating)}
                <p className="text-sm text-muted-foreground">{book.reviewCount} avaliações</p>
              </div>
              <span className="inline-block px-3 py-1 bg-[var(--mint)]/30 text-sm rounded-full text-muted-foreground">
                {book.genre}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6 mt-6">
        {/* Sinopse */}
        <div className="space-y-3">
          <h3 className="text-foreground">Sinopse</h3>
          <p className="text-muted-foreground leading-relaxed">{book.description}</p>
        </div>

        {/* Botões de ação e Progresso */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          {progress && (progress.status === "lendo" || progress.status === "pausado") && (
            <div className="space-y-2 bg-gradient-to-r from-card to-[var(--peach)]/20 p-4 rounded-[16px] border border-[var(--primary)]/20">
              <div className="flex justify-between items-center text-sm font-medium text-foreground">
                <span>Progresso atual</span>
                <span className="text-[var(--primary)]">{progress.progress}% lido</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-[var(--peach)] via-[var(--primary)] to-[var(--blush)] h-2 rounded-full transition-all" style={{ width: `${progress.progress}%` }} />
              </div>
            </div>
          )}
          
          {isFinished && (
            <div className="bg-[var(--mint)]/10 p-4 rounded-3xl border-2 border-[var(--mint)]/30 flex items-center justify-center gap-3">
               <CheckCircle className="w-6 h-6 text-[var(--mint)] animate-bounce" />
               <span className="font-black text-[var(--text-main)] text-sm">Livro concluído! ✨🐼</span>
            </div>
          )}

          <div className="flex gap-3">
            {(book.pages && book.pages.length > 0) || book.pdfPath ? (
              <button
                onClick={() => navigate(`/read/${id}`)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-primary to-[var(--mint)] text-white rounded-[16px] font-semibold transition-all active:scale-[0.98] shadow-lg shadow-[var(--primary)]/30 hover:shadow-xl relative overflow-hidden group"
              >
                <Play className="w-5 h-5 fill-current animate-pulse-soft" />
                <span className="relative z-10">{progress ? "Continuar leitura" : "Ler agora"}</span>
                <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </button>
            ) : (
              <button
                disabled
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-muted text-muted-foreground font-semibold rounded-[16px] cursor-not-allowed"
              >
                <BookOpen className="w-5 h-5" />
                <span>Sem conteúdo</span>
              </button>
            )}
            
            <button
              onClick={handleToggleRead}
              className={`px-4 py-3.5 rounded-[16px] font-semibold transition-all active:scale-[0.98] shadow hover:shadow-md flex items-center justify-center border-2 ${
                isFinished
                  ? "bg-[var(--mint)]/20 border-[var(--mint)] text-[var(--mint)]"
                  : "bg-white border-gray-100 text-[var(--text-muted)]"
              }`}
            >
              <CheckCircle className={`w-5 h-5 ${isFinished ? "fill-current" : ""}`} />
            </button>

            <button
              onClick={handleToggleSave}
              className={`px-4 py-3.5 rounded-[16px] font-semibold transition-all active:scale-[0.98] shadow hover:shadow-md flex items-center justify-center ${
                isSaved
                  ? "bg-gradient-to-br from-[var(--peach)] to-[var(--primary)] text-white shadow-[var(--primary)]/20"
                  : "bg-white text-muted-foreground border border-border hover:bg-muted"
              }`}
            >
              <Heart className={`w-5 h-5 ${isSaved ? "fill-white" : ""}`} />
            </button>
          </div>
        </div>

        {/* Avaliações */}
        {book.reviews && book.reviews.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="text-foreground">Avaliações</h3>
            <div className="space-y-3">
              {book.reviews.map((review, idx) => (
                <div key={idx} className="bg-card rounded-[16px] p-4 shadow-sm space-y-2 border border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground font-bold">{review.username}</span>
                    <div className="scale-75 origin-right">{renderRating(review.rating)}</div>
                  </div>
                  <p className="text-sm text-muted-foreground">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
