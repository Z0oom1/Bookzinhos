import { BookOpen, Pencil, Trash2, MessageSquare, X, PauseCircle, PlayCircle, Star, Heart } from "lucide-react";
import { getCoverGradient, getFullUrl } from "../lib/types";
import type { Book } from "../lib/types";

interface Props {
  book: Book;
  isPaused?: boolean;
  onClose: () => void;
  onRead: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onFeedback: () => void;
  onPause?: () => void;
}
export function BookContextMenu({ book, isPaused, onClose, onRead, onEdit, onDelete, onFeedback, onPause }: Props) {
  const coverUrl = getFullUrl(book.coverImagePath);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-end p-4 pb-10"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300" />

      {/* Sheet */}
      <div
        className="relative bg-white/80 backdrop-blur-3xl rounded-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 ease-out border border-white/60"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-14 h-1.5 bg-white/80 rounded-full shadow-sm" />

        {/* Header/Info */}
        <div className="flex items-start gap-6 mb-8">
          <div className="relative group perspective-1000">
            <div className="w-24 h-36 rounded-xl shadow-lg overflow-hidden transform group-hover:rotate-y-12 transition-transform duration-500 border border-white/40">
              {coverUrl ? (
                <img src={coverUrl} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(book)} flex items-center justify-center`}>
                  <BookOpen className="w-10 h-10 text-white/50" />
                </div>
              )}
              {/* Glossy overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
            </div>
            <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-gradient-to-br from-[var(--blush)] to-[var(--lavender)] rounded-full shadow-lg flex items-center justify-center text-sm border-2 border-white animate-bounce-in">
              ✨
            </div>
          </div>
          
          <div className="flex-1 min-w-0 pt-3">
            <h3 className="text-xl font-black text-[var(--text-main)] leading-tight mb-1 line-clamp-2">
              {book.title}
            </h3>
            <p className="text-sm font-medium text-[var(--text-muted)] mb-3">
              por <span className="text-[var(--lavender)] font-bold">{book.author}</span>
            </p>
            <div className="flex gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-3.5 h-3.5 ${i < book.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} 
                />
              ))}
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 active:scale-90 transition-all"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Main Action */}
        <button
          onClick={onRead}
          className="w-full bg-gradient-to-r from-[var(--primary)] to-[var(--lavender)] text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-[var(--primary)]/30 active:scale-[0.98] hover:shadow-xl transition-all mb-8 flex items-center justify-center gap-3 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
          <BookOpen className="w-6 h-6" />
          Mergulhar na Leitura ✨
        </button>

        {/* Secondary Actions Grid */}
        <div className="grid grid-cols-4 gap-3">
          {onPause && (
            <button
              onClick={onPause}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                isPaused 
                  ? "bg-green-100 text-green-600 group-hover:bg-green-200" 
                  : "bg-orange-100 text-orange-600 group-hover:bg-orange-200"
              }`}>
                {isPaused ? <PlayCircle className="w-6 h-6" /> : <PauseCircle className="w-6 h-6" />}
              </div>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                {isPaused ? "Retomar" : "Pausar"}
              </span>
            </button>
          )}

          <button
            onClick={onFeedback}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-[var(--peach)]/20 to-[var(--blush)]/20 text-[var(--peach)] rounded-[1.2rem] flex items-center justify-center group-hover:scale-110 shadow-sm border border-white transition-all duration-300">
              <MessageSquare className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-wider">Notas</span>
          </button>

          <button
            onClick={onEdit}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-[var(--sky)]/20 to-blue-200/40 text-blue-500 rounded-[1.2rem] flex items-center justify-center group-hover:scale-110 shadow-sm border border-white transition-all duration-300">
              <Pencil className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-wider">Editar</span>
          </button>

          <button
            onClick={onDelete}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-red-100 to-red-200/50 text-red-500 rounded-[1.2rem] flex items-center justify-center group-hover:scale-110 shadow-sm border border-white transition-all duration-300">
              <Trash2 className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-red-500 uppercase tracking-wider">Excluir</span>
          </button>
        </div>
      </div>
    </div>
  );
}
