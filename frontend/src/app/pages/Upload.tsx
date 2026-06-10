import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Upload as UploadIcon } from "lucide-react";
import { uploadBook, saveProgress } from "../lib/api";
import { randomCoverColor } from "../lib/types";
// @ts-ignore
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

const GENRES = ["Romance", "Suspense", "Ficção", "Distopia", "Autoconhecimento", "Desenvolvimento", "História", "Outros"];

async function extractPdfCover(pdfFile: File): Promise<{ cover: File | null; numPages: number } | null> {
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve({ cover: null, numPages }); return; }
          resolve({ cover: new File([blob], "cover.jpg", { type: "image/jpeg" }), numPages });
        },
        "image/jpeg",
        0.85
      );
    });
  } catch {
    return null;
  }
}

export function Upload() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ title: "", author: "", description: "", genre: "Outros", isPublic: true });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtractingCover, setIsExtractingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFile(file);
    if (!formData.title) {
      const name = file.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
      setFormData((f) => ({ ...f, title: name }));
    }
    setIsExtractingCover(true);
    const result = await extractPdfCover(file);
    if (result) {
      if (result.cover) {
        setCoverFile(result.cover);
        setCoverPreview(URL.createObjectURL(result.cover));
      }
      setTotalPages(result.numPages);
    }
    setIsExtractingCover(false);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile || !formData.title) return;
    setIsUploading(true);
    setError(null);
    try {
      const book = await uploadBook({
        title: formData.title,
        author: formData.author,
        description: formData.description,
        genre: formData.genre,
        isPublic: formData.isPublic,
        coverColor: randomCoverColor(),
        pdfFile,
        coverFile: coverFile ?? undefined,
      });
      await saveProgress({
        bookId: book.id,
        currentPage: 0,
        totalPages: totalPages,
        progress: 0,
        status: "lendo",
        startedAt: Date.now(),
        lastReadAt: Date.now()
      });
      navigate("/my-books");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer upload. Verifique sua conexão.");
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent pb-12">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="mb-6 p-2.5 bg-white rounded-full shadow-sm hover:bg-slate-50 border border-slate-100 active:scale-95 transition-all cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-[var(--text-main)]" />
        </button>

        <h1 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight mb-8 animate-fade-in">Adicionar Livro 📚</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-semibold">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* PDF + Cover Upload */}
          <div className="flex gap-4 items-start">
            {/* PDF Upload */}
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest pl-1">Arquivo PDF *</label>
              <div className="border border-slate-200 border-dashed rounded-2xl p-5 text-center bg-white hover:bg-slate-50 transition-colors shadow-sm relative">
                <input type="file" accept=".pdf" onChange={handlePdfChange} className="hidden" id="pdf-upload" />
                <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-2xl flex items-center justify-center">
                    <UploadIcon className="w-5 h-5 text-[var(--primary)]" />
                  </div>
                  {pdfFile ? (
                    <p className="text-xs text-[var(--text-main)] font-semibold truncate max-w-[180px]">{pdfFile.name}</p>
                  ) : (
                    <p className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest">Selecionar PDF</p>
                  )}
                </label>
              </div>
            </div>

            {/* Cover Preview */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest pl-1">Capa</label>
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="relative w-24 h-36 rounded-2xl overflow-hidden shadow-sm border border-slate-200 hover:border-slate-300 transition-all group cursor-pointer bg-white"
              >
                {isExtractingCover ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : coverPreview ? (
                  <img src={coverPreview} className="w-full h-full object-cover" alt="capa" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[var(--lavender)]/20 to-[var(--mint)]/20 flex flex-col items-center justify-center gap-1">
                    <span className="text-xl select-none">🖼️</span>
                    <span className="text-[9px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest text-center px-1">Trocar</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-[10px] font-extrabold uppercase tracking-widest">Alterar</span>
                </div>
              </button>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
            </div>
          </div>

          {/* Título */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest pl-1">Título *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Título do livro *"
              className="w-full px-4.5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-[var(--primary)]/30 focus:ring-4 focus:ring-[var(--primary)]/5 transition-all text-xs font-semibold placeholder:text-[var(--text-muted)]"
              required
            />
          </div>

          {/* Autor */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest pl-1">Autor</label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              placeholder="Autor"
              className="w-full px-4.5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-[var(--primary)]/30 focus:ring-4 focus:ring-[var(--primary)]/5 transition-all text-xs font-semibold placeholder:text-[var(--text-muted)]"
            />
          </div>

          {/* Gênero */}
          <div className="space-y-2">
            <label className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest pl-1">Gênero</label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setFormData({ ...formData, genre: g })}
                  className={`px-4 py-2 rounded-full text-[10px] font-extrabold transition-all active:scale-95 border cursor-pointer uppercase tracking-widest ${
                    formData.genre === g 
                      ? "bg-gradient-to-r from-[var(--lavender)] to-[var(--primary)] text-white border-transparent shadow-sm" 
                      : "bg-white text-[var(--text-muted)] border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest pl-1">Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição (opcional)"
              className="w-full px-4.5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-[var(--primary)]/30 focus:ring-4 focus:ring-[var(--primary)]/5 transition-all resize-none text-xs font-semibold placeholder:text-[var(--text-muted)]"
              rows={3}
            />
          </div>

          {/* Público */}
          <div className="flex items-center justify-between bg-white border border-slate-100 rounded-[2rem] p-4.5 shadow-[0_8px_30px_rgba(0,0,0,0.01)]">
            <div>
              <h4 className="text-[var(--text-main)] text-sm font-extrabold">Tornar público</h4>
              <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-0.5">Visível para todos os usuários</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isPublic: !formData.isPublic })}
              className={`relative w-12 h-7 rounded-full transition-all duration-300 shadow-inner flex-shrink-0 cursor-pointer ${formData.isPublic ? "bg-gradient-to-r from-[var(--primary)] to-[var(--mint)]" : "bg-slate-200"}`}
            >
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-md transform ${formData.isPublic ? "left-5" : "left-0.5"}`} />
            </button>
          </div>

          <button
            type="submit"
            disabled={!pdfFile || !formData.title || isUploading}
            className={`w-full py-4 font-bold rounded-2xl transition-all shadow-md cursor-pointer ${
              !pdfFile || !formData.title || isUploading
                ? "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                : "bg-gradient-to-r from-[var(--primary)] to-[var(--mint)] text-white hover:shadow-lg hover:shadow-[var(--primary)]/15 active:scale-[0.98]"
            }`}
          >
            {isUploading ? (
              <div className="flex items-center justify-center gap-2.5">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Enviando...</span>
              </div>
            ) : (
              "✨ Publicar Livro 📚"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
