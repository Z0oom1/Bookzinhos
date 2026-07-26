import { useState, useEffect } from "react";
import { BookOpen, Clock, Award, Pencil, X, Check, Settings, Smartphone, HelpCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { fetchBooks, fetchAllProgress, fetchStats, updateProfile, fetchUserProfile, isOfflineMode, setOfflineMode } from "../lib/api";
import { getCoverGradient, getFullUrl } from "../lib/types";
import type { Book, ReadingProgress, Stats } from "../lib/types";
import { getSavedReaderMode, setSavedReaderMode, type ReaderMode } from "../lib/readerChoice";

const AVATARS = ["🐼", "🦊", "🐰", "🌸", "🎀", "✨", "🦋", "🌷", "🍡"];

export function Profile() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const [stats, setStats] = useState<Stats>({ finished: 0, reading: 0, notesCount: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Profile State
  const [userName, setUserName] = useState(() => localStorage.getItem("books-username") || "Leitora");
  const [userBio, setUserBio] = useState(() => localStorage.getItem("books-bio") || "Apaixonada por histórias que transformam");
  const [userAvatar, setUserAvatar] = useState(() => localStorage.getItem("books-avatar") || "🐼");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Offline Mode State
  const [isOffline, setIsOffline] = useState(isOfflineMode);

  // Reader Mode Preference State
  const [readerMode, setReaderMode] = useState<ReaderMode | null>(() => getSavedReaderMode());
  const handleSetReaderMode = (mode: ReaderMode | null) => {
    setSavedReaderMode(mode);
    setReaderMode(mode);
  };

  const handleToggleOffline = () => {
    const next = !isOffline;
    setIsOffline(next);
    setOfflineMode(next);
    
    const toastElement = document.createElement("div");
    toastElement.className = "fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-bold px-6 py-3.5 rounded-xl shadow-xl z-[150] animate-bounce-in flex items-center gap-2 border border-slate-700";
    toastElement.innerHTML = next 
      ? "<span>🐼 Ativando Modo Offline...</span>"
      : "<span>🌐 Conectando ao Servidor...</span>";
    document.body.appendChild(toastElement);
    
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  // Shelf State
  const [shelfBookIds, setShelfBookIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("profile-shelf");
    return saved ? JSON.parse(saved) : [];
  });
  const [isEditingShelf, setIsEditingShelf] = useState(false);

  // Sync editing state with URL to hide navbar
  useEffect(() => {
    const isEditing = isEditingProfile || isEditingShelf;
    if (isEditing) {
      searchParams.set("hideNav", "true");
    } else {
      searchParams.delete("hideNav");
    }
    setSearchParams(searchParams, { replace: true });
  }, [isEditingProfile, isEditingShelf]);

  useEffect(() => {
    const currentUsername = localStorage.getItem("books-username") || "anonymous";
    Promise.all([
      fetchBooks().catch(() => []),
      fetchAllProgress().catch(() => []),
      fetchStats().catch(() => ({ finished: 0, reading: 0, notesCount: 0 })),
      currentUsername !== "anonymous" ? fetchUserProfile(currentUsername).catch(() => null) : Promise.resolve(null)
    ])
      .then(([b, p, s, userProfile]) => {
        const booksList = b || [];
        const progressList = p || [];
        const statsData = s || { finished: 0, reading: 0, notesCount: 0 };

        setBooks(booksList);
        setProgress(progressList);
        setStats(statsData);

        let finalShelf: string[] = [];

        if (userProfile) {
          setUserName(userProfile.username);
          setUserBio(userProfile.bio || "");
          setUserAvatar(userProfile.avatar || "🐼");
          finalShelf = userProfile.shelf || [];
          localStorage.setItem("books-bio", userProfile.bio || "");
          localStorage.setItem("books-avatar", userProfile.avatar || "🐼");
        } else {
          const localBio = localStorage.getItem("books-bio") || "Apaixonada por histórias que transformam";
          const localAvatar = localStorage.getItem("books-avatar") || "🐼";
          const localShelfStr = localStorage.getItem("profile-shelf");
          finalShelf = localShelfStr ? JSON.parse(localShelfStr) : [];
          setUserName(currentUsername);
          setUserBio(localBio);
          setUserAvatar(localAvatar);
        }

        if (finalShelf.length === 0 && booksList.length > 0) {
          finalShelf = booksList
            .filter((book: Book) => progressList.some((prog: ReadingProgress) => prog.bookId === book.id))
            .map((book: Book) => book.id)
            .slice(0, 9);
        }
        setShelfBookIds(finalShelf);
        localStorage.setItem("profile-shelf", JSON.stringify(finalShelf));
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Erro ao carregar dados do perfil:", err);
        setIsLoading(false);
      });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("books-username");
    localStorage.removeItem("books-bio");
    localStorage.removeItem("books-avatar");
    localStorage.removeItem("profile-shelf");
    window.location.reload();
  };

  const handleSaveProfile = async (name: string, bio: string, avatar: string) => {
    try {
      await updateProfile(bio, avatar, shelfBookIds);
      setUserName(name);
      setUserBio(bio);
      setUserAvatar(avatar);
      localStorage.setItem("books-bio", bio);
      localStorage.setItem("books-avatar", avatar);
      setIsEditingProfile(false);
    } catch (err) {
      alert("Erro ao salvar perfil");
    }
  };

  const handleSaveShelf = async (ids: string[]) => {
    try {
      await updateProfile(userBio, userAvatar, ids);
      setShelfBookIds(ids);
      localStorage.setItem("profile-shelf", JSON.stringify(ids));
      setIsEditingShelf(false);
    } catch (err) {
      alert("Erro ao salvar estante");
    }
  };

  const shelfBooks = shelfBookIds.map(id => books.find(b => b.id === id)).filter(Boolean) as Book[];

  const recentActivity = [...progress]
    .sort((a, b) => b.lastReadAt - a.lastReadAt)
    .slice(0, 5)
    .map((p) => {
      const book = books.find((b) => b.id === p.bookId);
      if (!book) return null;
      const label = p.status === "finalizado" ? "Finalizou" : p.status === "lendo" ? "Lendo" : "Pausou";
      const date = new Date(p.lastReadAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = date.toDateString() === today.toDateString() ? "Hoje" : date.toDateString() === yesterday.toDateString() ? "Ontem" : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      return { book, label, dateStr, progress: p };
    })
    .filter(Boolean);

  const statCards = [
    { icon: BookOpen, label: "Livros lidos", value: String(stats.finished) },
    { icon: Clock, label: "Lendo agora", value: String(stats.reading) },
    { icon: Award, label: "Notinhas", value: String(stats.notesCount) },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-5xl animate-bounce-in">{userAvatar}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 relative overflow-hidden">

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8 relative z-10">

        {/* Header */}
        <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-slate-100 text-center animate-scale-in relative mt-12">
          <button
            onClick={() => setIsEditingProfile(true)}
            className="absolute right-4 top-4 p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl active:scale-95 transition-all cursor-pointer"
            title="Editar Perfil"
          >
            <Pencil className="w-4 h-4" />
          </button>

          <div className="relative inline-block mb-4 -mt-20">
            <div className="w-28 h-28 relative rounded-2xl bg-slate-100 mx-auto flex items-center justify-center text-5xl shadow-sm border-4 border-white select-none">
              {userAvatar}
            </div>
          </div>

          <h1 className="text-xl font-semibold text-slate-900 mb-1.5 tracking-tight">{userName}</h1>
          <p className="text-[13px] text-slate-500 px-6 leading-relaxed">
            {userBio}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {statCards.map(({ icon: Icon, label, value }, idx) => (
            <div
              key={label}
              className="bg-white border border-slate-100 rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center flex flex-col items-center justify-center gap-2 animate-scale-in"
              style={{ animationDelay: `${0.1 + idx * 0.05}s` }}
            >
              <Icon className="w-4.5 h-4.5 text-[var(--primary)]" />
              <div>
                <div className="text-lg font-semibold text-slate-900 leading-none mb-1">
                  {value}
                </div>
                <div className="text-[11px] text-slate-400">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Bookshelf */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-slate-800 font-semibold text-[15px] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--primary)]" /> Minha estante
            </h2>
            <button
              onClick={() => setIsEditingShelf(true)}
              className="text-[12px] font-medium text-slate-500 hover:text-slate-800 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Pencil className="w-3 h-3" /> Editar
            </button>
          </div>

          {shelfBooks.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {shelfBooks.map((book, idx) => {
                const coverUrl = getFullUrl(book.coverImagePath);
                return (
                  <Link
                    key={book.id}
                    to={`/book/${book.id}`}
                    className="group relative aspect-[2/3] rounded-md bg-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.12),0_6px_16px_-4px_rgba(0,0,0,0.18)] ring-1 ring-black/5 overflow-hidden cursor-pointer animate-fade-in block transition-transform duration-200 group-hover:-translate-y-0.5"
                    style={{ animationDelay: `${0.3 + idx * 0.05}s` }}
                  >
                    {coverUrl ? (
                      <img src={coverUrl} alt={book.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(book)} flex items-center justify-center p-3 text-[10px] text-center font-extrabold text-white transition-transform duration-500 group-hover:scale-105 leading-relaxed`}>
                        {book.title}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="bg-white/90 p-2.5 rounded-full transform translate-y-3 group-hover:translate-y-0 transition-transform duration-300 shadow-md">
                        <BookOpen className="w-4 h-4 text-[var(--primary)]" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[2rem] p-8 text-center space-y-4">
              <div className="text-4xl opacity-50 grayscale mx-auto select-none pointer-events-none">🪴</div>
              <p className="text-xs font-bold text-[var(--text-muted)]">Sua estante está vazia.</p>
              <button 
                onClick={() => setIsEditingShelf(true)}
                className="text-xs font-extrabold text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors underline uppercase tracking-widest cursor-pointer"
              >
                Adicionar livros mágicos ✨
              </button>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div className="space-y-3 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <h2 className="text-slate-800 font-semibold text-[15px] px-1">Atividade recente</h2>
            <div className="space-y-2.5">
              {recentActivity.map((activity, idx) => {
                if (!activity) return null;
                const coverUrl = getFullUrl(activity.book.coverImagePath);
                return (
                  <Link
                    key={idx}
                    to={`/book/${activity.book.id}`}
                    className="flex bg-white rounded-xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-slate-100 hover:border-slate-200 transition-all animate-fade-in gap-4 items-center group active:scale-[0.99]"
                    style={{ animationDelay: `${0.4 + idx * 0.05}s` }}
                  >
                    <div className="w-12 h-16 rounded-md overflow-hidden flex-shrink-0 bg-slate-100 relative ring-1 ring-black/5">
                      {coverUrl ? <img src={coverUrl} className="w-full h-full object-cover" /> : <BookOpen className="absolute inset-0 m-auto w-5 h-5 text-slate-300" />}
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex justify-between items-start mb-1.5">
                        <h4 className="text-[13px] font-medium text-slate-800 truncate pr-2 group-hover:text-[var(--primary)] transition-colors">{activity.book.title}</h4>
                        <span className="text-[11px] text-slate-400 flex-shrink-0">{activity.dateStr}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">{activity.label}</span>
                        {activity.progress.status === "lendo" && (
                          <span className="text-[11px] font-medium text-[var(--primary)]">
                            {activity.progress.progress}%
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Preferência de Leitor */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] animate-fade-in space-y-4" style={{ animationDelay: "0.35s" }}>
          <div>
            <h2 className="text-slate-800 font-semibold text-[15px] flex items-center gap-2">
              <Settings className="w-4 h-4 text-[var(--primary)]" /> Preferência de leitura
            </h2>
            <p className="text-[12px] text-slate-400 mt-1">
              Escolha como abrir os livros com PDF. Você pode mudar isso quando quiser.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleSetReaderMode("app")}
              className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border transition-all cursor-pointer ${readerMode === "app" ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-slate-100 hover:border-slate-200"}`}
            >
              <BookOpen className={`w-4.5 h-4.5 ${readerMode === "app" ? "text-[var(--primary)]" : "text-slate-400"}`} />
              <span className="text-[11px] font-medium text-slate-700">App</span>
            </button>
            <button
              onClick={() => handleSetReaderMode("native")}
              className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border transition-all cursor-pointer ${readerMode === "native" ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-slate-100 hover:border-slate-200"}`}
            >
              <Smartphone className={`w-4.5 h-4.5 ${readerMode === "native" ? "text-[var(--primary)]" : "text-slate-400"}`} />
              <span className="text-[11px] font-medium text-slate-700">Sistema</span>
            </button>
            <button
              onClick={() => handleSetReaderMode(null)}
              className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border transition-all cursor-pointer ${readerMode === null ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-slate-100 hover:border-slate-200"}`}
            >
              <HelpCircle className={`w-4.5 h-4.5 ${readerMode === null ? "text-[var(--primary)]" : "text-slate-400"}`} />
              <span className="text-[11px] font-medium text-slate-700">Perguntar</span>
            </button>
          </div>
        </div>

        <div className="pt-8 text-center animate-fade-in" style={{ animationDelay: "0.5s" }}>
          <button
            onClick={handleLogout}
            className="text-[12px] text-red-500 font-medium px-5 py-2.5 rounded-lg bg-red-50 hover:bg-red-100 active:scale-95 transition-all cursor-pointer"
          >
            Sair da conta
          </button>
        </div>
      </div>

      {isEditingProfile && (
        <EditProfileModal 
          initialName={userName} 
          initialBio={userBio} 
          initialAvatar={userAvatar} 
          onClose={() => setIsEditingProfile(false)} 
          onSave={handleSaveProfile} 
        />
      )}

      {isEditingShelf && (
        <EditShelfModal 
          books={books} 
          initialIds={shelfBookIds} 
          onClose={() => setIsEditingShelf(false)} 
          onSave={handleSaveShelf} 
        />
      )}
    </div>
  );
}

function EditProfileModal({ initialName, initialBio, initialAvatar, onClose, onSave }: any) {
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [avatar, setAvatar] = useState(initialAvatar);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div 
        className="relative bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-md p-6 space-y-6 shadow-2xl animate-slide-up border border-slate-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto sm:hidden mb-2" />
        <div className="flex justify-between items-center">
          <h3 className="text-base font-extrabold text-[var(--text-main)] uppercase tracking-widest">Editar Perfil</h3>
          <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"><X className="w-4 h-4 text-slate-500" /></button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2 text-center">
            <label className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest block">Escolha seu Avatar</label>
            <div className="flex flex-wrap justify-center gap-2.5">
              {AVATARS.map(a => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`w-12 h-12 text-2xl flex items-center justify-center rounded-2xl transition-all active:scale-95 cursor-pointer ${avatar === a ? 'bg-[var(--primary)]/10 border-2 border-[var(--primary)] scale-105' : 'bg-slate-50 hover:bg-slate-100 border border-slate-100'}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest pl-1">Nome de Usuário</label>
            <input 
              value={name} 
              disabled
              className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3.5 outline-none text-xs text-slate-400 font-semibold cursor-not-allowed select-none"
              placeholder="Seu nome"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest pl-1">Biografia</label>
            <textarea 
              value={bio} 
              onChange={e => setBio(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 focus:border-[var(--primary)]/30 focus:ring-4 focus:ring-[var(--primary)]/5 outline-none text-xs text-[var(--text-main)] font-semibold resize-none h-24 transition-all"
              placeholder="Fale um pouco sobre você..."
              maxLength={100}
            />
          </div>
        </div>

        <button 
          onClick={() => onSave(name, bio, avatar)}
          disabled={!name.trim() || !bio.trim()}
          className={`w-full py-4 font-bold rounded-2xl transition-all flex justify-center items-center gap-2 cursor-pointer shadow-md ${
            !name.trim() || !bio.trim()
              ? "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
              : "bg-[var(--primary)] text-white shadow-[var(--primary)]/10 hover:shadow-[var(--primary)]/20 active:scale-95"
          }`}
        >
          <Check className="w-4 h-4" /> Salvar Perfil
        </button>
      </div>
    </div>
  );
}

function EditShelfModal({ books, initialIds, onClose, onSave }: any) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialIds));

  const toggleBook = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div 
        className="relative bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-lg h-[80vh] sm:h-auto sm:max-h-[85vh] flex flex-col shadow-2xl animate-slide-up border border-slate-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto sm:hidden mb-4" />
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-main)] uppercase tracking-widest">Editar Estante</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Escolha quais livros exibir ({selectedIds.size} selecionados)</p>
            </div>
            <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"><X className="w-4 h-4 text-slate-500" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {books.map((book: Book) => {
            const isSelected = selectedIds.has(book.id);
            const coverUrl = getFullUrl(book.coverImagePath);
            return (
              <div 
                key={book.id}
                onClick={() => toggleBook(book.id)}
                className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all border ${isSelected ? 'bg-[var(--primary)]/5 border-[var(--primary)]/20' : 'hover:bg-slate-50 border-transparent'}`}
              >
                <div className="w-12 h-16 rounded-xl overflow-hidden flex-shrink-0 shadow-sm bg-slate-100 border border-slate-200">
                  {coverUrl ? <img src={coverUrl} className="w-full h-full object-cover" /> : <BookOpen className="w-full h-full p-3.5 text-slate-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-[var(--text-main)] truncate">{book.title}</h4>
                  <p className="text-[10px] text-[var(--text-muted)] truncate font-semibold mt-0.5">{book.author}</p>
                </div>
                <div className={`w-5.5 h-5.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-[var(--primary)] border-[var(--primary)] text-white' : 'border-slate-200'}`}>
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-100 flex-shrink-0 bg-white rounded-b-[2.5rem]">
          <button 
            onClick={() => onSave(Array.from(selectedIds))}
            disabled={selectedIds.size === 0}
            className={`w-full py-4 font-bold rounded-2xl transition-all shadow-md cursor-pointer ${
              selectedIds.size === 0
                ? "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                : "bg-[var(--primary)] text-white shadow-[var(--primary)]/10 hover:shadow-[var(--primary)]/25 active:scale-95"
            }`}
          >
            Salvar Estante
          </button>
        </div>
      </div>
    </div>
  );
}
