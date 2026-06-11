import { useState, useEffect } from "react";
import { BookOpen, Clock, Award, Pencil, X, Check, Settings } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { fetchBooks, fetchAllProgress, fetchStats, updateProfile, fetchUserProfile, isOfflineMode, setOfflineMode } from "../lib/api";
import { getCoverGradient, getFullUrl } from "../lib/types";
import type { Book, ReadingProgress, Stats } from "../lib/types";

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
    <div className="min-h-screen bg-transparent pb-32 relative overflow-hidden">
      
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-10 relative z-10">
        
        {/* Header */}
        <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.02)] border border-white/80 text-center animate-scale-in relative mt-12">
          <button 
            onClick={() => setIsEditingProfile(true)}
            className="absolute right-4.5 top-4.5 p-3 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-2xl hover:-translate-y-0.5 active:scale-95 transition-all border border-slate-100 cursor-pointer shadow-sm"
            title="Editar Perfil"
          >
            <Pencil className="w-4 h-4" />
          </button>
          
          <div className="relative inline-block mb-4 -mt-20">
            <div className="absolute inset-0 bg-[var(--lavender)]/40 rounded-[2.5rem] blur-xl opacity-40 animate-pulse-soft" />
            <div className="w-32 h-32 relative rounded-[2.25rem] bg-[var(--lavender)] mx-auto flex items-center justify-center text-6xl shadow-md border-4 border-white select-none">
              {userAvatar}
            </div>
            <div
              className="absolute -bottom-2 -right-2 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-100 select-none animate-scale-in"
              style={{ animationDelay: "0.2s" }}
            >
              <span className="text-lg">✨</span>
            </div>
          </div>
          
          <h1 className="text-2xl font-extrabold text-[var(--text-main)] mb-2 tracking-tight">{userName}</h1>
          <p className="text-xs text-[var(--text-muted)] font-medium italic px-6 leading-relaxed">
            "{userBio}"
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {statCards.map(({ icon: Icon, label, value }, idx) => (
            <div
              key={label}
              className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-[2rem] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all text-center flex flex-col items-center justify-center gap-2 animate-scale-in group"
              style={{ animationDelay: `${0.1 + idx * 0.05}s` }}
            >
              <div className="w-12 h-12 bg-[var(--lavender)]/15 rounded-[1.1rem] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Icon className="w-5 h-5 text-[var(--primary)]" />
              </div>
              <div>
                <div className="text-xl font-extrabold text-[var(--text-main)] leading-none mb-1">
                  {value}
                </div>
                <div className="text-[9px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Bookshelf */}
        <div className="bg-white/70 backdrop-blur-xl rounded-[2.25rem] p-6 border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.02)] animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[var(--text-main)] font-extrabold text-base flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[var(--primary)]" /> Minha Estante
            </h2>
            <button 
              onClick={() => setIsEditingShelf(true)}
              className="text-[10px] font-extrabold text-[var(--primary)] bg-[var(--primary)]/10 px-4 py-2 rounded-xl hover:bg-[var(--primary)]/20 active:scale-95 transition-all flex items-center gap-1.5 uppercase tracking-widest cursor-pointer"
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
                    className="group relative aspect-[2/3] rounded-2xl bg-white shadow-md overflow-hidden border border-white/50 cursor-pointer animate-fade-in block"
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
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <h2 className="text-[var(--text-main)] font-extrabold text-base flex items-center gap-2 px-1">
              <span className="text-xl animate-spin-slow select-none pointer-events-none">💫</span> Atividade Recente
            </h2>
            <div className="space-y-3">
              {recentActivity.map((activity, idx) => {
                if (!activity) return null;
                const coverUrl = getFullUrl(activity.book.coverImagePath);
                return (
                  <Link
                    key={idx}
                    to={`/book/${activity.book.id}`}
                    className="flex bg-white/70 backdrop-blur-xl rounded-[2rem] p-3 shadow-[0_8px_30px_rgba(0,0,0,0.01)] border border-white/80 hover:border-slate-200 hover:shadow-[0_12px_30px_rgba(0,0,0,0.02)] transition-all animate-fade-in gap-4 items-center group active:scale-[0.99]"
                    style={{ animationDelay: `${0.4 + idx * 0.05}s` }}
                  >
                    <div className="w-14 h-20 rounded-md overflow-hidden flex-shrink-0 shadow-sm bg-[var(--lavender)]/15 relative border border-slate-100">
                      {coverUrl ? <img src={coverUrl} className="w-full h-full object-cover" /> : <BookOpen className="absolute inset-0 m-auto w-5 h-5 text-[var(--primary)]/45" />}
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-xs font-extrabold text-[var(--text-main)] truncate pr-2 group-hover:text-[var(--primary)] transition-colors">{activity.book.title}</h4>
                        <span className="text-[9px] text-[var(--text-muted)] bg-slate-50 px-2.5 py-1 rounded-lg font-bold flex-shrink-0 border border-slate-100">{activity.dateStr}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border ${activity.label === 'Finalizou' ? 'bg-[var(--mint)]/20 text-[var(--mint)] border-[var(--mint)]/20' : activity.label === 'Lendo' ? 'bg-[var(--peach)]/25 text-[var(--peach)] border-[var(--peach)]/20' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {activity.label}
                        </span>
                        {activity.progress.status === "lendo" && (
                          <span className="text-[10px] font-extrabold text-[var(--primary)] bg-[var(--primary)]/10 px-2.5 py-1 rounded-lg">
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



        <div className="pt-8 text-center animate-fade-in" style={{ animationDelay: "0.5s" }}>
          <button
            onClick={handleLogout}
            className="text-[10px] text-red-500 font-extrabold px-6 py-3 rounded-xl bg-red-50/50 border border-red-100 hover:bg-red-50 hover:scale-103 active:scale-95 transition-all shadow-sm uppercase tracking-widest cursor-pointer"
          >
            Sair da Conta 🐾
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
