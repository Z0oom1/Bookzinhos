import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Search, ArrowRight, Star, Megaphone, Heart, MessageCircle, Edit3, Send, Pin,
  Plus, BookOpen, Sparkles, TrendingUp, PenSquare, Bookmark,
} from "lucide-react";
import { fetchFeed, fetchHome, fetchSavedIds, togglePostLike, toggleSaved, updateGlobalStatus } from "../lib/api";
import { useLiveData } from "../lib/useLiveData";
import { getCoverGradient, getFullUrl, timeAgo } from "../lib/types";
import type { Book, FeedItem, HomeData, HomePost, ReadingProgress } from "../lib/types";
import { getUsername, isAdmin as isAdminUser } from "../lib/session";
import { requireAuth } from "../lib/authGate";
import { Book3D } from "../components/Book3D";
import { BookCard } from "../components/BookCard";
import { BookGrid } from "../components/BookGrid";
import { BannerCarousel } from "../components/BannerCarousel";
import { Avatar, EmptyState, Modal, SectionHeader, Skeleton, toast } from "../components/Ui";
import { useOpenBook } from "../lib/readerChoice";

/** Tempo entre um destaque e o próximo. */
const HERO_INTERVAL_MS = 7000;

/**
 * Cada destaque monta o livro de um jeito: lado da vitrine, ângulo em três
 * dimensões, tamanho e altura mudam de slide para slide — ora se vê a lombada,
 * ora o corte das páginas — para a vitrine não repetir a mesma foto com o
 * título trocado.
 */
const HERO_LAYOUTS = [
  { reverse: false, pose: { ry: 26, rx: 5, rz: -3 }, width: 178, offsetY: 0 },
  { reverse: true, pose: { ry: -22, rx: 8, rz: 4 }, width: 162, offsetY: 14 },
  { reverse: false, pose: { ry: 34, rx: 2, rz: 6 }, width: 192, offsetY: -10 },
];

const EMOTES = ["📚", "☕", "✨", "📖", "🌿", "🤍", "🌸", "🔖", "🎧", "🐶"];

export function Home() {
  const navigate = useNavigate();
  const openBook = useOpenBook();
  const userName = getUsername() || "Leitora";
  const admin = isAdminUser();

  const { data, isLoading, setData, reload } = useLiveData<HomeData>((force) => fetchHome(force), [], {
    intervalMs: 45000,
  });
  const { data: feed } = useLiveData<FeedItem[]>((force) => fetchFeed("all", force), [], { intervalMs: 60000 });

  const [search, setSearch] = useState("");
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [chip, setChip] = useState("para-voce");
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [statusInput, setStatusInput] = useState("");
  const [statusEmote, setStatusEmote] = useState("📚");

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const books = data?.books ?? [];
  const progress = data?.progress ?? [];
  const progressOf = useMemo(() => new Map(progress.map((p) => [p.bookId, p])), [progress]);

  const searchResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return null;
    return books.filter(
      (b) => b.title.toLowerCase().includes(term) || (b.author || "").toLowerCase().includes(term)
    );
  }, [search, books]);

  /** Até três livros de destaque: os mais bem avaliados, senão os mais lidos. */
  const featured = useMemo(() => {
    const pool = [...(data?.topRated ?? []), ...(data?.mostRead ?? []), ...books];
    const seen = new Set<string>();
    return pool.filter((b) => (seen.has(b.id) ? false : seen.add(b.id))).slice(0, 3);
  }, [data, books]);

  const hero = featured.length > 0 ? featured[heroIndex % featured.length] : null;

  // O destaque passa sozinho. Para enquanto o ponteiro está em cima e quando a
  // aba não está visível — girar em segundo plano só gastaria bateria.
  useEffect(() => {
    if (featured.length <= 1 || heroPaused) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") setHeroIndex((i) => i + 1);
    }, HERO_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [featured.length, heroPaused]);

  /** Leitores reais do livro em destaque — a prova social do cartão. */
  const heroReaders = useMemo(() => {
    if (!hero || !feed) return [];
    const seen = new Map<string, string>();
    for (const item of feed) {
      if (item.book?.id !== hero.id || !item.username) continue;
      if (!seen.has(item.username)) seen.set(item.username, item.avatar || "🐼");
      if (seen.size >= 3) break;
    }
    return [...seen].map(([username, avatar]) => ({ username, avatar }));
  }, [hero, feed]);

  const reading = useMemo(
    () =>
      progress
        .filter((p) => p.status === "lendo")
        .sort((a, b) => b.lastReadAt - a.lastReadAt)
        .map((p) => ({ progress: p, book: books.find((b) => b.id === p.bookId) }))
        .filter((x): x is { progress: ReadingProgress; book: Book } => !!x.book)
        .slice(0, 3),
    [progress, books]
  );

  const genres = useMemo(
    () => Array.from(new Set(books.map((b) => b.genre).filter(Boolean))).slice(0, 5),
    [books]
  );

  const recommended = useMemo(() => {
    if (chip === "tendencias") return data?.mostRead ?? [];
    if (chip !== "para-voce") return books.filter((b) => b.genre === chip);
    // "Para você": o que ainda não foi lido nem está em andamento.
    return books.filter((b) => {
      const p = progressOf.get(b.id);
      return !p || (p.status !== "lendo" && p.status !== "finalizado");
    });
  }, [chip, books, data, progressOf]);

  const handleUpdateStatus = async () => {
    if (!statusInput.trim()) return;
    if (!requireAuth("publicar um recado")) return;
    try {
      await updateGlobalStatus(statusInput.trim(), statusEmote);
      setIsEditingStatus(false);
      reload();
      toast("Recado atualizado para todo mundo.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Não foi possível atualizar.", "error");
    }
  };

  const handleLikePost = async (post: HomePost) => {
    if (!data) return;
    if (!requireAuth("curtir publicações")) return;
    const optimistic = data.posts.map((p) =>
      p.id === post.id ? { ...p, likedByMe: !p.likedByMe, likes: p.likes + (p.likedByMe ? -1 : 1) } : p
    );
    setData({ ...data, posts: optimistic });
    try {
      const res = await togglePostLike(post.id);
      setData((prev) => (prev ? { ...prev, posts: prev.posts.map((p) => (p.id === post.id ? { ...p, ...res } : p)) } : prev));
    } catch {
      setData(data);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-5 sm:py-7">
      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_330px] xl:gap-6 xl:items-start">
        {/* ── Coluna principal ─────────────────────────────────────────────── */}
        <div className="min-w-0 space-y-8">
          {/* Saudação + busca */}
          <header className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-foreground leading-tight md:whitespace-nowrap">
                {greeting}, {userName}! <span className="select-none">👋</span>
              </h1>
              <p className="text-[14px] text-[var(--text-3)] mt-1">
                Que tal continuar sua próxima aventura literária?
              </p>
            </div>

            <div className="relative w-full md:w-[360px] flex-shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--text-3)] pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar livros, autores, pessoas..."
                aria-label="Buscar"
                className="w-full h-12 pl-11 pr-4 md:pr-16 rounded-[14px] bg-[var(--surface)] border border-[var(--line)] text-[14px] outline-none focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--ring)] transition-colors"
              />
              <kbd className="hidden md:block absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[var(--text-3)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded-md pointer-events-none">
                ⌘K
              </kbd>
            </div>
          </header>

          {searchResults ? (
            <section>
              <SectionHeader title="Resultados da busca" subtitle={`${searchResults.length} encontrado(s)`} />
              {searchResults.length === 0 ? (
                <EmptyState emoji="🔍" title="Nada encontrado" description="Tente outro título ou nome de autor." />
              ) : (
                <BookGrid books={searchResults} progressOf={progressOf} />
              )}
            </section>
          ) : (
            <>
              {/* Banners do Admin */}
              {data && data.banners.length > 0 && <BannerCarousel banners={data.banners} />}

              {/* Destaque da semana */}
              {isLoading ? (
                <Skeleton className="w-full h-[300px] rounded-[22px]" />
              ) : hero ? (
                <HeroFeature
                  book={hero}
                  readers={heroReaders}
                  count={featured.length}
                  index={heroIndex}
                  paused={heroPaused}
                  onPause={setHeroPaused}
                  onSelect={setHeroIndex}
                  onOpen={() => navigate(`/book/${hero.id}`)}
                />
              ) : null}

              {/* Continue lendo */}
              <section>
                <RowHeader title="Continue lendo" to="/library?filter=lendo" />
                {isLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[280px] rounded-[18px]" />)}
                  </div>
                ) : (
                  <div className="mb-stagger grid grid-cols-2 md:grid-cols-4 gap-4">
                    {reading.map(({ book, progress: p }) => (
                      <ReadingCard key={book.id} book={book} progress={p} onOpen={() => openBook(book)} />
                    ))}
                    <Link
                      to="/upload"
                      className="rounded-[18px] border-2 border-dashed border-[var(--line)] flex flex-col items-center justify-center gap-2.5 text-[var(--text-3)] hover:border-[var(--primary)]/40 hover:text-[var(--primary)] transition-colors min-h-[220px]"
                    >
                      <BookOpen className="w-6 h-6" />
                      <span className="text-[13px] font-medium text-center leading-tight">Adicionar<br />livro</span>
                    </Link>
                  </div>
                )}
              </section>

              {/* Recomendado para você */}
              <section>
                <RowHeader title="Recomendado para você" to="/library" />
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-4">
                  <Chip active={chip === "para-voce"} onClick={() => setChip("para-voce")} icon={<Sparkles className="w-3.5 h-3.5" />}>
                    Para você
                  </Chip>
                  <Chip active={chip === "tendencias"} onClick={() => setChip("tendencias")} icon={<TrendingUp className="w-3.5 h-3.5" />}>
                    Tendências
                  </Chip>
                  {genres.map((g) => (
                    <Chip key={g} active={chip === g} onClick={() => setChip(g)}>{g}</Chip>
                  ))}
                </div>

                {isLoading ? (
                  <div className="flex gap-4">
                    {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="w-[124px] h-[186px] rounded-lg" />)}
                  </div>
                ) : recommended.length === 0 ? (
                  <EmptyState emoji="🫧" title="Nada nesta seleção ainda" />
                ) : (
                  <div className="mb-stagger mb-rail">
                    {recommended.slice(0, 14).map((book, i) => (
                      <BookCard key={book.id} book={book} width={124} index={i} progress={progressOf.get(book.id)} />
                    ))}
                  </div>
                )}
              </section>

              {/* Mural do Admin */}
              {data && data.posts.length > 0 && (
                <section>
                  <SectionHeader
                    title="Mural"
                    subtitle="Recados e indicações da curadoria"
                    icon={<Megaphone className="w-[18px] h-[18px] text-[var(--primary)]" />}
                  />
                  <div className="mb-stagger space-y-3">
                    {data.posts.map((post) => (
                      <PostCard key={post.id} post={post} books={books} onLike={() => handleLikePost(post)} />
                    ))}
                  </div>
                </section>
              )}

              {/* Atividade e comunidade, no fim da coluna em telas menores */}
              <div className="xl:hidden space-y-4">
                <ActivityCard feed={feed} />
                <CommunityCard data={data} admin={admin} />
              </div>
            </>
          )}

          {/* Recado da comunidade */}
          {data?.status && !searchResults && (
            <button
              onClick={() => {
                setStatusInput(data.status?.content || "");
                setStatusEmote(data.status?.emote || "📚");
                setIsEditingStatus(true);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-3 rounded-[14px] bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--primary)]/30 transition-colors text-left group"
            >
              <span className="text-lg select-none">{data.status.emote}</span>
              <span className="text-[13px] font-semibold text-foreground">{data.status.username}</span>
              <span className="text-[13px] text-[var(--text-3)] truncate flex-1">{data.status.content}</span>
              <Edit3 className="w-3.5 h-3.5 text-[var(--text-3)] group-hover:text-[var(--primary)] transition-colors flex-shrink-0" />
            </button>
          )}
        </div>

        {/* ── Trilho lateral ───────────────────────────────────────────────── */}
        <aside className="hidden xl:flex flex-col gap-4 sticky top-6">
          <ActivityCard feed={feed} />
          <CommunityCard data={data} admin={admin} />
        </aside>
      </div>

      {/* ── Modal de recado ─────────────────────────────────────────────────── */}
      <Modal
        open={isEditingStatus}
        onClose={() => setIsEditingStatus(false)}
        title="Recado da comunidade"
        description="Aparece na home de todos os leitores."
        footer={
          <>
            <button onClick={() => setIsEditingStatus(false)} className="mb-btn mb-btn-outline">Cancelar</button>
            <button onClick={handleUpdateStatus} disabled={!statusInput.trim()} className="mb-btn mb-btn-primary">
              <Send className="w-4 h-4" /> Publicar
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <span className="mb-label">Emote</span>
            <div className="flex gap-1.5 flex-wrap">
              {EMOTES.map((e) => (
                <button
                  key={e}
                  onClick={() => setStatusEmote(e)}
                  className={`text-xl w-10 h-10 rounded-xl transition-colors cursor-pointer ${
                    statusEmote === e ? "bg-[var(--primary-soft)] ring-1 ring-[var(--primary)]/40" : "hover:bg-[var(--surface-2)]"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="status-input" className="mb-label">Recado</label>
            <textarea
              id="status-input"
              value={statusInput}
              onChange={(e) => setStatusInput(e.target.value)}
              maxLength={120}
              rows={3}
              placeholder="O que está rolando na leitura hoje?"
              className="mb-input resize-none"
            />
            <p className="text-[11.5px] text-[var(--text-3)] text-right mt-1">{statusInput.length}/120</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Peças da home ────────────────────────────────────────────────────────────

function RowHeader({ title, to }: { title: string; to: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 mb-4">
      <h2 className="text-[19px] font-bold tracking-tight text-foreground">{title}</h2>
      <Link to={to} className="mb-link text-[13px] font-medium text-[var(--primary)]">Ver tudo</Link>
    </div>
  );
}

function Chip({
  active, onClick, children, icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors cursor-pointer border ${
        active
          ? "bg-[var(--primary-soft)] border-[var(--primary)]/30 text-[var(--primary)] font-semibold"
          : "bg-[var(--surface)] border-[var(--line)] text-[var(--text-2)] hover:border-[var(--primary)]/30"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function HeroFeature({
  book, readers, count, index, paused, onPause, onSelect, onOpen,
}: {
  book: Book;
  readers: { username: string; avatar: string }[];
  count: number;
  index: number;
  paused: boolean;
  onPause: (paused: boolean) => void;
  onSelect: (i: number) => void;
  onOpen: () => void;
}) {
  const cover = getFullUrl(book.coverImagePath);
  const layout = HERO_LAYOUTS[index % HERO_LAYOUTS.length];
  const active = count > 0 ? index % count : 0;
  const narrow = useIsNarrow();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchSavedIds()
      .then((ids) => { if (alive) setSaved(ids.includes(book.id)); })
      .catch(() => {});
    return () => { alive = false; };
  }, [book.id]);

  const toggleSave = async () => {
    const next = !saved;
    setSaved(next);
    try {
      await toggleSaved(book.id, next);
      toast(next ? "Guardado nos favoritos." : "Removido dos favoritos.");
    } catch {
      setSaved(!next);
      toast("Não deu para salvar agora.", "error");
    }
  };

  return (
    <section
      className="mb-hero relative overflow-hidden"
      onMouseEnter={() => onPause(true)}
      onMouseLeave={() => onPause(false)}
      onFocusCapture={() => onPause(true)}
      onBlurCapture={() => onPause(false)}
    >
      {/* A capa desfocada preenche o fundo do lado da vez e some para dentro
          do cartão — é o que dá o ar de vitrine fotografada. */}
      {cover && (
        <div
          aria-hidden
          key={`bg-${book.id}`}
          className={`absolute inset-y-0 w-[64%] pointer-events-none hidden sm:block ${layout.reverse ? "left-0" : "right-0"}`}
          style={{
            animation: "fade-in .7s ease both",
            // Sem a máscara o desfoque termina numa linha reta no meio do cartão.
            maskImage: `linear-gradient(to ${layout.reverse ? "left" : "right"}, transparent, #000 42%)`,
            WebkitMaskImage: `linear-gradient(to ${layout.reverse ? "left" : "right"}, transparent, #000 42%)`,
          }}
        >
          <img src={cover} alt="" className="w-full h-full object-cover opacity-30 blur-2xl scale-125" />
        </div>
      )}

      {/* Luz quente entrando pelo canto: a cena parece iluminada, não chapada. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(70% 90% at ${layout.reverse ? "22%" : "78%"} 12%, color-mix(in srgb, var(--gold) 16%, transparent), transparent 62%)`,
        }}
      />

      <div
        key={book.id}
        className={`relative flex flex-col items-start sm:items-center gap-4 sm:gap-10 p-6 sm:p-8 pb-12 sm:pb-14 ${layout.reverse ? "sm:flex-row-reverse" : "sm:flex-row"}`}
      >
        <div className="w-full sm:flex-1 min-w-0" style={{ animation: "mb-hero-swap .55s var(--ease-out) both" }}>
          <span className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-[var(--surface)]/85 border border-[var(--line)] text-[11px] font-bold uppercase tracking-wider text-[var(--text-2)]">
            <Star className="w-3.5 h-3.5 fill-[var(--gold)] text-[var(--gold)]" /> Destaque da semana
          </span>

          <h2 className="text-[26px] sm:text-[42px] font-bold tracking-tight text-foreground leading-[1.04] mt-3.5 line-clamp-2">
            {book.title}
          </h2>
          <p className="text-[15px] sm:text-[18px] font-semibold text-[var(--primary)] mt-1.5">
            {book.author || "Autor desconhecido"}
          </p>

          <p className="hidden sm:block text-[14.5px] text-[var(--text-2)] leading-relaxed mt-3.5 line-clamp-2 max-w-md">
            {book.description || "Um livro do acervo da comunidade esperando por você."}
          </p>

          <div className="flex items-center gap-3 mt-4 flex-wrap">
            {readers.length > 0 && (
              <div className="flex -space-x-2">
                {readers.map((r) => (
                  <span
                    key={r.username}
                    title={r.username}
                    className="w-8 h-8 rounded-full bg-[var(--surface)] border-2 border-[var(--sand-1)] flex items-center justify-center text-[15px] select-none"
                  >
                    {r.avatar}
                  </span>
                ))}
              </div>
            )}
            {!!book.readers && book.readers > 0 && (
              <span className="text-[13px] font-medium text-[var(--text-2)]">
                {book.readers} {book.readers === 1 ? "já leu" : "já leram"}
              </span>
            )}
            {book.rating > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-2)]">
                <Star className="w-4 h-4 fill-[var(--gold)] text-[var(--gold)]" />
                {book.rating.toFixed(1)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 mt-6">
            <button onClick={onOpen} className="mb-btn mb-btn-primary mb-btn-lg rounded-[14px]">
              Ver detalhes
            </button>
            <button
              onClick={toggleSave}
              aria-pressed={saved}
              aria-label={saved ? "Remover dos favoritos" : "Guardar nos favoritos"}
              title={saved ? "Remover dos favoritos" : "Guardar nos favoritos"}
              className={`w-12 h-12 rounded-[14px] border flex items-center justify-center transition-colors cursor-pointer ${
                saved
                  ? "bg-[var(--primary)] border-[var(--primary)] text-white"
                  : "bg-[var(--surface)]/85 border-[var(--line)] text-[var(--text-2)] hover:border-[var(--primary)]/40 hover:text-[var(--primary)]"
              }`}
            >
              <Bookmark className={`w-[19px] h-[19px] ${saved ? "fill-current" : ""}`} />
            </button>
          </div>
        </div>

        {/* O livro em três dimensões: capa, lombada e bloco de páginas de
            verdade. O invólucro externo cuida da entrada, o interno da altura e
            da flutuação — assim as transformações não brigam entre si. */}
        <div
          className="flex-shrink-0 relative self-center px-0 sm:px-11"
          style={{ animation: "mb-hero-cover-in .6s var(--ease-out) both" }}
        >
          <div
            key={`pose-${book.id}`}
            style={{
              // A altura do slide entra como variável: a flutuação anima o
              // mesmo `transform` e sobrescreveria um valor fixo.
              "--float-base": `${layout.offsetY}px`,
              animation: "mb-hero-float 6s ease-in-out infinite",
            } as React.CSSProperties}
          >
            <Book3D book={book} width={narrow ? 116 : layout.width} pose={layout.pose} floating still />
          </div>

          {/* Selo de curadoria, como a cinta de uma edição especial. */}
          {book.rating > 0 && (
            <span
              className={`hidden sm:flex absolute bottom-0 ${layout.reverse ? "right-0" : "left-0"} w-[84px] h-[84px] rounded-full bg-[var(--surface)]/92 border border-[var(--line)] shadow-[var(--shadow-2)] flex-col items-center justify-center text-center leading-tight backdrop-blur-sm`}
              // Metade para fora da folga: o selo encosta no livro sem tapar a capa.
              style={{ transform: `translateX(${layout.reverse ? "50%" : "-50%"})` }}
            >
              <Star className="w-4 h-4 fill-[var(--gold)] text-[var(--gold)]" />
              <span className="text-[17px] font-bold text-foreground mt-0.5">{book.rating.toFixed(1)}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-3)]">da turma</span>
            </span>
          )}
        </div>
      </div>

      {count > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              onClick={() => onSelect(i)}
              aria-label={`Destaque ${i + 1}`}
              aria-current={i === active}
              className={`h-1.5 rounded-full overflow-hidden transition-all cursor-pointer ${
                i === active ? "w-7 bg-[var(--foreground)]/15" : "w-1.5 bg-[var(--foreground)]/20 hover:bg-[var(--foreground)]/40"
              }`}
            >
              {/* A bolinha ativa se preenche no ritmo do autoplay. */}
              {i === active && (
                <span
                  key={`fill-${index}-${paused}`}
                  className="block h-full w-full origin-left bg-[var(--primary)]"
                  style={{
                    animation: `mb-dot-fill ${HERO_INTERVAL_MS}ms linear both`,
                    animationPlayState: paused ? "paused" : "running",
                  }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/** O livro do destaque encolhe no celular; acompanhar a largura basta. */
function useIsNarrow(breakpoint = 640) {
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.innerWidth < breakpoint);
  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const sync = () => setNarrow(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [breakpoint]);
  return narrow;
}

function ReadingCard({
  book, progress, onOpen,
}: {
  book: Book;
  progress: ReadingProgress;
  onOpen: () => void;
}) {
  const cover = getFullUrl(book.coverImagePath);
  return (
    <button onClick={onOpen} className="mb-card mb-card-hover overflow-hidden text-left cursor-pointer flex flex-col">
      <div className="aspect-[4/5] bg-[var(--surface-2)] overflow-hidden">
        {cover ? (
          <img src={cover} alt="" loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(book)}`} />
        )}
      </div>
      <div className="p-3.5 flex-1 flex flex-col">
        <h3 className="text-[14.5px] font-bold text-foreground leading-tight line-clamp-2">{book.title}</h3>
        <p className="text-[12.5px] text-[var(--text-3)] mt-1 truncate">{book.author}</p>
        <p className="flex items-center gap-1.5 text-[12px] text-[var(--text-2)] mt-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] flex-shrink-0" />
          Página {progress.currentPage + 1} de {progress.totalPages}
        </p>
      </div>
    </button>
  );
}

function ActivityCard({ feed }: { feed: FeedItem[] | null }) {
  const items = (feed ?? []).slice(0, 5);

  return (
    <div className="mb-card p-4">
      <div className="flex items-baseline justify-between mb-3.5">
        <h3 className="text-[15px] font-bold text-foreground">Atividade recente</h3>
        <Link to="/social" className="mb-link text-[12.5px] font-medium text-[var(--primary)]">Ver tudo</Link>
      </div>

      {items.length === 0 ? (
        <p className="text-[13px] text-[var(--text-3)] py-4 text-center">Nada por aqui ainda.</p>
      ) : (
        <div className="space-y-3.5">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-2.5">
              <Avatar emoji={item.avatar || (item.type === "new-book" ? "📗" : "🐼")} size="xs" username={item.username} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-snug">
                  {item.username && (
                    <Link to={`/user/${encodeURIComponent(item.username)}`} className="font-semibold text-foreground hover:text-[var(--primary)]">
                      {item.username}
                    </Link>
                  )}{" "}
                  <span className="text-[var(--text-3)]">
                    {item.type === "review" && "comentou em"}
                    {item.type === "finished" && "concluiu"}
                    {item.type === "reading" && "está lendo"}
                    {item.type === "new-book" && "Novo na estante"}
                  </span>{" "}
                  {item.book && (
                    <Link to={`/book/${item.book.id}`} className="font-medium text-foreground hover:text-[var(--primary)]">
                      {item.book.title}
                    </Link>
                  )}
                </p>

                {item.type === "review" && item.review?.comment && (
                  <p className="text-[12.5px] text-[var(--text-3)] line-clamp-1 mt-0.5">
                    “{item.review.hasSpoiler ? "contém spoiler" : item.review.comment}”
                  </p>
                )}

                {item.type === "reading" && item.progress != null && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="flex-1 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                      <span className="block h-full rounded-full bg-[var(--primary)]" style={{ width: `${item.progress}%` }} />
                    </span>
                    <span className="text-[11.5px] font-semibold text-[var(--text-3)]">{item.progress}%</span>
                  </div>
                )}
              </div>
              <span className="text-[11.5px] text-[var(--text-3)] flex-shrink-0">{timeAgo(item.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommunityCard({ data, admin }: { data: HomeData | null; admin: boolean }) {
  const reviews = (data?.recentReviews ?? []).slice(0, 3);

  return (
    <div className="mb-card p-4">
      <div className="flex items-baseline justify-between mb-3.5">
        <h3 className="text-[15px] font-bold text-foreground">Comunidade ativa</h3>
        <Link to="/social" className="mb-link text-[12.5px] font-medium text-[var(--primary)]">Ver tudo</Link>
      </div>

      {reviews.length === 0 ? (
        <p className="text-[13px] text-[var(--text-3)] py-4 text-center">Ninguém avaliou ainda.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <article key={review.id} className="border-b border-[var(--line)] last:border-0 pb-4 last:pb-0">
              <div className="flex items-center gap-2.5">
                <Avatar emoji={review.avatar} size="xs" username={review.username} />
                <div className="min-w-0 flex-1">
                  <Link to={`/user/${encodeURIComponent(review.username)}`} className="block text-[13px] font-semibold text-foreground hover:text-[var(--primary)] truncate">
                    {review.username}
                  </Link>
                  <span className="block text-[11.5px] text-[var(--text-3)] truncate">@{review.username.toLowerCase()}</span>
                </div>
                <span className="text-[11.5px] text-[var(--text-3)]">{timeAgo(review.createdAt)}</span>
              </div>

              {review.comment && (
                <p className="text-[13px] text-[var(--text-2)] leading-relaxed mt-2.5 line-clamp-3">
                  {review.hasSpoiler ? "⚠️ Contém spoiler — abra para ler" : review.comment}
                </p>
              )}

              <div className="flex items-center gap-4 mt-2.5">
                <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-3)]">
                  <Heart className="w-3.5 h-3.5 text-[var(--like)]" /> {review.likes}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-3)]">
                  <MessageCircle className="w-3.5 h-3.5" /> {review.comments.length}
                </span>
                <Link to={`/book/${review.bookId}#avaliar`} className="mb-link ml-auto text-[12px] font-medium text-[var(--primary)]">
                  Ver discussão
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <Link to={admin ? "/admin" : "/library"} className="mb-btn mb-btn-soft w-full mt-4 h-11 rounded-[14px]">
        {admin ? <><PenSquare className="w-4 h-4" /> Criar publicação</> : <><Plus className="w-4 h-4" /> Avaliar um livro</>}
      </Link>
    </div>
  );
}

function PostCard({ post, books, onLike }: { post: HomePost; books: Book[]; onLike: () => void }) {
  const linkedBook = post.bookId ? books.find((b) => b.id === post.bookId) : null;
  const image = getFullUrl(post.imageUrl);

  return (
    <article className="mb-card overflow-hidden">
      {image && <img src={image} alt="" loading="lazy" decoding="async" className="w-full max-h-72 object-cover" />}
      <div className="p-4">
        <div className="flex items-center gap-2.5">
          <Avatar emoji={post.avatar} size="xs" username={post.author} />
          <span className="text-[13px] font-semibold text-foreground">{post.author}</span>
          <span className="mb-chip mb-chip-primary">Admin</span>
          {post.isPinned && <span className="mb-chip"><Pin className="w-3 h-3" /> Fixado</span>}
          <span className="text-[11.5px] text-[var(--text-3)] ml-auto">{timeAgo(post.createdAt)}</span>
        </div>

        {post.title && <h3 className="text-[15px] font-bold text-foreground mt-3">{post.title}</h3>}
        {post.content && (
          <p className="text-[13.5px] text-[var(--text-2)] leading-relaxed mt-1.5 whitespace-pre-wrap">{post.content}</p>
        )}

        {linkedBook && (
          <Link
            to={`/book/${linkedBook.id}`}
            className="flex items-center gap-3 mt-3.5 p-2.5 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors"
          >
            <div className="w-9 aspect-[2/3] rounded overflow-hidden flex-shrink-0 bg-[var(--surface-3)]">
              {linkedBook.coverImagePath && (
                <img src={getFullUrl(linkedBook.coverImagePath)!} alt="" loading="lazy" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground truncate">{linkedBook.title}</p>
              <p className="text-[11.5px] text-[var(--text-3)] truncate">{linkedBook.author}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-3)] ml-auto flex-shrink-0" />
          </Link>
        )}

        <button onClick={onLike} className={`mb-btn mb-btn-sm mb-btn-ghost mt-3 ${post.likedByMe ? "text-[var(--like)]" : ""}`}>
          <Heart className={`w-4 h-4 ${post.likedByMe ? "fill-current" : ""}`} />
          {post.likes > 0 ? post.likes : "Curtir"}
        </button>
      </div>
    </article>
  );
}
