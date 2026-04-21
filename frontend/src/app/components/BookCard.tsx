import { useRef, useState, useCallback } from "react";
import { BookOpen } from "lucide-react";
import { useNavigate } from "react-router";
import { getCoverGradient, getFullUrl } from "../lib/types";
import { BookContextMenu } from "./BookContextMenu";
import { EditBookModal } from "./EditBookModal";
import { deleteBook, saveProgress } from "../lib/api";
import type { Book, ReadingProgress } from "../lib/types";

interface Props {
  book: Book;
  progress?: ReadingProgress;
  variant?: "grid" | "list" | "small";
  onDeleted?: (id: string) => void;
  onEdited?: (updated: Book) => void;
}

export function BookCard({ book, progress: initialProgress, variant = "grid", onDeleted, onEdited }: Props) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [localProgress, setLocalProgress] = useState(initialProgress);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const longPressedRef = useRef(false);

  const startPress = useCallback(() => {
    longPressedRef.current = false;
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      setShowMenu(true);
    }, 500);
  }, []);

  const cancelPress = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  const endPress = useCallback(() => {
    clearTimeout(timerRef.current);
    if (!longPressedRef.current) {
      navigate(`/book/${book.id}`);
    }
    longPressedRef.current = false;
  }, [book.id, navigate]);

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setShowMenu(false);
    await deleteBook(book.id);
    onDeleted?.(book.id);
  };

  const handleEdited = (updated: Book) => {
    setShowEdit(false);
    onEdited?.(updated);
  };

  const handlePause = async () => {
    setShowMenu(false);
    if (!localProgress) return;
    const isPaused = localProgress.status === "pausado";
    const nextStatus = isPaused ? "lendo" : "pausado";
    const nextProgress = { ...localProgress, status: nextStatus };
    setLocalProgress(nextProgress);
    await saveProgress(nextProgress);
  };

  const coverUrl = getFullUrl(book.coverImagePath);
  const coverContent = coverUrl ? (
    <img src={coverUrl} className="w-full h-full object-cover" alt={book.title} />
  ) : (
    <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(book)} flex items-center justify-center`}>
      <BookOpen className="w-1/3 text-white" />
    </div>
  );

  const pressHandlers = {
    onMouseDown: startPress,
    onMouseUp: endPress,
    onMouseLeave: cancelPress,
    onTouchStart: startPress,
    onTouchEnd: endPress,
    onTouchMove: cancelPress,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };

  if (variant === "small") {
    return (
      <>
        <div
          {...pressHandlers}
          className="flex-shrink-0 w-28 cursor-pointer select-none"
        >
          <div className="bg-card rounded-[14px] p-2.5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all active:scale-95">
            <div className="w-full h-36 rounded-lg overflow-hidden mb-2 shadow-sm">{coverContent}</div>
            <p className="text-xs text-foreground line-clamp-2">{book.title}</p>
            <div className="flex mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="text-[10px]">{i < book.rating ? "🐼" : "🤍"}</span>
              ))}
            </div>
          </div>
        </div>
        {showMenu && (
          <BookContextMenu
            book={book}
            isPaused={localProgress?.status === "pausado"}
            onClose={() => setShowMenu(false)}
            onRead={() => { setShowMenu(false); navigate(`/read/${book.id}`); }}
            onEdit={() => { setShowMenu(false); setShowEdit(true); }}
            onDelete={() => { setShowMenu(false); setShowDeleteConfirm(true); }}
            onFeedback={() => { setShowMenu(false); navigate(`/notes?bookId=${book.id}`); }}
            onPause={localProgress ? handlePause : undefined}
          />
        )}
        {showEdit && <EditBookModal book={book} onClose={() => setShowEdit(false)} onSaved={handleEdited} />}
        {showDeleteConfirm && <DeleteConfirmDialog book={book} onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)} />}
      </>
    );
  }

  if (variant === "list") {
    return (
      <>
        <div
          {...pressHandlers}
          className="bg-gradient-to-r from-card to-[var(--peach)]/10 rounded-[16px] p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer select-none"
        >
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-20 h-28 rounded-lg overflow-hidden shadow-sm">{coverContent}</div>
            <div className="flex-1 space-y-1.5">
              <h3 className="text-foreground">{book.title}</h3>
              <p className="text-sm text-muted-foreground">{book.author}</p>
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="text-sm">{i < book.rating ? "🐼" : "🤍"}</span>
                ))}
              </div>
              <span className="inline-block px-2 py-0.5 bg-[var(--mint)]/30 text-xs rounded-full text-muted-foreground">
                {book.genre}
              </span>
              {localProgress && (
                <div className="space-y-1 pt-1">
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-primary to-[var(--mint)] h-1.5 rounded-full" style={{ width: `${localProgress.progress}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{localProgress.progress}%</p>
                </div>
              )}
            </div>
          </div>
        </div>
        {showMenu && (
          <BookContextMenu
            book={book}
            isPaused={localProgress?.status === "pausado"}
            onClose={() => setShowMenu(false)}
            onRead={() => { setShowMenu(false); navigate(`/read/${book.id}`); }}
            onEdit={() => { setShowMenu(false); setShowEdit(true); }}
            onDelete={() => { setShowMenu(false); setShowDeleteConfirm(true); }}
            onFeedback={() => { setShowMenu(false); navigate(`/notes?bookId=${book.id}`); }}
            onPause={localProgress ? handlePause : undefined}
          />
        )}
        {showEdit && <EditBookModal book={book} onClose={() => setShowEdit(false)} onSaved={handleEdited} />}
        {showDeleteConfirm && <DeleteConfirmDialog book={book} onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)} />}
      </>
    );
  }

  // Grid variant
  return (
    <>
      <div
        {...pressHandlers}
        className="bg-gradient-to-br from-card to-[var(--sky)]/10 rounded-[16px] p-3 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer select-none"
      >
        <div className="w-full h-40 rounded-lg overflow-hidden mb-3 shadow-sm">{coverContent}</div>
        <h4 className="text-sm text-foreground line-clamp-2 mb-2">{book.title}</h4>
        {localProgress && (
          <div className="space-y-1">
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-[var(--mint)] h-1.5 rounded-full" style={{ width: `${localProgress.progress}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{localProgress.progress}%</p>
          </div>
        )}
      </div>
      {showMenu && (
        <BookContextMenu
          book={book}
          isPaused={localProgress?.status === "pausado"}
          onClose={() => setShowMenu(false)}
          onRead={() => { setShowMenu(false); navigate(`/read/${book.id}`); }}
          onEdit={() => { setShowMenu(false); setShowEdit(true); }}
          onDelete={() => { setShowMenu(false); setShowDeleteConfirm(true); }}
          onFeedback={() => { setShowMenu(false); navigate(`/notes?bookId=${book.id}`); }}
          onPause={localProgress ? handlePause : undefined}
        />
      )}
      {showEdit && <EditBookModal book={book} onClose={() => setShowEdit(false)} onSaved={handleEdited} />}
      {showDeleteConfirm && <DeleteConfirmDialog book={book} onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)} />}
    </>
  );
}

function DeleteConfirmDialog({ book, onConfirm, onCancel }: { book: Book; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-card rounded-[24px] p-6 space-y-4 shadow-2xl w-full max-w-sm animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center space-y-2">
          <div className="text-4xl">🗑️</div>
          <h3 className="text-foreground">Excluir livro?</h3>
          <p className="text-sm text-muted-foreground">
            "<span className="text-foreground">{book.title}</span>" será removido permanentemente.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-[14px] transition-all active:scale-95">
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 py-3 bg-red-500 text-white rounded-[14px] transition-all active:scale-95">
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}
