import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft, BookOpen, Play, Share2, CheckCircle, Users, FileText, Bookmark, ChevronDown,
} from "lucide-react";
import {
  fetchAllUsers, fetchBook, fetchProgress, fetchSavedIds, saveProgress, sendMessage, toggleSaved,
} from "../lib/api";
import { getCoverGradient, getFullUrl } from "../lib/types";
import type { Book, ReadingProgress, Review, UserProfile } from "../lib/types";
import { getUsername } from "../lib/session";
import { useOpenBook } from "../lib/readerChoice";
import { ReviewSection } from "../components/ReviewSection";
import { useSpineColor } from "../components/Book3D";
import { Avatar, Modal, Skeleton, Stars, toast } from "../components/Ui";

export function BookDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const openBook = useOpenBook();
  const myUsername = getUsername();

  const [book, setBook] = useState<Book | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [tab, setTab] = useState<"sobre" | "avaliacoes">("sobre");
  const [expanded, setExpanded] = useState(false);

  // A página inteira se tinge com a cor dominante da capa: sobrescrevemos os
  // tokens da marca aqui, e cabeçalho, botões, abas e barras seguem juntos.
  const coverColor = useSpineColor(book);
  const bookTheme = useMemo(() => {
    // A cor da lombada pode ser clara demais; o texto por cima é branco, então
    // prendemos a luminosidade num teto que garante contraste legível.
    const darken = (hsl: string, maxLightness: number) => {
      const parts = hsl.match(/hsl\((\d+(?:\.\d+)?) (\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%\)/);
      if (!parts) return hsl;
      const [h, sat, light] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];
      return `hsl(${h} ${Math.min(sat, 72)}% ${Math.min(light, maxLightness)}%)`;
    };

    const base = darken(coverColor.base, 38);
    return {
      "--primary": base,
      "--primary-hover": darken(coverColor.shade, 28),
      "--primary-deep": darken(coverColor.shade, 22),
      "--primary-foreground": "#ffffff",
      "--primary-soft": `color-mix(in srgb, ${base} 14%, transparent)`,
      "--ring": `color-mix(in srgb, ${base} 26%, transparent)`,
    } as React.CSSProperties;
  }, [coverColor]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setIsLoading(true);

    Promise.all([
      fetchBook(id).catch(() => null),
      fetchSavedIds().catch(() => [] as string[]),
      fetchProgress(id).catch(() => null),
      fetchAllUsers().catch(() => [] as UserProfile[]),
    ]).then(([b, savedIds, p, allUsers]) => {
      if (cancelled) return;
      setBook(b);
      setIsSaved((savedIds || []).includes(id));
      setProgress(p);
      setUsers((allUsers || []).filter((u) => u.username.toLowerCase() !== myUsername?.toLowerCase()));
      setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, [id, myUsername]);

  // Quem chega pelo link "#avaliar" cai direto na aba de avaliações.
  useEffect(() => {
    if (isLoading || window.location.hash !== "#avaliar") return;
    setTab("avaliacoes");
    document.getElementById("avaliar")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [isLoading]);

  const handleToggleSave = async () => {
    if (!id) return;
    setIsSaved((v) => !v);
    try {
      const res = await toggleSaved(id, isSaved);
      setIsSaved(res.saved);
    } catch {
      setIsSaved(isSaved);
      toast("Não foi possível atualizar os favoritos.", "error");
    }
  };

  const handleToggleRead = async () => {
    if (!id || !book) return;
    const isCurrentlyFinished = progress?.status === "finalizado";
    const total = book.pages?.length || progress?.totalPages || 1;

    const newProgress: ReadingProgress = {
      bookId: id,
      currentPage: isCurrentlyFinished ? 0 : Math.max(0, total - 1),
      totalPages: total,
      progress: isCurrentlyFinished ? 0 : 100,
      status: isCurrentlyFinished ? "pausado" : "finalizado",
      startedAt: progress?.startedAt || Date.now(),
      lastReadAt: Date.now(),
    };

    setProgress(newProgress);
    await saveProgress(newProgress);
    toast(isCurrentlyFinished ? "Marcado como não lido." : "Livro concluído! 🎉");
  };

  const handleShare = async (targetUsername: string) => {
    if (!book) return;
    try {
      await sendMessage(targetUsername, `Recomendei "${book.title}" para você! 📖✨`, book.id);
      setShowShare(false);
      toast(`Recomendação enviada para ${targetUsername}.`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao compartilhar.", "error");
    }
  };

  const handleReviewsChange = useCallback((reviews: Review[]) => {
    setBook((prev) => {
      if (!prev) return prev;
      const rating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
      return { ...prev, reviews, rating: Math.round(rating * 10) / 10, reviewCount: reviews.length };
    });
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Skeleton className="h-9 w-24 rounded-xl" />
        <div className="flex gap-5">
          <Skeleton className="w-32 aspect-[2/3] rounded-xl" />
          <div className="flex-1 space-y-3 pt-2">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <div className="text-4xl">📚</div>
          <h2 className="text-lg font-bold text-foreground">Livro não encontrado</h2>
          <button onClick={() => navigate(-1)} className="mb-btn mb-btn-primary">Voltar</button>
        </div>
      </div>
    );
  }

  const isFinished = progress?.status === "finalizado";
  const hasContent = (book.pages && book.pages.length > 0) || !!book.pdfPath;
  const cover = getFullUrl(book.coverImagePath);

  return (
    <div className="pb-12" style={bookTheme}>
      {/* ── Cabeçalho na cor do livro ─────────────────────────────────────────────── */}
      <div className="mb-hero-green relative overflow-hidden rounded-b-[28px]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 pb-8">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button onClick={() => setShowShare(true)} className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white/15 hover:bg-white/25 text-[13px] font-semibold transition-colors cursor-pointer">
              <Share2 className="w-4 h-4" /> Indicar
            </button>
          </div>

          <div className="flex gap-5">
            <div className="flex-shrink-0 w-28 sm:w-36 aspect-[2/3] rounded-lg overflow-hidden shadow-[0_16px_36px_-12px_rgba(0,0,0,.6)] bg-black/20">
              {cover ? (
                <img src={cover} alt={`Capa de ${book.title}`} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(book)} flex items-center justify-center`}>
                  <BookOpen className="w-10 h-10 text-white/60" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-[24px] sm:text-[30px] font-bold leading-tight">{book.title}</h1>
              <p className="text-[14px] text-white/75 mt-1">{book.author || "Autor desconhecido"}</p>

              <div className="flex items-center gap-2 mt-3">
                <Stars value={book.rating} size="sm" onDark />
                <span className="text-[13px] font-semibold">
                  {book.rating > 0 ? book.rating.toFixed(1) : "—"}
                  <span className="text-white/60 font-normal"> ({book.reviewCount})</span>
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="h-7 px-3 rounded-full bg-white/18 text-[11.5px] font-semibold flex items-center">{book.genre}</span>
                {!!book.readers && (
                  <span className="h-7 px-3 rounded-full bg-white/18 text-[11.5px] font-semibold flex items-center gap-1">
                    <Users className="w-3 h-3" /> {book.readers}
                  </span>
                )}
                {!!book.pageCount && (
                  <span className="h-7 px-3 rounded-full bg-white/18 text-[11.5px] font-semibold flex items-center gap-1">
                    <FileText className="w-3 h-3" /> {book.pageCount} págs.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-5">
        {/* ── Ações ─────────────────────────────────────────────────────────── */}
        <div className="flex gap-2">
          {hasContent ? (
            <button onClick={() => openBook(book)} className="mb-btn mb-btn-primary mb-btn-lg flex-1 rounded-[14px]">
              <Play className="w-4 h-4 fill-current" />
              {progress && progress.progress > 0 ? "Continuar leitura" : "Quero ler"}
            </button>
          ) : (
            <button disabled className="mb-btn mb-btn-outline mb-btn-lg flex-1 rounded-[14px]">
              <BookOpen className="w-4 h-4" /> Sem conteúdo para leitura
            </button>
          )}

          <button
            onClick={handleToggleRead}
            aria-label={isFinished ? "Desmarcar como lido" : "Marcar como lido"}
            className={`mb-btn mb-btn-lg mb-btn-icon rounded-[14px] ${isFinished ? "mb-btn-soft" : "mb-btn-outline"}`}
          >
            <CheckCircle className={`w-5 h-5 ${isFinished ? "fill-current" : ""}`} />
          </button>

          <button
            onClick={handleToggleSave}
            aria-label={isSaved ? "Remover dos favoritos" : "Salvar nos favoritos"}
            aria-pressed={isSaved}
            className={`mb-btn mb-btn-lg mb-btn-icon rounded-[14px] ${isSaved ? "mb-btn-primary" : "mb-btn-outline"}`}
          >
            <Bookmark className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
          </button>
        </div>

        {progress && progress.progress > 0 && progress.status !== "finalizado" && (
          <div className="mb-card p-4 mt-4">
            <div className="flex justify-between items-center text-[12.5px] font-semibold">
              <span className="text-[var(--text-2)]">Seu progresso</span>
              <span className="text-[var(--primary)]">{Math.round(progress.progress)}%</span>
            </div>
            <div className="w-full bg-[var(--surface-2)] rounded-full h-1.5 overflow-hidden mt-2">
              <div className="bg-[var(--primary)] h-full rounded-full transition-all" style={{ width: `${progress.progress}%` }} />
            </div>
          </div>
        )}

        {isFinished && (
          <div className="mb-card p-4 mt-4 flex items-center gap-3 border-[var(--primary)]/25">
            <CheckCircle className="w-5 h-5 text-[var(--primary)]" />
            <span className="text-[13.5px] font-semibold text-foreground">Você concluiu este livro 🎉</span>
          </div>
        )}

        {/* ── Abas ──────────────────────────────────────────────────────────── */}
        <div className="flex gap-6 border-b border-[var(--line)] mt-6">
          {([
            { key: "sobre", label: "Sobre" },
            { key: "avaliacoes", label: "Avaliações" },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative pb-3 text-[14px] transition-colors cursor-pointer ${
                tab === t.key ? "text-[var(--primary)] font-semibold" : "text-[var(--text-3)] font-medium hover:text-foreground"
              }`}
            >
              {t.label}
              {tab === t.key && <span className="absolute inset-x-0 -bottom-px h-[2.5px] rounded-full bg-[var(--primary)]" />}
            </button>
          ))}
        </div>

        {tab === "sobre" ? (
          <section className="pt-5">
            <p className={`text-[14px] text-[var(--text-2)] leading-[1.75] whitespace-pre-wrap ${expanded ? "" : "line-clamp-6"}`}>
              {book.description || "Nenhuma sinopse cadastrada para este livro."}
            </p>
            {(book.description || "").length > 260 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex items-center gap-1 mt-2 text-[13px] font-semibold text-[var(--primary)] cursor-pointer hover:underline"
              >
                {expanded ? "Ver menos" : "Ver mais"}
                <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>
            )}

            <div className="grid grid-cols-3 gap-3 mt-6">
              {[
                { label: "Nota média", value: book.rating > 0 ? book.rating.toFixed(1) : "—" },
                { label: "Avaliações", value: String(book.reviewCount) },
                { label: "Leitores", value: String(book.readers ?? 0) },
              ].map((stat) => (
                <div key={stat.label} className="mb-card p-3.5 text-center">
                  <div className="text-[20px] font-bold text-foreground leading-none">{stat.value}</div>
                  <div className="text-[11.5px] text-[var(--text-3)] mt-1.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="pt-5">
            <ReviewSection bookId={book.id} reviews={book.reviews || []} onChange={handleReviewsChange} />
          </div>
        )}
      </div>

      {/* ── Compartilhar ───────────────────────────────────────────────────── */}
      <Modal
        open={showShare}
        onClose={() => setShowShare(false)}
        title="Indicar para alguém"
        description="A pessoa recebe o livro no chat. Se ela terminar a leitura, vocês dois ganham um Pandinha."
      >
        {users.length === 0 ? (
          <p className="text-[13px] text-[var(--text-3)] text-center py-6">Nenhum outro leitor na rede ainda.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {users.map((u) => (
              <button
                key={u.username}
                onClick={() => handleShare(u.username)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--surface-2)] transition-colors text-left cursor-pointer"
              >
                <Avatar emoji={u.avatar} size="sm" />
                <span className="flex-1 min-w-0">
                  <span className="block text-[13.5px] font-semibold text-foreground truncate">{u.username}</span>
                  <span className="block text-[12px] text-[var(--text-3)] truncate">{u.bio || "Leitor do myBooks"}</span>
                </span>
                <Share2 className="w-4 h-4 text-[var(--text-3)]" />
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
