import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { fetchUserProfile, fetchBooks } from "../lib/api";
import { UserProfile as UserProfileType, Book, getFullUrl } from "../lib/types";
import { ArrowLeft, MessageCircle, BookOpen, Heart } from "lucide-react";

export function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!username) return;
      try {
        const [prof, books] = await Promise.all([
          fetchUserProfile(username),
          fetchBooks()
        ]);
        setProfile(prof);
        setAllBooks(books);
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [username]);

  if (isLoading) return (
    <div className="min-h-screen bg-[var(--bg-pastel)] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[var(--lavender)] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-[var(--bg-pastel)] p-4 text-center">
      <p>Usuário não encontrado. 🐾</p>
      <button onClick={() => navigate(-1)} className="mt-4 text-[var(--lavender)] font-bold underline">Voltar</button>
    </div>
  );

  // Filtrar livros da estante dele que existem no sistema
  const shelfBooks = allBooks.filter(b => profile.shelf.includes(b.id));

  return (
    <div className="min-h-screen bg-[var(--bg-pastel)] pb-24 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-[var(--lavender)]/20 to-transparent pointer-events-none" />
      <div className="absolute top-20 right-10 text-4xl opacity-30 animate-float" style={{ animationDelay: "0s" }}>✨</div>
      <div className="absolute top-40 left-10 text-3xl opacity-30 animate-float" style={{ animationDelay: "1s" }}>💕</div>
      <div className="absolute top-10 left-1/2 text-2xl opacity-20 animate-float" style={{ animationDelay: "2s" }}>🐼</div>

      <div className="h-56 bg-gradient-to-br from-[var(--blush)]/50 via-[var(--lavender)]/40 to-[var(--peach)]/30 relative shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 p-3 bg-white/80 backdrop-blur-md rounded-full shadow-lg hover:shadow-xl hover:bg-white active:scale-95 transition-all z-10"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--text-main)]" />
        </button>
      </div>

      <div className="px-4 -mt-24 relative z-10 max-w-2xl mx-auto">
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl border border-white/60 text-center animate-scale-in">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--lavender)] to-[var(--blush)] rounded-[2.5rem] blur-lg opacity-40 animate-pulse-soft" />
            <div className="w-36 h-36 relative rounded-[2.5rem] bg-gradient-to-br from-[var(--lavender)] to-[var(--blush)] mx-auto flex items-center justify-center text-7xl shadow-xl border-4 border-white transform hover:rotate-3 hover:scale-105 transition-all duration-300">
              {profile.avatar || "👤"}
            </div>
          </div>
          
          <h1 className="text-3xl font-black text-[var(--text-main)] mb-2">{profile.username}</h1>
          <p className="text-[var(--text-muted)] text-[15px] italic mb-6 px-4">
            "{profile.bio || "Vivendo milhares de vidas através dos livros..."}"
          </p>

          <div className="flex justify-center items-stretch gap-3 mb-8">
            <div className="bg-gradient-to-r from-[var(--peach)]/20 to-[var(--blush)]/20 px-5 py-3 rounded-2xl border border-[var(--peach)]/30 flex items-center gap-2 shadow-sm">
              <span className="text-2xl animate-bounce-in">🐼</span>
              <div className="flex flex-col items-start">
                <span className="font-black text-[var(--text-main)] text-sm leading-tight">{profile.pandinhas}</span>
                <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Pandinhas</span>
              </div>
            </div>
            <button
              onClick={() => navigate(`/chat/${profile.username}`)}
              className="flex-1 bg-gradient-to-r from-[var(--primary)] to-[var(--lavender)] text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-[var(--primary)]/30 hover:shadow-xl"
            >
              <MessageCircle className="w-5 h-5" /> Iniciar Chat
            </button>
          </div>

          <div className="border-t border-[var(--lavender)]/20 pt-8 mt-2">
            <h2 className="text-xl font-black text-[var(--text-main)] mb-6 flex items-center justify-center gap-2">
              <BookOpen className="w-6 h-6 text-[var(--lavender)]" /> Estante Mágica
            </h2>

            {shelfBooks.length === 0 ? (
              <div className="bg-[var(--bg-pastel)]/50 rounded-3xl p-8 border-2 border-dashed border-[var(--lavender)]/30">
                <div className="text-4xl mb-3 opacity-50 grayscale">📚</div>
                <p className="text-[var(--text-muted)] font-medium">A estante está vazia por enquanto... 💨</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {shelfBooks.map((book, index) => (
                  <div
                    key={book.id}
                    onClick={() => navigate(`/book/${book.id}`)}
                    className="group relative aspect-[2/3] rounded-2xl bg-white shadow-md overflow-hidden border border-white/50 cursor-pointer animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {book.coverImagePath ? (
                      <img src={getFullUrl(book.coverImagePath)!} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={book.title} />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[var(--lavender)]/20 to-[var(--blush)]/20 flex items-center justify-center p-3 text-xs text-center font-bold text-[var(--text-main)] transition-transform duration-500 group-hover:scale-105">
                        {book.title}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="bg-white/90 p-2 rounded-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        <BookOpen className="w-5 h-5 text-[var(--primary)]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
