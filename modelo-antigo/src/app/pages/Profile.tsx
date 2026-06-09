import { useState, useEffect } from "react";
import { BookOpen, Clock, Award, Pencil, X, Check } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { fetchBooks, fetchAllProgress, fetchStats, updateProfile } from "../lib/api";
import { getCoverGradient, getFullUrl } from "../lib/types";
import type { Book, ReadingProgress, Stats } from "../lib/types";

const AVATARS = ["🐼", "🐼", "🐼", "🐼", "🐼", "🐼", "🐼", "🐼", "🐼"];

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
    Promise.all([
      fetchBooks().catch(() => []),
      fetchAllProgress().catch(() => []),
      fetchStats().catch(() => ({ finished: 0, reading: 0, notesCount: 0 }))
    ])
      .then(([b, p, s]) => {
        const booksList = b || [];
        const progressList = p || [];
        const statsData = s || { finished: 0, reading: 0, notesCount: 0 };

        setBooks(booksList);
        setProgress(progressList);
        setStats(statsData);
        setIsLoading(false);

        if (shelfBookIds.length === 0 && booksList.length > 0) {
          const defaultShelf = booksList
            .filter(book => progressList.some(prog => prog.bookId === book.id))
            .map(book => book.id)
            .slice(0, 9);
          setShelfBookIds(defaultShelf);
          localStorage.setItem("profile-shelf", JSON.stringify(defaultShelf));
        }
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
    <div className="min-h-screen bg-transparent pb-32">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        
        {/* Passport Registry Card Container */}
        <div className="border-4 border-black p-6 space-y-6 relative">
          
          {/* Card Stamp/Title Header */}
          <div className="border-b-2 border-black pb-4 flex justify-between items-start">
            <div>
              <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">// SISTEMA BIBLIOTECÁRIO</span>
              <h2 className="text-xl font-black uppercase tracking-wider m-0 leading-none">FICHA REGISTRAL DE LEITOR</h2>
            </div>
            <button 
              onClick={() => setIsEditingProfile(true)}
              className="px-3 py-1.5 border border-black text-[10px] font-black uppercase hover:bg-black hover:text-white"
            >
              [ EDITAR FICHA ]
            </button>
          </div>

          {/* Split Profile Panel */}
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-stretch">
            {/* Foto/Avatar Box */}
            <div className="w-32 h-32 border-2 border-black flex-shrink-0 bg-gray-50 flex items-center justify-center text-7xl relative">
              {userAvatar}
              <div className="absolute bottom-1 right-1 bg-black text-white text-[9px] px-1 font-bold">FOTO</div>
            </div>

            {/* Official Registration Details */}
            <div className="flex-grow flex flex-col justify-between py-1 space-y-2 text-xs font-bold w-full">
              <div className="border-b border-dashed border-gray-300 pb-1.5 flex justify-between">
                <span className="text-gray-500">NOME DO CADASTRADO:</span>
                <span className="text-black uppercase">{userName}</span>
              </div>
              <div className="border-b border-dashed border-gray-300 pb-1.5 flex justify-between">
                <span className="text-gray-500">REGISTRO DE ESTADO:</span>
                <span className="text-black uppercase">LEITOR ATIVO</span>
              </div>
              <div className="border-b border-dashed border-gray-300 pb-1.5 flex justify-between">
                <span className="text-gray-500">CÓDIGO DE CONTROLE:</span>
                <span className="text-black font-mono">#0927-B</span>
              </div>
            </div>
          </div>

          {/* Biografia Registrada */}
          <div className="border border-black p-4 bg-gray-50/50 space-y-2">
            <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">// BIOGRAFIA REGISTRADA</span>
            <p className="text-xs font-bold italic m-0">"{userBio}"</p>
          </div>

        </div>

        {/* Official Stats Table Card */}
        <div className="border border-black divide-y sm:divide-y-0 sm:divide-x border-collapse divide-black grid grid-cols-1 sm:grid-cols-3 text-center">
          {statCards.map(({ icon: Icon, label, value }) => (
            <div key={label} className="p-4 flex flex-col items-center justify-center gap-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-gray-500">{label}</span>
              <span className="text-2xl font-black tracking-widest">{value}</span>
            </div>
          ))}
        </div>

        {/* Estante Card File Index */}
        <div className="border border-black p-6 space-y-4">
          <div className="border-b border-black pb-3 flex justify-between items-center">
            <h3 className="text-sm font-black uppercase tracking-wider m-0">ESTANTE FIEL (LIVROS EM DESTAQUE)</h3>
            <button 
              onClick={() => setIsEditingShelf(true)}
              className="px-3 py-1 border border-black text-[9px] font-black uppercase hover:bg-black hover:text-white"
            >
              [ ORGANIZAR ESTANTE ]
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
                    className="group border border-black hover:border-double aspect-[2/3] relative bg-white block overflow-hidden"
                  >
                    {coverUrl ? (
                      <img src={coverUrl} alt={book.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-3 text-[10px] text-center font-black uppercase bg-gray-50">
                        {book.title}
                      </div>
                    )}
                    {/* Index label tag */}
                    <div className="absolute top-1 left-1 bg-black text-white text-[8px] font-mono px-1 font-bold leading-none opacity-80 group-hover:opacity-100">
                      I-{idx + 1}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="border-2 border-dashed border-black rounded-none p-8 text-center space-y-3">
              <div className="text-4xl">🐼</div>
              <p className="text-xs font-bold text-gray-500">Sua estante registradora está vazia.</p>
              <button 
                onClick={() => setIsEditingShelf(true)}
                className="text-xs font-black uppercase text-black hover:underline"
              >
                [ VINCULAR LIVROS MÁGICOS 🐼 ]
              </button>
            </div>
          )}
        </div>

        {/* Diário de Bordo Timeline (Recent Activity) */}
        {recentActivity.length > 0 && (
          <div className="border border-black p-6 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider border-b border-black pb-3 m-0">
              DIÁRIO DE BORDO (ATIVIDADES RECENTES)
            </h3>
            
            <div className="space-y-4 font-mono text-xs">
              {recentActivity.map((activity, idx) => {
                if (!activity) return null;
                return (
                  <div key={idx} className="flex gap-4 items-start border-l border-black relative">
                    {/* Timeline bullet symbol */}
                    <div className="absolute -left-1.5 top-1.5 w-3.5 h-3.5 bg-white border border-black flex items-center justify-center text-[8px] font-bold">
                      &bull;
                    </div>
                    
                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-center gap-2 mb-1">
                        <Link to={`/book/${activity.book.id}`} className="font-black hover:underline truncate">
                          &rarr; {activity.book.title}
                        </Link>
                        <span className="text-[9px] font-bold bg-black text-white px-1.5 py-0.5">{activity.dateStr}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="uppercase font-bold text-gray-600 bg-gray-100 px-1 border border-gray-300">
                          {activity.label}
                        </span>
                        {activity.progress.status === "lendo" && (
                          <span className="font-bold">
                            PROGRESSO: {activity.progress.progress}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Official Terminate Button */}
        <div className="pt-6 border-t border-black text-center">
          <button
            onClick={handleLogout}
            className="px-6 py-3 border border-black bg-black text-white hover:bg-white hover:text-black font-black text-xs uppercase tracking-widest"
          >
            [ DESCONECTAR REGISTRO 🐼 ]
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
