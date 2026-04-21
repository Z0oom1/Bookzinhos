import { useState, useRef } from "react";
import { X, Image } from "lucide-react";
import { editBook } from "../lib/api";
import { getFullUrl, getCoverGradient } from "../lib/types";
import type { Book } from "../lib/types";

const GENRES = ["Romance", "Suspense", "Ficção", "Distopia", "Autoconhecimento", "Desenvolvimento", "História", "Outros"];
const COLORS = ["lavender-mint", "peach-lavender", "mint-sky", "blush-lavender", "peach-mint", "lemon-peach", "sky-mint", "lavender-peach"];

interface Props {
  book: Book;
  onClose: () => void;
  onSaved: (updated: Book) => void;
}

export function EditBookModal({ book, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    title: book.title,
    author: book.author,
    description: book.description,
    genre: book.genre,
    coverColor: book.coverColor,
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(getFullUrl(book.coverImagePath));
  const [isSaving, setIsSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    const url = URL.createObjectURL(file);
    setCoverPreview(url);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setIsSaving(true);
    try {
      const updated = await editBook(book.id, { ...form, coverFile: coverFile ?? undefined });
      onSaved(updated);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-gradient-to-b from-card to-[var(--peach)]/10 rounded-t-[28px] p-6 space-y-5 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-foreground">Editar Livro</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Cover picker */}
        <div className="flex gap-4 items-start">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-shrink-0 w-24 h-32 rounded-[14px] overflow-hidden shadow-md relative group"
          >
            {coverPreview ? (
              <img src={coverPreview} className="w-full h-full object-cover" alt="capa" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(book)} flex items-center justify-center`}>
                <Image className="w-8 h-8 text-white" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Image className="w-6 h-6 text-white" />
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />

          <div className="flex-1 space-y-3">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Título"
              className="w-full px-4 py-2.5 bg-white/80 rounded-[12px] outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
            />
            <input
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
              placeholder="Autor"
              className="w-full px-4 py-2.5 bg-white/80 rounded-[12px] outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
            />
          </div>
        </div>

        {/* Genre */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Gênero</label>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => setForm({ ...form, genre: g })}
                className={`px-3 py-1.5 rounded-[10px] text-xs transition-all active:scale-95 ${
                  form.genre === g
                    ? "bg-gradient-to-r from-primary to-[var(--mint)] text-white shadow-md"
                    : "bg-white/80 text-secondary-foreground"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Cover color (when no image) */}
        {!coverPreview && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Cor da capa (sem imagem)</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, coverColor: c })}
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${getCoverGradient({ id: c, coverColor: c })} border-2 transition-all ${
                    form.coverColor === c ? "border-primary scale-110" : "border-transparent"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Descrição"
          className="w-full px-4 py-3 bg-white/80 rounded-[12px] outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none text-sm"
          rows={3}
        />

        <button
          onClick={handleSave}
          disabled={!form.title.trim() || isSaving}
          className="w-full py-3 bg-gradient-to-r from-primary to-[var(--mint)] text-white rounded-[16px] disabled:opacity-50 transition-all active:scale-[0.98] shadow-lg"
        >
          {isSaving ? "Salvando..." : "Salvar alterações ✨"}
        </button>
      </div>
    </div>
  );
}
