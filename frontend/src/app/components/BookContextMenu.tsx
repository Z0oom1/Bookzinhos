import { BookOpen, Pencil, Trash2, MessageSquare, X, PauseCircle, PlayCircle } from "lucide-react";
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
      className="fixed inset-0 z-[100] flex flex-col justify-end"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        className="relative bg-gradient-to-b from-card to-[var(--peach)]/10 rounded-t-[28px] p-6 space-y-4 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-border rounded-full mx-auto" />

        {/* Book info */}
        <div className="flex items-center gap-3 pb-2 border-b border-border/50">
          <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)]/20 to-[var(--mint)]/20 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-[var(--primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-foreground font-medium truncate">{book.title}</p>
            <p className="text-xs text-muted-foreground truncate">{book.author}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onRead}
            className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-[var(--mint)]/40 to-[var(--sky)]/30 rounded-[16px] hover:shadow-md active:scale-95 transition-all"
          >
            <div className="w-10 h-10 bg-[var(--mint)]/50 rounded-full flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-green-700" />
            </div>
            <span className="text-sm font-medium text-foreground">Ler</span>
          </button>

          {onPause && (
            <button
              onClick={onPause}
              className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-[var(--peach)]/40 to-[var(--primary)]/30 rounded-[16px] hover:shadow-md active:scale-95 transition-all"
            >
              <div className="w-10 h-10 bg-[var(--peach)]/50 rounded-full flex items-center justify-center">
                {isPaused ? <PlayCircle className="w-5 h-5 text-[var(--primary)]" /> : <PauseCircle className="w-5 h-5 text-orange-700" />}
              </div>
              <span className="text-sm font-medium text-foreground">{isPaused ? "Retomar" : "Pausar"}</span>
            </button>
          )}

          <button
            onClick={onEdit}
            className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-[var(--sky)]/40 to-[var(--lavender)]/30 rounded-[16px] hover:shadow-md active:scale-95 transition-all"
          >
            <div className="w-10 h-10 bg-[var(--sky)]/50 rounded-full flex items-center justify-center">
              <Pencil className="w-5 h-5 text-blue-700" />
            </div>
            <span className="text-sm font-medium text-foreground">Editar</span>
          </button>

          <button
            onClick={onFeedback}
            className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-[var(--lavender)]/40 to-[var(--peach)]/30 rounded-[16px] hover:shadow-md active:scale-95 transition-all"
          >
            <div className="w-10 h-10 bg-[var(--lavender)]/50 rounded-full flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-purple-700" />
            </div>
            <span className="text-sm font-medium text-foreground">Feedback</span>
          </button>

          <button
            onClick={onDelete}
            className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-red-100 to-rose-50 rounded-[16px] hover:shadow-md active:scale-95 transition-all"
          >
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-sm font-medium text-red-600">Excluir</span>
          </button>
        </div>
      </div>
    </div>
  );
}
