import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Settings, ChevronLeft, ChevronRight, PenLine, PauseCircle, PlayCircle, CheckCircle } from "lucide-react";
import { fetchBook, fetchProgress, saveProgress } from "../lib/api";
import { getCoverGradient, getFullUrl } from "../lib/types";
import type { Book, ReadingProgress } from "../lib/types";

type Theme = "light" | "cream" | "sepia";

export function BookReader() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [theme, setTheme] = useState<Theme>("cream");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [jumpPageInput, setJumpPageInput] = useState("");

  // PDF State
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
        const doc = await pdfjs.getDocument(pdfUrl).promise;
        setPdfDoc(doc);
        setPdfTotalPages(doc.numPages);
      } catch (err) {
        console.error("Failed to load PDF", err);
      }
    };
    loadPdf();
  }, [pdfUrl]);

  // Render PDF Page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let renderTask: any = null;
    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage + 1);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        
        const viewport = page.getViewport({ scale: 1 });
        const screenWidth = window.innerWidth;
        const scale = (screenWidth - 32) / viewport.width;
        const scaledViewport = page.getViewport({ scale: Math.max(scale, 1) });
        
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        
        renderTask = page.render({ canvasContext: ctx, viewport: scaledViewport });
        await renderTask.promise;
      } catch (err) {
        if ((err as Error).name !== 'RenderingCancelledException') {
          console.error("Failed to render page", err);
        }
      }
    };
    renderPage();
    return () => {
      if (renderTask) renderTask.cancel();
    };
  }, [pdfDoc, currentPage]);

  useEffect(() => {
    if (!showMenu) return;
    const t = setTimeout(() => setShowMenu(false), 5000); // Increased timeout
    return () => clearTimeout(t);
  }, [showMenu]);

  const themeStyles: Record<Theme, string> = {
    light: "bg-white text-slate-900",
    cream: "bg-[#FFF9F0] text-[#433422]",
    sepia: "bg-[#704214] text-[#F5E6D3]",
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
      status
    });
    
    if (status === "finalizado") setIsFinished(true);
    else setIsFinished(false);
  };

  const goNext = () => {
    if (currentPage < total - 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        const next = currentPage + 1;
        setCurrentPage(next);
        setIsTransitioning(false);
        updateProgress(next);
      }, 150);
    }
  };

  const goPrev = () => {
    if (currentPage > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        const prev = currentPage - 1;
        setCurrentPage(prev);
        setIsTransitioning(false);
        updateProgress(prev);
      }, 150);
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
      // If marking as finished, go to last page
      setCurrentPage(total - 1);
    }
  };

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
          <button onClick={() => navigate(-1)} className="px-6 py-3 bg-primary text-white rounded-[16px] active:scale-95 transition-all">Voltar</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeStyles[theme]} transition-colors relative select-none`}>
      <div onClick={() => setShowMenu(!showMenu)} className="min-h-screen flex flex-col items-center justify-start px-4 py-20 cursor-pointer overflow-x-hidden">
        <div
          className={`w-full max-w-2xl leading-relaxed transition-all ${isTransitioning ? "opacity-0 scale-95" : "opacity-100 scale-100 animate-fade-in"}`}
          style={{ fontSize: `${fontSize}px` }}
        >
          {pdfUrl ? (
            <div className="flex justify-center w-full">
              {!pdfDoc ? (
                 <div className="text-center mt-20 animate-pulse-soft text-[var(--text-muted)]">Carregando PDF... 🐾</div>
              ) : (
                 <canvas ref={canvasRef} className="max-w-full shadow-lg rounded-[12px]" />
              )}
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{pages[currentPage]}</div>
          )}
        </div>
      </div>

      {/* Top Menu */}
      <div className={`fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-border/50 transition-all shadow-lg z-40 ${showMenu ? "translate-y-0" : "-translate-y-full"}`}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-[var(--peach)]/20 rounded-full transition-all active:scale-95">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h3 className="text-foreground truncate px-2 font-black text-sm">{book.title}</h3>
          <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-[var(--lavender)]/20 rounded-full transition-all active:scale-95">
            <Settings className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Bottom Menu */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-border/50 transition-all shadow-2xl z-40 px-4 pb-8 pt-4 ${showMenu ? "translate-y-0" : "translate-y-full"}`}>
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between gap-4">
            <button onClick={goPrev} disabled={currentPage === 0} className="p-2 hover:bg-muted rounded-full transition-all active:scale-95 disabled:opacity-30">
              <ChevronLeft className="w-6 h-6 text-foreground" />
            </button>
            
            <form onSubmit={handleJumpPage} className="flex-1 flex items-center justify-center gap-2">
               <span className="text-xs font-bold text-muted-foreground">Pg.</span>
               <input 
                 type="number" 
                 value={jumpPageInput}
                 onChange={e => setJumpPageInput(e.target.value)}
                 placeholder={`${currentPage + 1}`}
                 className="w-12 bg-gray-100 rounded-lg py-1 px-2 text-center text-sm font-black outline-none focus:ring-2 focus:ring-[var(--lavender)]/50"
               />
               <span className="text-xs font-bold text-muted-foreground">de {total}</span>
            </form>

            <button onClick={goNext} disabled={currentPage >= total - 1} className="p-2 hover:bg-muted rounded-full transition-all active:scale-95 disabled:opacity-30">
              <ChevronRight className="w-6 h-6 text-foreground" />
            </button>
          </div>

          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-[var(--peach)] via-[var(--primary)] to-[var(--blush)] h-1.5 rounded-full transition-all" style={{ width: `${((currentPage + 1) / total) * 100}%` }} />
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => {
                const next = !isPaused;
                setIsPaused(next);
                updateProgress(currentPage, next ? "pausado" : "lendo");
              }} 
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.2rem] transition-all active:scale-95 font-bold text-xs ${isPaused ? "bg-[var(--lavender)] text-white shadow-lg shadow-[var(--lavender)]/20" : "bg-white border-2 border-gray-100 text-[var(--text-main)]"}`}
            >
              {isPaused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
              {isPaused ? "Retomar" : "Pausar"}
            </button>
            
            <button 
              onClick={toggleFinished}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.2rem] transition-all active:scale-95 font-bold text-xs ${isFinished ? "bg-[var(--mint)] text-white shadow-lg shadow-[var(--mint)]/20" : "bg-white border-2 border-gray-100 text-[var(--text-main)]"}`}
            >
              <CheckCircle className={`w-4 h-4 ${isFinished ? "animate-bounce" : ""}`} />
              {isFinished ? "Lido! 🐼" : "Marcar Lido"}
            </button>

            <button onClick={() => navigate("/notes")} className="p-3 bg-[var(--peach)]/20 text-[var(--text-main)] rounded-[1.2rem] active:scale-95 transition-all">
              <PenLine className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowSettings(false)}>
          <div className="w-full bg-white rounded-t-[3rem] p-8 space-y-8 shadow-2xl animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto" />
            <h3 className="text-[var(--text-main)] font-black text-xl text-center">Ajustes de Leitura 🐾</h3>
            
            {!pdfUrl && (
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <label className="text-sm font-bold text-[var(--text-muted)]">Tamanho da Letra</label>
                  <span className="text-xs font-black bg-[var(--lavender)]/10 text-[var(--lavender)] px-2 py-1 rounded-lg">{fontSize}px</span>
                </div>
                <div className="flex items-center gap-4 bg-[var(--bg-pastel)] p-4 rounded-3xl">
                  <span className="text-sm font-bold opacity-50">A</span>
                  <input type="range" min="14" max="32" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="flex-1 accent-[var(--lavender)]" />
                  <span className="text-2xl font-bold">A</span>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <label className="text-sm font-bold text-[var(--text-muted)] px-1">Tema Visual</label>
              <div className="grid grid-cols-3 gap-3">
                {(["light", "cream", "sepia"] as Theme[]).map((t) => (
                  <button 
                    key={t} 
                    onClick={() => setTheme(t)} 
                    className={`py-4 rounded-[1.5rem] capitalize transition-all active:scale-95 font-bold text-xs border-2 ${theme === t ? "border-[var(--lavender)] bg-[var(--lavender)]/10 text-[var(--lavender)]" : "border-gray-50 bg-gray-50 text-gray-400"}`}
                  >
                    {t === "light" ? "Claro" : t === "cream" ? "Creme" : "Sépia"}
                  </button>
                ))}
              </div>
            </div>
            
            <button onClick={() => setShowSettings(false)} className="w-full py-4 bg-[var(--lavender)] text-white font-bold rounded-[1.5rem] shadow-lg shadow-[var(--lavender)]/20 active:scale-95 transition-all">
              Pronto ✨
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
