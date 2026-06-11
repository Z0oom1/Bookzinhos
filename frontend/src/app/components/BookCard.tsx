import { useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
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
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [localProgress, setLocalProgress] = useState(initialProgress);
  const timerRef = useRef<any>(undefined);
  const longPressedRef = useRef(false);
  const touchStartPos = useRef({ x: 0, y: 0 });

  const startPress = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ("button" in e && e.button !== 0) {
      return;
    }
    longPressedRef.current = false;
    
    if ('touches' in e) {
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      touchStartPos.current = { x: e.clientX, y: e.clientY };
    }

    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      setShowMenu(true);
      if ('touches' in e) {
        setMenuPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      } else {
        setMenuPos({ x: e.clientX, y: e.clientY });
      }
    }, 500);
  }, []);

  const handleCloseMenu = () => {
    setShowMenu(false);
    setMenuPos(null);
  };

  const cancelPress = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  const endPress = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    clearTimeout(timerRef.current);
    
    if (!longPressedRef.current) {
      if ("button" in e && e.button !== 0) {
        return;
      }
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
    const nextStatus: "lendo" | "pausado" = isPaused ? "lendo" : "pausado";
    const nextProgress: ReadingProgress = { ...localProgress, status: nextStatus };
    setLocalProgress(nextProgress);
    await saveProgress(nextProgress);
  };

  const handleReadLater = async () => {
    handleCloseMenu();
    const nextProgress: ReadingProgress = localProgress
      ? { ...localProgress, status: "ler-depois" }
      : {
          bookId: book.id,
          currentPage: 0,
          totalPages: 100,
          progress: 0,
          status: "ler-depois",
          startedAt: Date.now(),
          lastReadAt: Date.now()
        };
    setLocalProgress(nextProgress);
    await saveProgress(nextProgress);
  };

  const coverUrl = getFullUrl(book.coverImagePath);
  const coverContent = coverUrl ? (
    <img src={coverUrl} className="w-full h-full object-cover animate-fade-in" alt={book.title} />
  ) : (
    <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(book)} flex items-center justify-center`}>
      <BookOpen className="w-1/3 text-white/50" />
    </div>
  );

  const pressHandlers = {
    onMouseDown: startPress,
    onMouseUp: endPress,
    onMouseLeave: cancelPress,
    onTouchStart: startPress,
    onTouchEnd: endPress,
    onTouchMove: cancelPress,
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      clearTimeout(timerRef.current);
      longPressedRef.current = true;
      setShowMenu(true);
      setMenuPos({ x: e.clientX, y: e.clientY });
    },
  };

  if (variant === "small") {
    return (
      <>
        <div
          {...pressHandlers}
          className="flex-shrink-0 w-28 cursor-pointer select-none"
        >
          <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-2xl p-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all active:scale-95">
            <div className="w-full aspect-[2/3] rounded-xl overflow-hidden mb-2 shadow-sm border border-slate-100/50">{coverContent}</div>
            <p className="text-xs font-bold text-[var(--text-main)] line-clamp-2 leading-relaxed">{book.title}</p>
            <div className="flex mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="text-[10px] select-none">{i < book.rating ? "🐼" : "🤍"}</span>
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
            onReadLater={handleReadLater}
            menuPos={menuPos}
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
          className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-[2.25rem] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all cursor-pointer select-none"
        >
          <div className="flex gap-4.5">
            <div className="flex-shrink-0 w-20 h-28 rounded-2xl overflow-hidden shadow-md border border-white/50">{coverContent}</div>
            <div className="flex-1 space-y-1.5 py-1 min-w-0">
              <h3 className="font-extrabold text-[var(--text-main)] text-sm truncate leading-snug">{book.title}</h3>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{book.author}</p>
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="text-xs select-none">{i < book.rating ? "🐼" : "🤍"}</span>
                ))}
              </div>
              <div className="pt-1">
                <span className="inline-block px-3 py-1 bg-[var(--primary)]/10 text-[9px] font-extrabold rounded-full text-[var(--primary)] uppercase tracking-widest">
                  {book.genre}
                </span>
              </div>
              {localProgress && (
                <div className="space-y-1.5 pt-2">
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden shadow-inner">
                    <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--lavender)] h-1.5 rounded-full" style={{ width: `${localProgress.progress}%` }} />
                  </div>
                  <p className="text-[9px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest">{localProgress.progress}% concluído</p>
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
            onReadLater={handleReadLater}
            menuPos={menuPos}
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
          <div className="absolute inset-0 rounded-[2px] rounded-r-[6px] overflow-hidden shadow-[-2px_0_5px_rgba(0,0,0,0.15)] bg-slate-50 border-l-[3px] border-black/10 transition-all">
            {coverContent}
            {/* Book Spine Highlight */}
            <div className="absolute top-0 bottom-0 left-0 w-2 bg-gradient-to-r from-white/20 to-transparent" />
            {/* Overlay Gradient for realism */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-black/15 mix-blend-multiply pointer-events-none" />
          </div>
          
          {/* Shadow behind the book on the shelf */}
          <div className="absolute -bottom-1 -right-2 w-12 h-2 bg-black/20 blur-sm rounded-full -z-10 group-hover:scale-110 transition-transform" />
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
            onReadLater={handleReadLater}
            menuPos={menuPos}
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
        className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-[2rem] p-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all cursor-pointer select-none"
      >
        <div className="w-full aspect-[2/3] rounded-2xl overflow-hidden mb-3.5 shadow-sm border border-slate-100/50">{coverContent}</div>
        <h4 className="text-xs font-extrabold text-[var(--text-main)] line-clamp-2 mb-2 leading-relaxed">{book.title}</h4>
        {localProgress && (
          <div className="space-y-1.5 pt-0.5">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden shadow-inner">
              <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--lavender)] h-1.5 rounded-full" style={{ width: `${localProgress.progress}%` }} />
            </div>
            <p className="text-[9px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest">{localProgress.progress}% concluído</p>
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
          onReadLater={handleReadLater}
          menuPos={menuPos}
        />
      )}
      {showEdit && <EditBookModal book={book} onClose={() => setShowEdit(false)} onSaved={handleEdited} />}
      {showDeleteConfirm && <DeleteConfirmDialog book={book} onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)} />}
    </>
  );
}

function DeleteConfirmDialog({ book, onConfirm, onCancel }: { book: Book; onConfirm: () => void; onCancel: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 animate-fade-in" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-[2rem] p-6 space-y-4 shadow-2xl w-full max-w-sm border border-slate-100 animate-bounce-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center space-y-2">
          <div className="text-4xl select-none">🗑️</div>
          <h3 className="text-[var(--text-main)] font-extrabold text-sm uppercase tracking-widest">Excluir livro?</h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed font-semibold">
            "<span className="text-[var(--text-main)]">{book.title}</span>" será removido permanentemente.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 bg-slate-50 border border-slate-200 text-slate-500 font-extrabold text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-100 active:scale-95 transition-all cursor-pointer">
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 py-3 bg-red-500 text-white font-extrabold text-[10px] uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-red-500/10 active:scale-95 transition-all cursor-pointer">
            Excluir
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
