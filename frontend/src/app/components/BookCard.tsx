import { useRef, useState, useCallback } from "react";
import { BookOpen } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { getCoverGradient, getFullUrl } from "../lib/types";
import { BookContextMenu } from "./BookContextMenu";
import { EditBookModal } from "./EditBookModal";
import { deleteBook, saveProgress } from "../lib/api";
import type { Book, ReadingProgress } from "../lib/types";

interface Props {
  book: Book;
  progress?: ReadingProgress;
  variant?: "grid" | "list" | "small" | "shelf";
  onDeleted?: (id: string) => void;
  onEdited?: (updated: Book) => void;
}

export function BookCard({ book, progress: initialProgress, variant = "grid", onDeleted, onEdited }: Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showMenu, setShowMenu] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [localProgress, setLocalProgress] = useState(initialProgress);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const longPressedRef = useRef(false);
  const touchStartPos = useRef({ x: 0, y: 0 });

  const startPress = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    longPressedRef.current = false;
    
    // Track start position
    if ('touches' in e) {
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      touchStartPos.current = { x: e.clientX, y: e.clientY };
    }

    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      setShowMenu(true);
      searchParams.set("hideNav", "true");
      setSearchParams(searchParams);
    }, 500);
  }, [searchParams, setSearchParams]);

  const handleCloseMenu = () => {
    setShowMenu(false);
    searchParams.delete("hideNav");
    setSearchParams(searchParams);
  };

  const cancelPress = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  const endPress = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    clearTimeout(timerRef.current);
    
    if (!longPressedRef.current) {
      // Check distance moved
      let endX, endY;
      if ('changedTouches' in e) {
        endX = e.changedTouches[0].clientX;
        endY = e.changedTouches[0].clientY;
      } else {
        endX = e.clientX;
        endY = e.clientY;
      }

      const dist = Math.sqrt(
        Math.pow(endX - touchStartPos.current.x, 2) + 
        Math.pow(endY - touchStartPos.current.y, 2)
      );

      // Only navigate if movement is small (less than 10px)
      if (dist < 10) {
        navigate(`/book/${book.id}`);
      }
    }
    longPressedRef.current = false;
  }, [book.id, navigate]);

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    handleCloseMenu();
    await deleteBook(book.id);
    onDeleted?.(book.id);
  };

  const handleEdited = (updated: Book) => {
    setShowEdit(false);
    onEdited?.(updated);
  };

  const handlePause = async () => {
    handleCloseMenu();
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
            onClose={handleCloseMenu}
            onRead={() => { handleCloseMenu(); navigate(`/read/${book.id}`); }}
            onEdit={() => { handleCloseMenu(); setShowEdit(true); }}
            onDelete={() => { handleCloseMenu(); setShowDeleteConfirm(true); }}
            onFeedback={() => { handleCloseMenu(); navigate(`/notes?bookId=${book.id}`); }}
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
            onClose={handleCloseMenu}
            onRead={() => { handleCloseMenu(); navigate(`/read/${book.id}`); }}
            onEdit={() => { handleCloseMenu(); setShowEdit(true); }}
            onDelete={() => { handleCloseMenu(); setShowDeleteConfirm(true); }}
            onFeedback={() => { handleCloseMenu(); navigate(`/notes?bookId=${book.id}`); }}
            onPause={localProgress ? handlePause : undefined}
          />
        )}
        {showEdit && <EditBookModal book={book} onClose={() => setShowEdit(false)} onSaved={handleEdited} />}
        {showDeleteConfirm && <DeleteConfirmDialog book={book} onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)} />}
      </>
    );
  }

  if (variant === "shelf") {
    return (
      <>
        <div
          {...pressHandlers}
          className="relative w-24 h-[135px] group cursor-pointer origin-bottom transition-all duration-300 hover:scale-110 hover:-translate-y-2 z-10"
        >
          {/* Main Book Cover */}
          <div className="absolute inset-0 rounded-[2px] rounded-r-[6px] overflow-hidden shadow-[-2px_0_5px_rgba(0,0,0,0.2)] bg-gray-100 border-l-[3px] border-black/10">
            {coverContent}
            {/* Book Spine Highlight */}
            <div className="absolute top-0 bottom-0 left-0 w-2 bg-gradient-to-r from-white/30 to-transparent" />
            {/* Overlay Gradient for realism */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-black/20 mix-blend-multiply pointer-events-none" />
          </div>
          
          {/* Shadow behind the book on the shelf */}
          <div className="absolute -bottom-1 -right-2 w-12 h-2 bg-black/40 blur-sm rounded-full -z-10 group-hover:scale-110 transition-transform" />
        </div>
        {showMenu && (
          <BookContextMenu
            book={book}
            isPaused={localProgress?.status === "pausado"}
            onClose={handleCloseMenu}
            onRead={() => { handleCloseMenu(); navigate(`/read/${book.id}`); }}
            onEdit={() => { handleCloseMenu(); setShowEdit(true); }}
            onDelete={() => { handleCloseMenu(); setShowDeleteConfirm(true); }}
            onFeedback={() => { handleCloseMenu(); navigate(`/notes?bookId=${book.id}`); }}
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
          onClose={handleCloseMenu}
          onRead={() => { handleCloseMenu(); navigate(`/read/${book.id}`); }}
          onEdit={() => { handleCloseMenu(); setShowEdit(true); }}
          onDelete={() => { handleCloseMenu(); setShowDeleteConfirm(true); }}
          onFeedback={() => { handleCloseMenu(); navigate(`/notes?bookId=${book.id}`); }}
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" onClick={onCancel}>
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
