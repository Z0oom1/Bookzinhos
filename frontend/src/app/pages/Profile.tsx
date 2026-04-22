import { useState, useEffect } from "react";
import { BookOpen, Clock, Award, Pencil, X, Check } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { fetchBooks, fetchAllProgress, fetchStats, updateProfile } from "../lib/api";
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
    Promise.all([fetchBooks(), fetchAllProgress(), fetchStats()]).then(([b, p, s]) => {
      setBooks(b);
      setProgress(p);
      setStats(s);
      setIsLoading(false);
      // Auto populate shelf if empty
      if (shelfBookIds.length === 0) {
        const defaultShelf = b.filter(book => p.some(prog => prog.bookId === book.id)).map(book => book.id).slice(0, 9);
        setShelfBookIds(defaultShelf);
        localStorage.setItem("profile-shelf", JSON.stringify(defaultShelf));
      }
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
    // Note: name shouldn't actually change if it's the PK in the DB, 
    // but we can update bio and avatar.
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
    <div className="min-h-screen bg-[var(--bg-pastel)] pb-20 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-72 bg-gradient-to-b from-[var(--blush)]/30 via-[var(--lavender)]/20 to-transparent pointer-events-none" />
      <div className="absolute top-24 right-8 text-4xl opacity-30 animate-float" style={{ animationDelay: "0s" }}>✨</div>
      <div className="absolute top-48 left-8 text-3xl opacity-30 animate-float" style={{ animationDelay: "1.5s" }}>💕</div>
      <div className="absolute top-12 left-1/2 text-2xl opacity-20 animate-float" style={{ animationDelay: "3s" }}>🐼</div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-10 relative z-10">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl border border-white/60 text-center animate-scale-in relative mt-12">
          <button 
            onClick={() => setIsEditingProfile(true)}
            className="absolute right-4 top-4 p-3 bg-[var(--lavender)]/10 text-[var(--lavender)] rounded-2xl shadow-sm hover:shadow-md hover:bg-[var(--lavender)]/20 hover:-translate-y-1 transition-all"
            title="Editar Perfil"
          >
            <Pencil className="w-5 h-5" />
          </button>
          
          <div className="relative inline-block mb-4 -mt-20">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--lavender)] to-[var(--blush)] rounded-[2.5rem] blur-xl opacity-50 animate-pulse-soft" />
            <div className="w-32 h-32 relative rounded-[2.5rem] bg-gradient-to-br from-[var(--blush)] via-[var(--peach)] to-[var(--lavender)] mx-auto flex items-center justify-center text-6xl shadow-xl border-4 border-white transform hover:rotate-3 hover:scale-105 transition-all duration-300">
              {userAvatar}
            </div>
            <div
              className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-[var(--bg-pastel)] animate-scale-in"
              style={{ animationDelay: "0.3s" }}
            >
              <span className="text-xl">✨</span>
            </div>
          </div>
          
          <h1 className="text-3xl font-black text-[var(--text-main)] mb-2">{userName}</h1>
          <p className="text-[15px] text-[var(--text-muted)] italic px-4">
            "{userBio}"
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {statCards.map(({ icon: Icon, label, value }, idx) => (
            <div
              key={label}
              className="bg-white/80 backdrop-blur-md border border-[var(--lavender)]/20 rounded-[2rem] p-4 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all text-center flex flex-col items-center justify-center gap-2 animate-scale-in group"
              style={{ animationDelay: `${0.2 + idx * 0.1}s` }}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-[var(--blush)]/20 to-[var(--lavender)]/20 rounded-[1rem] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Icon className="w-6 h-6 text-[var(--lavender)]" />
              </div>
              <div>
                <div className="text-2xl font-black text-[var(--text-main)] leading-none mb-1">
                  {value}
                </div>
                <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Bookshelf */}
        <div className="bg-white/60 backdrop-blur-md rounded-[2.5rem] p-6 border border-white/50 shadow-sm animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[var(--text-main)] font-black text-xl flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-[var(--blush)]" /> Minha Estante
            </h2>
            <button 
              onClick={() => setIsEditingShelf(true)}
              className="text-xs font-bold text-[var(--lavender)] bg-[var(--lavender)]/10 px-4 py-2 rounded-xl hover:bg-[var(--lavender)]/20 active:scale-95 transition-all flex items-center gap-1"
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
                    style={{ animationDelay: `${0.5 + idx * 0.05}s` }}
                  >
                    {coverUrl ? (
                      <img src={coverUrl} alt={book.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${getCoverGradient(book)} flex items-center justify-center p-3 text-xs text-center font-bold text-white transition-transform duration-500 group-hover:scale-105`}>
                        {book.title}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="bg-white/90 p-2 rounded-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        <BookOpen className="w-5 h-5 text-[var(--primary)]" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-[var(--bg-pastel)]/50 border-2 border-dashed border-[var(--lavender)]/30 rounded-[2rem] p-8 text-center space-y-4">
              <div className="text-5xl opacity-50 grayscale mx-auto">🪴</div>
              <p className="text-sm font-bold text-[var(--text-muted)]">Sua estante está vazia.</p>
              <button 
                onClick={() => setIsEditingShelf(true)}
                className="text-sm font-black text-[var(--primary)] hover:text-[var(--lavender)] transition-colors underline"
              >
                Adicionar livros mágicos ✨
              </button>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <h2 className="text-[var(--text-main)] font-black text-xl flex items-center gap-2 px-2">
              <span className="text-2xl animate-spin-slow">💫</span> Atividade Recente
            </h2>
            <div className="space-y-3">
              {recentActivity.map((activity, idx) => {
                if (!activity) return null;
                const coverUrl = getFullUrl(activity.book.coverImagePath);
                return (
                  <Link
                    key={idx}
                    to={`/book/${activity.book.id}`}
                    className="flex bg-white/80 backdrop-blur-md rounded-[2rem] p-3 shadow-sm border border-white hover:border-[var(--lavender)]/30 hover:shadow-md transition-all animate-fade-in gap-4 items-center group active:scale-[0.98]"
                    style={{ animationDelay: `${0.7 + idx * 0.1}s` }}
                  >
                    <div className="w-14 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-sm bg-gradient-to-br from-[var(--lavender)]/20 to-[var(--blush)]/20 relative">
                      {coverUrl ? <img src={coverUrl} className="w-full h-full object-cover" /> : <BookOpen className="absolute inset-0 m-auto w-6 h-6 text-[var(--lavender)]/50" />}
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-bold text-[var(--text-main)] truncate pr-2 group-hover:text-[var(--lavender)] transition-colors">{activity.book.title}</h4>
                        <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-pastel)] px-2 py-1 rounded-lg font-bold flex-shrink-0">{activity.dateStr}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-wide px-3 py-1 rounded-xl ${activity.label === 'Finalizou' ? 'bg-[var(--mint)]/20 text-[var(--mint)]' : activity.label === 'Lendo' ? 'bg-[var(--peach)]/20 text-[var(--peach)]' : 'bg-gray-100 text-gray-500'}`}>
                          {activity.label}
                        </span>
                        {activity.progress.status === "lendo" && (
                          <span className="text-[11px] font-black text-[var(--lavender)] bg-[var(--lavender)]/10 px-2 py-1 rounded-lg">
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

        <div className="pt-8 text-center animate-fade-in" style={{ animationDelay: "0.8s" }}>
          <button
            onClick={handleLogout}
            className="text-xs text-red-500 font-bold px-6 py-3 rounded-2xl bg-red-50 hover:bg-red-100 hover:scale-105 active:scale-95 transition-all shadow-sm"
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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div 
        className="relative bg-card rounded-t-[32px] sm:rounded-[32px] w-full max-w-md p-6 space-y-6 shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-border rounded-full mx-auto sm:hidden mb-2" />
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-foreground">Editar Perfil</h3>
          <button onClick={onClose} className="p-2 bg-muted rounded-full hover:bg-border transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2 text-center">
            <label className="text-sm font-medium text-muted-foreground block">Avatar</label>
            <div className="flex flex-wrap justify-center gap-3">
              {AVATARS.map(a => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`w-12 h-12 text-2xl flex items-center justify-center rounded-full transition-all active:scale-95 ${avatar === a ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30 scale-110' : 'bg-muted hover:bg-border'}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground pl-1">Nome</label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full bg-muted border-none rounded-[16px] px-4 py-3.5 focus:ring-2 focus:ring-[var(--primary)] text-foreground font-medium"
              placeholder="Seu nome"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground pl-1">Biografia</label>
            <textarea 
              value={bio} 
              onChange={e => setBio(e.target.value)} 
              className="w-full bg-muted border-none rounded-[16px] px-4 py-3.5 focus:ring-2 focus:ring-[var(--primary)] text-foreground resize-none h-24"
              placeholder="Fale um pouco sobre você..."
              maxLength={100}
            />
          </div>
        </div>

        <button 
          onClick={() => onSave(name, bio, avatar)}
          disabled={!name.trim() || !bio.trim()}
          className={`w-full py-4 font-bold rounded-[16px] transition-all flex justify-center items-center gap-2 ${
            !name.trim() || !bio.trim()
              ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
              : "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/30 active:scale-95"
          }`}
        >
          <Check className="w-5 h-5" /> Salvar Perfil
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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div 
        className="relative bg-card rounded-t-[32px] sm:rounded-[32px] w-full max-w-lg h-[80vh] sm:h-auto sm:max-h-[85vh] flex flex-col shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 pb-4 border-b border-border/50 flex-shrink-0">
          <div className="w-12 h-1.5 bg-border rounded-full mx-auto sm:hidden mb-4" />
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-foreground">Editar Estante</h3>
              <p className="text-sm text-muted-foreground">Escolha quais livros exibir na sua estante ({selectedIds.size} selecionados)</p>
            </div>
            <button onClick={onClose} className="p-2 bg-muted rounded-full hover:bg-border transition-colors"><X className="w-4 h-4" /></button>
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
                className={`flex items-center gap-4 p-3 rounded-[16px] cursor-pointer transition-all ${isSelected ? 'bg-[var(--blush)]/20 border border-[var(--primary)]/30' : 'hover:bg-muted border border-transparent'}`}
              >
                <div className="w-12 h-16 rounded overflow-hidden flex-shrink-0 shadow-sm bg-gradient-to-br from-muted to-muted/50">
                  {coverUrl ? <img src={coverUrl} className="w-full h-full object-cover" /> : <BookOpen className="w-full h-full p-3 text-muted-foreground/30" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground truncate">{book.title}</h4>
                  <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-[var(--primary)] border-[var(--primary)] text-white' : 'border-border'}`}>
                  {isSelected && <Check className="w-4 h-4" />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-border/50 flex-shrink-0 bg-background/50 backdrop-blur-md rounded-b-[32px]">
          <button 
            onClick={() => onSave(Array.from(selectedIds))}
            disabled={selectedIds.size === 0}
            className={`w-full py-4 font-bold rounded-[16px] transition-all ${
              selectedIds.size === 0
                ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                : "bg-gradient-to-r from-[var(--primary)] to-[var(--peach)] text-white shadow-lg shadow-[var(--primary)]/30 active:scale-95"
            }`}
          >
            Salvar Estante
          </button>
        </div>
      </div>
    </div>
  );
}
