import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Upload as UploadIcon } from "lucide-react";
import { uploadBook, saveProgress } from "../lib/api";
import { randomCoverColor } from "../lib/types";

const GENRES = ["Romance", "Suspense", "Ficção", "Distopia", "Autoconhecimento", "Desenvolvimento", "História", "Outros"];

async function extractPdfCover(pdfFile: File): Promise<{ cover: File | null; numPages: number } | null> {
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.mjs",
      import.meta.url
    ).toString();

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
    // Auto-preencher título pelo nome do arquivo
    if (!formData.title) {
      const name = file.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
      setFormData((f) => ({ ...f, title: name }));
    }
    // Extrai capa automaticamente
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
    <div className="min-h-screen bg-gradient-to-b from-background via-[var(--peach)]/10 to-[var(--lavender)]/10 pb-6">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="mb-6 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md active:scale-95 transition-all">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>

        <h1 className="text-foreground mb-6 animate-fade-in">Adicionar Livro</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-[16px] text-red-600 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* PDF + Cover side by side */}
          <div className="flex gap-4">
            {/* PDF Upload */}
            <div className="flex-1 space-y-2">
              <label className="text-sm text-muted-foreground">PDF *</label>
              <div className="border-2 border-dashed border-primary/30 rounded-[18px] p-5 text-center bg-gradient-to-br from-[var(--mint)]/20 to-[var(--sky)]/20 hover:border-primary/50 transition-all">
                <input type="file" accept=".pdf" onChange={handlePdfChange} className="hidden" id="pdf-upload" />
                <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-[var(--mint)]/20 rounded-full flex items-center justify-center">
                    <UploadIcon className="w-6 h-6 text-primary" />
                  </div>
                  {pdfFile ? (
                    <p className="text-xs text-foreground">{pdfFile.name}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Selecionar PDF</p>
                  )}
                </label>
              </div>
            </div>

            {/* Cover Preview */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Capa</label>
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="relative w-24 h-36 rounded-[14px] overflow-hidden shadow-md border-2 border-dashed border-primary/20 hover:border-primary/50 transition-all group"
              >
                {isExtractingCover ? (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : coverPreview ? (
                  <img src={coverPreview} className="w-full h-full object-cover" alt="capa" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[var(--lavender)]/40 to-[var(--mint)]/40 flex flex-col items-center justify-center gap-1">
                    <span className="text-2xl">🖼️</span>
                    <span className="text-[10px] text-muted-foreground">Trocar capa</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs">Trocar</span>
                </div>
              </button>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
              {isExtractingCover && <p className="text-xs text-muted-foreground text-center">Extraindo...</p>}
            </div>
          </div>

          {/* Título */}
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Título do livro *"
            className="w-full px-4 py-3 bg-white/80 rounded-[14px] outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            required
          />

          {/* Autor */}
          <input
            type="text"
            value={formData.author}
            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
            placeholder="Autor"
            className="w-full px-4 py-3 bg-white/80 rounded-[14px] outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />

          {/* Gênero */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Gênero</label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setFormData({ ...formData, genre: g })}
                  className={`px-3 py-1.5 rounded-[10px] text-sm transition-all active:scale-95 ${formData.genre === g ? "bg-gradient-to-r from-primary to-[var(--mint)] text-white shadow-md" : "bg-white/80 text-secondary-foreground"}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Descrição */}
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descrição (opcional)"
            className="w-full px-4 py-3 bg-white/80 rounded-[14px] outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
            rows={3}
          />

          {/* Público */}
          <div className="flex items-center justify-between bg-card rounded-[16px] p-4 shadow-sm">
            <div>
              <h4 className="text-foreground text-sm">Tornar público</h4>
              <p className="text-xs text-muted-foreground">Visível para todos os usuários</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isPublic: !formData.isPublic })}
              className={`relative w-12 h-7 rounded-full transition-all shadow-md ${formData.isPublic ? "bg-gradient-to-r from-primary to-[var(--mint)]" : "bg-muted"}`}
            >
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${formData.isPublic ? "left-5" : "left-0.5"}`} />
            </button>
          </div>

          <button
            type="submit"
            disabled={!pdfFile || !formData.title || isUploading}
            className={`w-full py-4 font-bold rounded-[16px] transition-all shadow-lg hover:shadow-xl ${
              !pdfFile || !formData.title || isUploading
                ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                : "bg-gradient-to-r from-primary to-[var(--mint)] text-white active:scale-[0.98]"
            }`}
          >
            {isUploading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enviando...
              </div>
            ) : (
              "✨ Publicar livro 📚"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
