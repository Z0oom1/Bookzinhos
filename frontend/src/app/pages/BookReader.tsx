import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Settings, ChevronLeft, ChevronRight, PenLine, PauseCircle, PlayCircle, CheckCircle, ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, List, Download, Loader2 } from "lucide-react";
import { fetchBook, fetchProgress, saveProgress, fetchChapters, saveChapter, deleteChapter } from "../lib/api";
import { getCoverGradient, getFullUrl } from "../lib/types";
import type { Book, ReadingProgress, BookChapter } from "../lib/types";
import { useDeviceTier } from "../components/ui/use-device-tier";
import { downloadRemoteFile, safeFileName } from "../lib/download";
// @ts-ignore
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

type Theme = "light" | "cream" | "sepia";

export function BookReader() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tier = useDeviceTier();
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
  const [bookMode, setBookMode] = useState(() => tier !== "mobile");
  const [transitionDirection, setTransitionDirection] = useState<"next" | "prev">("next");
  const touchStartRef = useRef<{ x: number, y: number, time: number } | null>(null);
  const initialPinchDistRef = useRef<number | null>(null);

  // Chapter States
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [chapterTitleInput, setChapterTitleInput] = useState("");
  const [hoveredChapter, setHoveredChapter] = useState<BookChapter | null>(null);
  const [showMobileChapters, setShowMobileChapters] = useState(false);

  // Zoom & Pan State
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const readerRootRef = useRef<HTMLDivElement>(null);

  const [readerWidth, setReaderWidth] = useState(512);
  const lastTapRef = useRef<number>(0);

  // Fullscreen (Fullscreen API) & Download PDF
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const fullscreenSupported = typeof document !== "undefined" && !!document.documentElement.requestFullscreen;

  useEffect(() => {
    const handleFullscreenChange = () => setIsNativeFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleNativeFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await readerRootRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Erro ao alternar tela cheia", err);
    }
  };

  const handleDownloadPdf = async () => {
    if (!pdfUrl || isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadRemoteFile(pdfUrl, safeFileName(book?.title || "livro", "pdf"));
    } catch (err) {
      console.error("Erro ao baixar PDF", err);
      setErrorMessage("Não foi possível baixar o PDF agora. Tente novamente.");
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setReaderWidth(entry.contentRect.width);
      }
    });

    observer.observe(el);
    return () => {
      observer.unobserve(el);
    };
  }, []);

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
        setCurrentPage(bookMode ? p.currentPage - (p.currentPage % 2) : p.currentPage);
        setIsPaused(p.status === "pausado");
        setIsFinished(p.status === "finalizado");
      }
      setIsLoading(false);
    });
  }, [id]);

  const loadChapters = () => {
    if (!id) return;
    fetchChapters(id).then((data) => {
      setChapters(data || []);
    });
  };

  useEffect(() => {
    loadChapters();
    const interval = setInterval(loadChapters, 10000);
    return () => clearInterval(interval);
  }, [id]);

  const handleSaveNewChapter = async () => {
    if (!id || !chapterTitleInput.trim()) return;
    await saveChapter(id, currentPage, chapterTitleInput.trim());
    setIsCreateModalOpen(false);
    setChapterTitleInput("");
    loadChapters();
  };

  const handleSaveEditChapter = async () => {
    if (!id || !chapterTitleInput.trim()) return;
    await saveChapter(id, currentPage, chapterTitleInput.trim());
    setIsEditModalOpen(false);
    setChapterTitleInput("");
    loadChapters();
  };

  const handleDeleteChapter = async (page: number) => {
    if (!id) return;
    await deleteChapter(id, page);
    loadChapters();
  };

  const pdfUrl = book?.pdfPath ? getFullUrl(book.pdfPath) : null;
  const pages = book?.pages ?? [];
  const total = pdfUrl ? pdfTotalPages : Math.max(pages.length, 1);

  const currentChapter = (() => {
    const sorted = [...chapters].sort((a, b) => a.startPage - b.startPage);
    let active = null;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].startPage <= currentPage) {
        active = {
          chapter: sorted[i],
          number: i + 1
        };
      } else {
        break;
      }
    }
    return active;
  })();

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
            const wrapperWidth = readerWidth; 
            const containerWidth = bookMode ? (wrapperWidth - 48) / 2 : wrapperWidth - 32;
            const scale = containerWidth / viewport.width;
            
            // Render at high-DPI (2.5x multiplier)
            const dpr = Math.max(window.devicePixelRatio || 1, 2.5);
            const renderScale = scale * dpr;
            const scaledViewport = page.getViewport({ scale: renderScale });
            
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;
            canvas.style.width = `${containerWidth}px`;
            canvas.style.height = `${containerWidth * (viewport.height / viewport.width)}px`;
            
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
            const wrapperWidth = readerWidth; 
            const containerWidth = (wrapperWidth - 48) / 2;
            const scale = containerWidth / viewport.width;
            
            // Render at high-DPI (2.5x multiplier)
            const dpr = Math.max(window.devicePixelRatio || 1, 2.5);
            const renderScale = scale * dpr;
            const scaledViewport = page.getViewport({ scale: renderScale });
            
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;
            canvas.style.width = `${containerWidth}px`;
            canvas.style.height = `${containerWidth * (viewport.height / viewport.width)}px`;
            
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
  }, [pdfDoc, currentPage, bookMode, pdfTotalPages, readerWidth]);

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
      } else if (e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const existing = chapters.find(c => c.startPage === currentPage);
        if (existing) {
          setChapterTitleInput(existing.title);
          setIsEditModalOpen(true);
        } else {
          const indexBefore = chapters.filter(c => c.startPage < currentPage).length;
          setChapterTitleInput(`Capítulo ${indexBefore + 1}`);
          setIsCreateModalOpen(true);
        }
      } else if (e.altKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        const existing = chapters.find(c => c.startPage === currentPage);
        if (existing) {
          setChapterTitleInput(existing.title);
          setIsEditModalOpen(true);
        }
      } else if (e.altKey && e.key.toLowerCase() === "j") {
        e.preventDefault();
        const existing = chapters.find(c => c.startPage === currentPage);
        if (existing) {
          handleDeleteChapter(currentPage);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, total, bookMode, chapters]);

  // Scroll wheel zooming
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = 0.08;
      const delta = -e.deltaY;
      setZoomScale((prev) => {
        const next = prev + (delta > 0 ? zoomFactor : -zoomFactor);
        const clamped = Math.min(Math.max(next, 1), 5);
        if (clamped === 1) {
          setPanOffset({ x: 0, y: 0 });
        }
        return clamped;
      });
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // Global mousemove/mouseup listener for responsive drag panning
  useEffect(() => {
    if (!isPanning) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasDraggedRef.current = true;
      }
      if (zoomScale > 1) {
        setPanOffset({
          x: panStartRef.current.x + dx,
          y: panStartRef.current.y + dy
        });
      }
    };

    const handleWindowMouseUp = () => {
      setIsPanning(false);
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [isPanning, zoomScale]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only drag with left mouse button
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...panOffset };
    hasDraggedRef.current = false;
    setIsPanning(true);
    if (zoomScale > 1) {
      e.preventDefault();
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!hasDraggedRef.current) {
      setShowMenu(prev => !prev);
    }
  };

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
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        if (zoomScale > 1) {
          resetZoom();
        } else {
          setZoomScale(2.5);
        }
        touchStartRef.current = null;
        return;
      }
      lastTapRef.current = now;

      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      };
      if (zoomScale > 1) {
        dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        panStartRef.current = { ...panOffset };
        setIsPanning(true);
      }
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
      setZoomScale(prev => {
        const next = Math.min(Math.max(prev * delta, 1), 5);
        if (next === 1) {
          setPanOffset({ x: 0, y: 0 });
        }
        return next;
      });
      initialPinchDistRef.current = dist;
    } else if (e.touches.length === 1 && isPanning && zoomScale > 1) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      setPanOffset({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy
      });
      hasDraggedRef.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPanning(false);
    if (touchStartRef.current && e.changedTouches.length === 1) {
      const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;
      const dist = Math.hypot(deltaX, deltaY);

      if (zoomScale === 1) {
        if (dist > 50 && Math.abs(deltaX) > Math.abs(deltaY) && deltaTime < 300) {
          if (deltaX < 0) {
            goNext();
          } else {
            goPrev();
          }
        } else if (dist < 10 && deltaTime < 300) {
          setShowMenu(prev => !prev);
        }
      } else if (zoomScale > 1) {
        if (!hasDraggedRef.current && dist < 10 && deltaTime < 300) {
          setShowMenu(prev => !prev);
        }
      }
    }
    touchStartRef.current = null;
    initialPinchDistRef.current = null;
    hasDraggedRef.current = false;
  };

  const handleZoom = (delta: number) => {
    setZoomScale(prev => {
      const next = Math.min(Math.max(prev + delta, 1), 5);
      if (next === 1) {
        setPanOffset({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const resetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  if (isLoading) {
    return (
      <div className="h-screen md:h-full bg-background flex items-center justify-center">
        <div className="text-5xl animate-bounce-in">🐼</div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="h-screen md:h-full bg-background flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <div className="text-4xl">📚</div>
          <h2 className="text-foreground font-extrabold text-lg">Livro não encontrado</h2>
          <button onClick={() => navigate(-1)} className="px-6 py-3 bg-[var(--primary)] text-white rounded-2xl active:scale-95 transition-all cursor-pointer font-extrabold text-xs uppercase tracking-widest">Voltar</button>
        </div>
      </div>
    );
  }

  return (
    <div ref={readerRootRef} className={`h-screen md:h-full ${themeStyles[theme]} transition-colors duration-300 relative select-none overflow-hidden font-medium`}>
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`h-full w-full flex flex-col items-center justify-center px-4 py-20 transition-all ${
          zoomScale > 1 ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-pointer"
        }`}
      >
        {/* Container externo para zoom e pan */}
        <div
          style={{ 
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
            transformOrigin: 'center center'
          }}
          className={`w-full ${bookMode ? "max-w-4xl" : "max-w-2xl"} transition-all duration-100`}
        >
          {/* Container interno para transição de virada de página */}
          <div
            className={`w-full leading-relaxed transition-all ${isTransitioning ? (transitionDirection === "next" ? "page-flip-next" : "page-flip-prev") : "opacity-100 animate-fade-in"}`}
            style={{ 
              fontSize: `${fontSize}px`
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
      </div>

      {/* Top Menu */}
      <div className={`absolute top-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-slate-100 transition-all duration-350 shadow-md z-[9998] pointer-events-none ${showMenu ? "translate-y-0" : "-translate-y-full"}`}>
        <div className={`${bookMode ? "max-w-4xl" : "max-w-2xl"} mx-auto px-3 md:px-6 py-3 md:py-4 flex items-center justify-between gap-1 pointer-events-auto transition-all`}>
          <button onClick={() => navigate(-1)} className="p-2.5 hover:bg-slate-100 rounded-full transition-all active:scale-95 cursor-pointer flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-[var(--text-main)]" />
          </button>
          <div className="flex flex-col items-center flex-1 min-w-0">
            <h3 className="text-[var(--text-main)] truncate px-2 font-extrabold text-sm w-full text-center">{book?.title}</h3>
            {currentChapter && (
              <span className="text-[10px] font-bold text-[var(--text-muted)] truncate px-4 uppercase tracking-widest leading-none mt-0.5 animate-fade-in">
                Capítulo {currentChapter.number}: {currentChapter.chapter.title}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5 md:gap-1.5 flex-shrink-0">
            <button title="Aumentar zoom" onClick={() => handleZoom(0.2)} className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-95 cursor-pointer hidden sm:inline-flex">
              <ZoomIn className="w-4 h-4 text-[var(--text-main)]" />
            </button>
            <button title="Diminuir zoom" onClick={() => handleZoom(-0.2)} className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-95 cursor-pointer hidden sm:inline-flex">
              <ZoomOut className="w-4 h-4 text-[var(--text-main)]" />
            </button>
            <button title="Redefinir zoom" onClick={resetZoom} className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-95 cursor-pointer hidden sm:inline-flex">
              <RotateCcw className="w-4 h-4 text-[var(--text-main)]" />
            </button>
            {pdfUrl && (
              <button
                title="Baixar PDF"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isDownloading ? <Loader2 className="w-4.5 h-4.5 text-[var(--text-main)] animate-spin" /> : <Download className="w-4.5 h-4.5 text-[var(--text-main)]" />}
              </button>
            )}
            {fullscreenSupported && (
              <button
                title={isNativeFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                onClick={toggleNativeFullscreen}
                className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-95 cursor-pointer"
              >
                {isNativeFullscreen ? <Minimize2 className="w-4.5 h-4.5 text-[var(--text-main)]" /> : <Maximize2 className="w-4.5 h-4.5 text-[var(--text-main)]" />}
              </button>
            )}
            <button title="Ajustes" onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-95 cursor-pointer">
              <Settings className="w-5 h-5 text-[var(--text-main)]" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Menu */}
      <div className={`absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 transition-all duration-350 shadow-[0_-10px_45px_rgba(0,0,0,0.06)] z-40 px-4 md:px-6 pb-8 pt-4 ${showMenu ? "translate-y-0" : "translate-y-full"}`}>
        <div className={`${bookMode ? "max-w-4xl" : "max-w-2xl"} mx-auto space-y-4 transition-all`}>
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

          <div className="relative w-full py-2 animate-fade-in">
            <div className="w-full bg-slate-100 rounded-full h-1.5 shadow-inner relative">
              <div 
                className="bg-[var(--primary)] h-1.5 rounded-full transition-all" 
                style={{ width: `${((currentPage + 1) / total) * 100}%` }} 
              />
              {chapters.map((ch, idx) => {
                const pct = (ch.startPage / total) * 100;
                if (pct < 0 || pct > 100) return null;
                return (
                  <div 
                    key={ch.id || idx}
                    className="absolute top-0 w-0.5 h-1.5 bg-white border-x border-slate-350/50 cursor-pointer group"
                    style={{ left: `${pct}%` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPage(ch.startPage);
                      updateProgress(ch.startPage);
                    }}
                    onMouseEnter={() => setHoveredChapter(ch)}
                    onMouseLeave={() => setHoveredChapter(null)}
                  />
                );
              })}
            </div>
            
            {hoveredChapter && (
              <div 
                className="absolute z-[9999] bg-slate-900 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg shadow-lg pointer-events-none -translate-x-1/2 whitespace-nowrap"
                style={{ 
                  left: `${(hoveredChapter.startPage / total) * 100}%`,
                  bottom: "100%",
                  marginBottom: "6px"
                }}
              >
                Capítulo {chapters.indexOf(hoveredChapter) + 1}: {hoveredChapter.title}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-t-[4px] border-t-slate-900 border-x-[4px] border-x-transparent" />
              </div>
            )}
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

            <button 
              onClick={() => setShowMobileChapters(true)} 
              className="p-3.5 bg-slate-50 border border-slate-150 text-[var(--text-main)] rounded-xl active:scale-90 transition-all hover:bg-slate-100 cursor-pointer shadow-sm flex items-center justify-center"
              title="Capítulos"
            >
              <List className="w-4.5 h-4.5" />
            </button>

            <button onClick={() => navigate(`/notes?bookId=${id}`)} className="p-3.5 bg-slate-50 border border-slate-150 text-[var(--text-main)] rounded-xl active:scale-90 transition-all hover:bg-slate-100 cursor-pointer shadow-sm flex items-center justify-center">
              <PenLine className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute inset-0 bg-black/30 flex items-end justify-center z-50 backdrop-blur-sm animate-fade-in" onClick={() => setShowSettings(false)}>
          <div className="w-full md:max-w-lg md:mb-6 bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] p-8 space-y-8 shadow-2xl animate-slide-up border border-slate-100" onClick={e => e.stopPropagation()}>
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

      {/* Modal de Criar Capítulo */}
      {isCreateModalOpen && (
        <div className="absolute inset-0 bg-black/35 flex items-center justify-center z-[9999] backdrop-blur-sm animate-fade-in" onClick={() => setIsCreateModalOpen(false)}>
          <div className="w-80 bg-white rounded-3xl p-6 space-y-6 shadow-2xl animate-scale-up border border-slate-100" onClick={e => e.stopPropagation()}>
            <div className="space-y-2 text-center">
              <h3 className="text-[var(--text-main)] font-extrabold text-base uppercase tracking-widest text-slate-800">Marcar Capítulo 📍</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Criando marcação na página {currentPage + 1}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-[9px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest px-1">Nome do Capítulo</label>
              <input 
                type="text" 
                value={chapterTitleInput}
                onChange={e => setChapterTitleInput(e.target.value)}
                placeholder="Ex: Introdução"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-[var(--primary)]/30 focus:ring-4 focus:ring-[var(--primary)]/5 transition-all text-slate-850"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveNewChapter();
                }}
              />
            </div>
            
            <div className="flex gap-2.5">
              <button onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-[10px] uppercase tracking-widest rounded-xl active:scale-95 transition-all cursor-pointer border border-slate-150">
                Cancelar
              </button>
              <button onClick={handleSaveNewChapter} className="flex-1 py-3 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white font-extrabold text-[10px] uppercase tracking-widest rounded-xl active:scale-95 transition-all cursor-pointer shadow-md">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar Capítulo */}
      {isEditModalOpen && (
        <div className="absolute inset-0 bg-black/35 flex items-center justify-center z-[9999] backdrop-blur-sm animate-fade-in" onClick={() => setIsEditModalOpen(false)}>
          <div className="w-80 bg-white rounded-3xl p-6 space-y-6 shadow-2xl animate-scale-up border border-slate-100" onClick={e => e.stopPropagation()}>
            <div className="space-y-2 text-center">
              <h3 className="text-[var(--text-main)] font-extrabold text-base uppercase tracking-widest text-slate-800">Editar Capítulo ✏️</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alterando título na página {currentPage + 1}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-[9px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest px-1">Nome do Capítulo</label>
              <input 
                type="text" 
                value={chapterTitleInput}
                onChange={e => setChapterTitleInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-[var(--primary)]/30 focus:ring-4 focus:ring-[var(--primary)]/5 transition-all text-slate-850"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEditChapter();
                }}
              />
            </div>
            
            <div className="flex gap-2.5">
              <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-655 font-extrabold text-[10px] uppercase tracking-widest rounded-xl active:scale-95 transition-all cursor-pointer border border-slate-150">
                Cancelar
              </button>
              <button onClick={handleSaveEditChapter} className="flex-1 py-3 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white font-extrabold text-[10px] uppercase tracking-widest rounded-xl active:scale-95 transition-all cursor-pointer shadow-md">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer Mobile de Capítulos */}
      {showMobileChapters && (
        <div className="absolute inset-0 bg-black/35 flex items-end justify-center z-[9999] backdrop-blur-sm animate-fade-in" onClick={() => setShowMobileChapters(false)}>
          <div className="w-full md:max-w-lg md:mb-6 bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 space-y-6 shadow-2xl animate-slide-up border border-slate-100 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto" />
            <h3 className="text-[var(--text-main)] font-extrabold text-base text-center uppercase tracking-widest">Capítulos do Livro 📖</h3>
            
            {chapters.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400 font-bold">Nenhum capítulo cadastrado ainda.</p>
            ) : (
              <div className="space-y-2">
                {[...chapters].sort((a, b) => a.startPage - b.startPage).map((ch, idx) => (
                  <button
                    key={ch.id || idx}
                    onClick={() => {
                      setCurrentPage(ch.startPage);
                      updateProgress(ch.startPage);
                      setShowMobileChapters(false);
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left cursor-pointer ${
                      currentPage === ch.startPage
                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] font-extrabold"
                        : "border-slate-100 hover:bg-slate-50 text-slate-700 font-bold"
                    }`}
                  >
                    <span className="text-xs">Capítulo {idx + 1}: {ch.title}</span>
                    <span className="text-[10px] opacity-65 uppercase tracking-wider font-extrabold">Pág. {ch.startPage + 1}</span>
                  </button>
                ))}
              </div>
            )}
            
            <button onClick={() => setShowMobileChapters(false)} className="w-full py-4 bg-[var(--primary)] text-white font-extrabold text-[10px] uppercase tracking-widest rounded-xl shadow-md shadow-[var(--primary)]/15 active:scale-95 transition-all cursor-pointer">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
