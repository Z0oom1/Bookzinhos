import { BookOpen, Pencil, Trash2, MessageSquare, X, PauseCircle, PlayCircle, Star, Heart } from "lucide-react";
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
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-end p-4 pb-10"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300" />

      {/* Sheet */}
      <div
        className="relative bg-white/90 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_-20px_50px_rgba(0,0,0,0.2)] animate-in slide-in-from-bottom duration-500 ease-out border border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/40 rounded-full" />

        {/* Header/Info */}
        <div className="flex items-start gap-6 mb-8">
          <div className="relative group">
            <div className="w-24 h-32 bg-gradient-to-br from-[var(--lavender)] to-[var(--sky)] rounded-2xl shadow-xl overflow-hidden transform group-hover:scale-105 transition-transform duration-300">
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <BookOpen className="w-12 h-12 text-white" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-xs">
              🐼
            </div>
          </div>
          
          <div className="flex-1 min-w-0 pt-2">
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
          className="w-full bg-gradient-to-r from-[var(--lavender)] to-[var(--sky)] text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-[var(--lavender)]/20 active:scale-[0.98] transition-all mb-6 flex items-center justify-center gap-3"
        >
          <BookOpen className="w-6 h-6" />
          LER AGORA
        </button>

        {/* Secondary Actions Grid */}
        <div className="grid grid-cols-4 gap-4">
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
            <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center group-hover:bg-purple-200 transition-all duration-300">
              <MessageSquare className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Notas</span>
          </button>

          <button
            onClick={onEdit}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-200 transition-all duration-300">
              <Pencil className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Editar</span>
          </button>

          <button
            onClick={onDelete}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center group-hover:bg-red-200 transition-all duration-300">
              <Trash2 className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Excluir</span>
          </button>
        </div>
      </div>
    </div>
  );
}
