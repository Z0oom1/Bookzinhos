import { useParams, useNavigate } from "react-router";
import { ArrowLeft, BookOpen, Heart, Play, Share2, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchBook, fetchSavedIds, toggleSaved, fetchProgress, fetchAllUsers, sendMessage, saveProgress } from "../lib/api";
import { getCoverGradient, getFullUrl } from "../lib/types";
import type { Book, ReadingProgress, UserProfile } from "../lib/types";
import { useOpenBook } from "../lib/readerChoice";

export function BookDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const openBook = useOpenBook();
  const [book, setBook] = useState<Book | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const myUsername = localStorage.getItem("books-username");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetchBook(id).catch(() => null),
      fetchSavedIds().catch(() => []),
      fetchProgress(id).catch(() => null),
      fetchAllUsers().catch(() => [])
    ])
      .then(([b, savedIds, p, allUsers]) => {
        const savedIdsList = savedIds || [];
        const allUsersList = allUsers || [];

        setBook(b);
        setIsSaved(savedIdsList.includes(id));
        setProgress(p);
        setUsers((allUsersList as UserProfile[]).filter((u: UserProfile) => u.username.toLowerCase() !== myUsername?.toLowerCase()));
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
      status: nextStatus,
      startedAt: progress?.startedAt || Date.now(),
      lastReadAt: Date.now()
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
        <span key={i} className="text-sm select-none">
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
          <h2 className="text-foreground font-extrabold text-lg">Livro não encontrado</h2>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-extrabold text-xs uppercase tracking-widest cursor-pointer"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const isFinished = progress?.status === "finalizado";

  return (
    <div className="min-h-screen bg-transparent pb-12">
      {/* Modal de Compartilhamento */}
      {showShare && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] flex items-end justify-center animate-fade-in" onClick={() => setShowShare(false)}>
          <div 
            className="bg-white w-full max-w-lg rounded-t-[2.5rem] p-6 pb-10 shadow-2xl animate-slide-up border border-slate-100"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6" />
            <h3 className="text-base font-extrabold text-[var(--text-main)] mb-6 text-center uppercase tracking-widest">Compartilhar com... 🐾</h3>
            <div className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {users.length === 0 ? (
                <p className="text-center py-6 text-[var(--text-muted)] italic text-xs font-semibold">Nenhum leitor online... 💨</p>
              ) : (
                users.map(u => (
                  <button
                    key={u.username}
                    onClick={() => handleShare(u.username)}
                    className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 hover:bg-[var(--primary)]/5 transition-all border border-slate-100 text-left group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm group-hover:scale-105 transition-transform border border-slate-200/50 select-none">
                      {u.avatar || "👤"}
                    </div>
                    <span className="font-extrabold text-xs text-[var(--text-main)] flex-1">{u.username}</span>
                    <Heart className="w-4.5 h-4.5 text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => setShowShare(false)}
              className="w-full mt-6 py-4 rounded-xl bg-slate-50 font-extrabold text-xs uppercase tracking-widest text-[var(--text-muted)] hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Header com Dynamic Blur Background */}
      <div className="relative overflow-hidden pb-8">
        {/* Camada do Dynamic Blur */}
        <div className="absolute inset-0 -z-10 w-full h-full overflow-hidden pointer-events-none select-none">
          {book.coverImagePath ? (
            <img 
              src={getFullUrl(book.coverImagePath)!} 
              alt="" 
              className="w-full h-full object-cover filter blur-[60px] opacity-40 scale-150 transform-gpu transition-all duration-700 ease-in-out"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(book)} filter blur-[60px] opacity-45 scale-150 transform-gpu transition-all duration-700 ease-in-out`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/[0.03] via-transparent to-background" />
        </div>

        <div className="max-w-2xl mx-auto px-4 pt-6">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-2.5 bg-white/90 rounded-full shadow-sm active:scale-95 hover:bg-white transition-all animate-fade-in border border-slate-100/50 cursor-pointer"
            >
              <ArrowLeft className="w-4.5 h-4.5 text-[var(--text-main)]" />
            </button>
            <button
              onClick={() => setShowShare(true)}
              className="p-3 bg-[var(--primary)] text-white rounded-full shadow-md hover:shadow-lg hover:shadow-[var(--primary)]/15 active:scale-95 transition-all flex items-center gap-1.5 font-extrabold px-5 text-[10px] uppercase tracking-widest cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" /> Compartilhar
            </button>
          </div>

          <div className="flex gap-6 animate-scale-in">
            <div
              className={`flex-shrink-0 w-32 h-44 bg-gradient-to-br ${getCoverGradient(book)} rounded-2xl shadow-lg flex items-center justify-center overflow-hidden relative border border-white/50`}
            >
              {book.coverImagePath ? (
                <img src={getFullUrl(book.coverImagePath)!} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <BookOpen className="w-12 h-12 text-white/50" />
              )}
            </div>
            <div className="flex-1 space-y-3.5 pt-2">
              <div>
                <h1 className="text-2xl font-extrabold text-[var(--text-main)] tracking-tight leading-tight mb-1">{book.title}</h1>
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">{book.author}</p>
              </div>
              <div className="space-y-1">
                {renderRating(book.rating)}
                <p className="text-[10px] text-[var(--text-muted)] font-extrabold uppercase tracking-widest">{book.reviewCount} avaliações</p>
              </div>
              <span className="inline-block px-3.5 py-1 bg-[var(--primary)]/10 text-[10px] font-extrabold rounded-full text-[var(--primary)] border border-[var(--primary)]/15 uppercase tracking-widest">
                {book.genre}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6 mt-6">
        {/* Sinopse */}
        <div className="space-y-2">
          <h3 className="text-sm font-extrabold text-[var(--text-main)] uppercase tracking-widest">Sinopse</h3>
          <p className="text-xs text-[var(--text-muted)] font-semibold leading-relaxed">{book.description || "Nenhuma sinopse disponível para este livro."}</p>
        </div>

        {/* Botões de ação e Progresso */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          {progress && (progress.status === "lendo" || progress.status === "pausado") && (
            <div className="space-y-2 bg-white/70 p-4.5 rounded-[2.25rem] border border-white shadow-[0_8px_30px_rgba(0,0,0,0.01)]">
              <div className="flex justify-between items-center text-[10px] font-extrabold text-[var(--text-main)] uppercase tracking-widest">
                <span>Progresso atual</span>
                <span className="text-[var(--primary)]">{progress.progress}% lido</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                <div className="bg-[var(--primary)] h-2 rounded-full transition-all" style={{ width: `${progress.progress}%` }} />
              </div>
            </div>
          )}
          
          {isFinished && (
            <div className="bg-[var(--mint)]/10 p-4.5 rounded-[2rem] border border-[var(--mint)]/20 flex items-center justify-center gap-3">
               <CheckCircle className="w-5 h-5 text-[var(--primary)] animate-bounce" />
               <span className="font-extrabold text-[var(--text-main)] text-[10px] uppercase tracking-widest">Livro concluído! ✨🐼</span>
            </div>
          )}

          <div className="flex gap-3">
            {(book.pages && book.pages.length > 0) || book.pdfPath ? (
              <button
                onClick={() => openBook(book)}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-[var(--primary)] text-white rounded-2xl font-extrabold text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] shadow-md hover:shadow-lg hover:shadow-[var(--primary)]/15 relative overflow-hidden group cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current animate-pulse-soft" />
                <span className="relative z-10">{progress ? "Continuar leitura" : "Ler agora"}</span>
                <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </button>
            ) : (
              <button
                disabled
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-100 text-slate-300 font-extrabold text-[10px] uppercase tracking-widest rounded-2xl cursor-not-allowed"
              >
                <BookOpen className="w-4 h-4" />
                <span>Sem conteúdo</span>
              </button>
            )}
            
            <button
              onClick={handleToggleRead}
              className={`px-4.5 py-4 rounded-2xl font-extrabold transition-all active:scale-[0.98] flex items-center justify-center border cursor-pointer ${
                isFinished
                  ? "bg-[var(--primary)]/10 border-[var(--primary)]/10 text-[var(--primary)] shadow-sm"
                  : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50 shadow-sm"
              }`}
            >
              <CheckCircle className={`w-4.5 h-4.5 ${isFinished ? "fill-current" : ""}`} />
            </button>

            <button
              onClick={handleToggleSave}
              className={`px-4.5 py-4 rounded-2xl font-extrabold transition-all active:scale-[0.98] flex items-center justify-center cursor-pointer ${
                isSaved
                  ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/10 border-transparent"
                  : "bg-white text-slate-400 border border-slate-200 hover:bg-slate-50 shadow-sm"
              }`}
            >
              <Heart className={`w-4.5 h-4.5 ${isSaved ? "fill-white" : ""}`} />
            </button>
          </div>
        </div>

        {/* Avaliações */}
        {book.reviews && book.reviews.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-extrabold text-[var(--text-main)] uppercase tracking-widest">Avaliações</h3>
            <div className="space-y-3">
              {book.reviews.map((review, idx) => (
                <div key={idx} className="bg-white/70 border border-white/80 rounded-2xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.01)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[var(--text-main)]">{review.username}</span>
                    <div className="scale-75 origin-right">{renderRating(review.rating)}</div>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
