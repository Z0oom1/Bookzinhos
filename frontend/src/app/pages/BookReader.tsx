import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Settings, ChevronLeft, ChevronRight, PenLine, PauseCircle, PlayCircle, CheckCircle, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { fetchBook, fetchProgress, saveProgress } from "../lib/api";
import { getCoverGradient, getFullUrl } from "../lib/types";
import type { Book, ReadingProgress } from "../lib/types";
// @ts-ignore
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

type Theme = "light" | "cream" | "sepia";

export function BookReader() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(18);
  const [theme, setTheme] = useState<Theme>("cream");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [jumpPageInput, setJumpPageInput] = useState("");
  const [zoomScale, setZoomScale] = useState(1);
  const [bookMode, setBookMode] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<"next" | "prev">("next");
  const touchStartRef = useRef<{ x: number, y: number, time: number } | null>(null);
  const initialPinchDistRef = useRef<number | null>(null);

  // PDF State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRightRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfTotalPages, setPdfTotalPages] = useState(1);

  useEffect(() => {
    if (!id) return;
    Promise.all([fetchBook(id), fetchProgress(id)]).then(([b, p]) => {
      setBook(b);
      if (p) {
        setCurrentPage(p.currentPage);
        setIsPaused(p.status === "pausado");
        setIsFinished(p.status === "finalizado");
      }
      setIsLoading(false);
    });
  }, [id]);

  const pdfUrl = book?.pdfPath ? getFullUrl(book.pdfPath) : null;
  const pages = book?.pages ?? [];
  const total = pdfUrl ? pdfTotalPages : Math.max(pages.length, 1);

  // Load PDF Document
  useEffect(() => {
    if (!pdfUrl) return;
    const loadPdf = async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
        
        let doc;
        if (pdfUrl.startsWith("blob:") || pdfUrl.startsWith("data:")) {
          const response = await fetch(pdfUrl);
          const arrayBuffer = await response.arrayBuffer();
          doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        } else {
          doc = await pdfjs.getDocument(pdfUrl).promise;
        }
        
        setPdfDoc(doc);
        setPdfTotalPages(doc.numPages);
      } catch (err) {
        console.error("Failed to load PDF", err);
        setErrorMessage("Erro ao carregar o PDF. Verifique se o arquivo está disponível.");
        setPdfDoc(null);
      }
    };
    loadPdf();
  }, [pdfUrl]);

  // Render PDF Page
  useEffect(() => {
    if (!pdfDoc) return;
    let renderTaskLeft: any = null;
    let renderTaskRight: any = null;

    const renderPages = async () => {
      // 1. Render Left Page (currentPage + 1)
      if (canvasRef.current) {
        try {
          const page = await pdfDoc.getPage(currentPage + 1);
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const viewport = page.getViewport({ scale: 1 });
            const screenWidth = window.innerWidth;
            // Limit width when simulating app container layout
            const wrapperWidth = Math.min(screenWidth, 512); 
            const containerWidth = bookMode ? (wrapperWidth - 48) / 2 : wrapperWidth - 32;
            const scale = containerWidth / viewport.width;
            const scaledViewport = page.getViewport({ scale: Math.max(scale, 0.5) });
            
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;
            
            renderTaskLeft = page.render({ canvasContext: ctx, viewport: scaledViewport });
            await renderTaskLeft.promise;
          }
        } catch (err) {
          if ((err as Error).name !== 'RenderingCancelledException') {
            console.error("Failed to render left page", err);
          }
        }
      }

      // 2. Render Right Page (currentPage + 2) if in bookMode
      if (bookMode && canvasRightRef.current && (currentPage + 1 < pdfTotalPages)) {
        try {
          const page = await pdfDoc.getPage(currentPage + 2);
          const canvas = canvasRightRef.current;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const viewport = page.getViewport({ scale: 1 });
            const screenWidth = window.innerWidth;
            const wrapperWidth = Math.min(screenWidth, 512); 
            const containerWidth = (wrapperWidth - 48) / 2;
            const scale = containerWidth / viewport.width;
            const scaledViewport = page.getViewport({ scale: Math.max(scale, 0.5) });
            
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;
            
            renderTaskRight = page.render({ canvasContext: ctx, viewport: scaledViewport });
            await renderTaskRight.promise;
          }
        } catch (err) {
          if ((err as Error).name !== 'RenderingCancelledException') {
            console.error("Failed to render right page", err);
          }
        }
      }
    };

    renderPages();

    return () => {
      if (renderTaskLeft) renderTaskLeft.cancel();
      if (renderTaskRight) renderTaskRight.cancel();
    };
  }, [pdfDoc, currentPage, bookMode, pdfTotalPages]);

  useEffect(() => {
    if (!showMenu) return;
    const t = setTimeout(() => setShowMenu(false), 5000);
    return () => clearTimeout(t);
  }, [showMenu]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === "Right") {
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "Left") {
        goPrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, total, bookMode]);

  const themeStyles: Record<Theme, string> = {
    light: "bg-white text-slate-900",
    cream: "bg-[#FFF9F0] text-[#433422]",
    sepia: "bg-[#2b1f15] text-[#F5E6D3]",
  };

  const updateProgress = async (pageNum: number, forceStatus?: ReadingProgress["status"]) => {
    if (!id) return;
    const p = ((pageNum + 1) / total) * 100;
    const status = forceStatus || (p >= 100 ? "finalizado" : isPaused ? "pausado" : "lendo");
    
    await saveProgress({
      bookId: id,
      currentPage: pageNum,
      totalPages: total,
      progress: Math.min(Math.round(p), 100),
      status,
      startedAt: Date.now(), // Fallback required properties
      lastReadAt: Date.now()
    });
    
    if (status === "finalizado") setIsFinished(true);
    else setIsFinished(false);
  };

  const goNext = () => {
    const step = bookMode ? 2 : 1;
    if (currentPage < total - step) {
      setTransitionDirection("next");
      setIsTransitioning(true);
      setTimeout(() => {
        const next = currentPage + step;
        setCurrentPage(next);
        setIsTransitioning(false);
        updateProgress(next);
      }, 250);
    }
  };

  const goPrev = () => {
    if (currentPage > 0) {
      setTransitionDirection("prev");
      setIsTransitioning(true);
      setTimeout(() => {
        const prev = Math.max(0, currentPage - (bookMode ? 2 : 1));
        setCurrentPage(prev);
        setIsTransitioning(false);
        updateProgress(prev);
      }, 250);
    }
  };

  const handleJumpPage = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPageInput);
    if (!isNaN(p) && p >= 1 && p <= total) {
      setCurrentPage(p - 1);
      updateProgress(p - 1);
      setJumpPageInput("");
    }
  };

  const toggleFinished = async () => {
    const nextStatus = isFinished ? "lendo" : "finalizado";
    await updateProgress(currentPage, nextStatus);
    setIsFinished(!isFinished);
    if (!isFinished) {
      setCurrentPage(total - 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist / initialPinchDistRef.current;
      setZoomScale(prev => Math.min(Math.max(prev * delta, 1), 5));
      initialPinchDistRef.current = dist;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current && e.changedTouches.length === 1 && zoomScale === 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;

      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) && deltaTime < 300) {
        if (deltaX < 0) {
          goNext();
        } else {
          goPrev();
        }
      }
    }
    touchStartRef.current = null;
    initialPinchDistRef.current = null;
  };

  const handleZoom = (delta: number) => {
    setZoomScale(prev => Math.min(Math.max(prev + delta, 1), 5));
  };

  const resetZoom = () => setZoomScale(1);

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
          <button onClick={() => navigate(-1)} className="px-6 py-3 bg-[var(--primary)] text-white rounded-2xl active:scale-95 transition-all cursor-pointer font-extrabold text-xs uppercase tracking-widest">Voltar</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeStyles[theme]} transition-colors duration-300 relative select-none overflow-hidden font-medium`}>
      <div 
        onClick={() => setShowMenu(!showMenu)} 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="min-h-screen flex flex-col items-center justify-start px-4 py-20 cursor-pointer"
      >
        <div
          className={`w-full ${bookMode ? "max-w-4xl" : "max-w-2xl"} leading-relaxed transition-all ${isTransitioning ? (transitionDirection === "next" ? "page-flip-next" : "page-flip-prev") : "opacity-100 animate-fade-in"}`}
          style={{ 
            fontSize: `${fontSize}px`,
            transform: `scale(${zoomScale})`,
            transformOrigin: 'top center'
          }}
        >
          {pdfUrl ? (
            bookMode ? (
              <div className="flex gap-4.5 justify-center w-full">
                {!pdfDoc ? (
                  errorMessage ? (
                    <div className="text-center mt-20 text-red-500 font-bold text-sm">{errorMessage}</div>
                  ) : (
                    <div className="text-center mt-20 animate-pulse-soft text-xs font-extrabold uppercase tracking-widest">Carregando PDF... 🐾</div>
                  )
                ) : (
                  <>
                    <canvas ref={canvasRef} className="w-1/2 max-w-[50%] shadow-lg rounded-2xl border border-slate-100/50 bg-white" />
                    {currentPage + 1 < total ? (
                      <canvas ref={canvasRightRef} className="w-1/2 max-w-[50%] shadow-lg rounded-2xl border border-slate-100/50 bg-white" />
                    ) : (
                      <div className="w-1/2 max-w-[50%] rounded-2xl border border-dashed border-slate-200/20 bg-slate-50/5 flex items-center justify-center text-[10px] uppercase font-bold tracking-wider text-slate-400">Fim do Livro 🏁</div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="flex justify-center w-full">
                {!pdfDoc ? (
                  errorMessage ? (
                    <div className="text-center mt-20 text-red-500 font-bold text-sm">{errorMessage}</div>
                  ) : (
                    <div className="text-center mt-20 animate-pulse-soft text-xs font-extrabold uppercase tracking-widest">Carregando PDF... 🐾</div>
                  )
                ) : (
                  <canvas ref={canvasRef} className="max-w-full shadow-lg rounded-2xl border border-slate-100/50" />
                )}
              </div>
            )
          ) : (
            bookMode ? (
              <div className="flex gap-6 w-full">
                <div className="flex-1 whitespace-pre-wrap leading-loose px-2">{pages[currentPage]}</div>
                {currentPage + 1 < pages.length ? (
                  <div className="flex-1 whitespace-pre-wrap leading-loose px-2">{pages[currentPage + 1]}</div>
                ) : (
                  <div className="flex-1 whitespace-pre-wrap leading-loose px-2 border-l border-slate-200/30 flex items-center justify-center text-[10px] uppercase font-bold tracking-wider text-slate-400">Fim do Livro 🏁</div>
                )}
              </div>
            ) : (
              <div className="whitespace-pre-wrap leading-loose px-2">{pages[currentPage]}</div>
            )
          )}
        </div>
      </div>

      {/* Top Menu */}
      <div className={`fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-slate-100 transition-all duration-350 shadow-md z-40 ${showMenu ? "translate-y-0" : "-translate-y-full"}`}>
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2.5 hover:bg-slate-100 rounded-full transition-all active:scale-95 cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-[var(--text-main)]" />
          </button>
          <h3 className="text-[var(--text-main)] truncate px-4 font-extrabold text-sm">{book?.title}</h3>
          <div className="flex items-center gap-1.5">
            <button onClick={() => handleZoom(0.2)} className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-95 cursor-pointer">
              <ZoomIn className="w-4 h-4 text-[var(--text-main)]" />
            </button>
            <button onClick={() => handleZoom(-0.2)} className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-95 cursor-pointer">
              <ZoomOut className="w-4 h-4 text-[var(--text-main)]" />
            </button>
            <button onClick={resetZoom} className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-95 flex items-center gap-1 text-[9px] font-extrabold text-[var(--text-main)] uppercase tracking-widest cursor-pointer">
              <Maximize2 className="w-4 h-4" /> Normal
            </button>
            <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-95 cursor-pointer">
              <Settings className="w-5 h-5 text-[var(--text-main)]" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Menu */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 transition-all duration-350 shadow-[0_-10px_45px_rgba(0,0,0,0.06)] z-40 px-4 pb-8 pt-4 ${showMenu ? "translate-y-0" : "translate-y-full"}`}>
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between gap-4">
            <button onClick={goPrev} disabled={currentPage === 0} className="p-2.5 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-full transition-all active:scale-90 disabled:opacity-30 cursor-pointer">
              <ChevronLeft className="w-5 h-5 text-[var(--text-main)]" />
            </button>
            
            <form onSubmit={handleJumpPage} className="flex-1 flex items-center justify-center gap-2">
               <span className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest">Pg.</span>
               <input 
                 type="number" 
                 value={jumpPageInput}
                 onChange={e => setJumpPageInput(e.target.value)}
                 placeholder={`${currentPage + 1}`}
                 className="w-14 bg-slate-50 border border-slate-100 rounded-xl py-1 px-2.5 text-center text-xs font-extrabold outline-none focus:border-[var(--primary)]/30 focus:ring-4 focus:ring-[var(--primary)]/5 transition-all"
               />
               <span className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest">de {total}</span>
            </form>

            <button onClick={goNext} disabled={currentPage >= total - 1} className="p-2.5 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-full transition-all active:scale-90 disabled:opacity-30 cursor-pointer">
              <ChevronRight className="w-5 h-5 text-[var(--text-main)]" />
            </button>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden shadow-inner">
            <div className="bg-[var(--primary)] h-1.5 rounded-full transition-all" style={{ width: `${((currentPage + 1) / total) * 100}%` }} />
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => {
                const next = !isPaused;
                setIsPaused(next);
                updateProgress(currentPage, next ? "pausado" : "lendo");
              }} 
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all active:scale-95 font-extrabold text-[10px] uppercase tracking-widest cursor-pointer ${isPaused ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/10" : "bg-white border border-slate-200 text-[var(--text-main)] hover:bg-slate-50 shadow-sm"}`}
            >
              {isPaused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
              {isPaused ? "Retomar" : "Pausar"}
            </button>
            
            <button 
              onClick={toggleFinished}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all active:scale-95 font-extrabold text-[10px] uppercase tracking-widest cursor-pointer ${isFinished ? "bg-[var(--primary)]/10 border-transparent text-[var(--primary)] shadow-sm" : "bg-white border border-slate-200 text-[var(--text-main)] hover:bg-slate-50 shadow-sm"}`}
            >
              <CheckCircle className={`w-4 h-4 ${isFinished ? "animate-bounce" : ""}`} />
              {isFinished ? "Lido! 🐼" : "Marcar Lido"}
            </button>

            <button onClick={() => navigate(`/notes?bookId=${id}`)} className="p-3.5 bg-slate-50 border border-slate-150 text-[var(--text-main)] rounded-xl active:scale-90 transition-all hover:bg-slate-100 cursor-pointer shadow-sm">
              <PenLine className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/30 flex items-end z-50 backdrop-blur-sm animate-fade-in" onClick={() => setShowSettings(false)}>
          <div className="w-full bg-white rounded-t-[2.5rem] p-8 space-y-8 shadow-2xl animate-slide-up border border-slate-100" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto" />
            <h3 className="text-[var(--text-main)] font-extrabold text-base text-center uppercase tracking-widest">Ajustes de Leitura 🐾</h3>
            
            {!pdfUrl && (
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest">Tamanho da Letra</label>
                  <span className="text-[10px] font-extrabold bg-[var(--primary)]/10 text-[var(--primary)] px-2.5 py-1 rounded-lg uppercase tracking-widest">{fontSize}px</span>
                </div>
                <div className="flex items-center gap-4 bg-slate-50 p-4.5 rounded-2xl border border-slate-100 shadow-inner">
                  <span className="text-xs font-bold opacity-50 select-none">A</span>
                  <input type="range" min="14" max="32" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="flex-1 accent-[var(--primary)]" />
                  <span className="text-xl font-bold select-none">A</span>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <label className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest px-1">Layout de Leitura</label>
              <div className="flex gap-3">
                <button 
                  onClick={() => setBookMode(false)}
                  className={`flex-1 py-4 rounded-xl transition-all active:scale-95 font-extrabold text-[10px] uppercase tracking-widest border cursor-pointer ${!bookMode ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] shadow-sm" : "border-slate-200 bg-slate-50 text-slate-450"}`}
                >
                  Página Única 📄
                </button>
                <button 
                  onClick={() => {
                    setBookMode(true);
                    setCurrentPage(prev => prev - (prev % 2));
                  }}
                  className={`flex-1 py-4 rounded-xl transition-all active:scale-95 font-extrabold text-[10px] uppercase tracking-widest border cursor-pointer ${bookMode ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] shadow-sm" : "border-slate-200 bg-slate-50 text-slate-450"}`}
                >
                  Modo Livro 📖
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest px-1">Tema Visual</label>
              <div className="grid grid-cols-3 gap-3">
                {(["light", "cream", "sepia"] as Theme[]).map((t) => (
                  <button 
                    key={t} 
                    onClick={() => setTheme(t)} 
                    className={`py-4 rounded-xl capitalize transition-all active:scale-95 font-extrabold text-[10px] uppercase tracking-widest border cursor-pointer ${theme === t ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] shadow-sm" : "border-slate-200 bg-slate-50 text-slate-400"}`}
                  >
                    {t === "light" ? "Claro" : t === "cream" ? "Creme" : "Sépia"}
                  </button>
                ))}
              </div>
            </div>
            
            <button onClick={() => setShowSettings(false)} className="w-full py-4 bg-[var(--primary)] text-white font-extrabold text-[10px] uppercase tracking-widest rounded-xl shadow-md shadow-[var(--primary)]/15 active:scale-95 transition-all cursor-pointer">
              Pronto ✨
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
