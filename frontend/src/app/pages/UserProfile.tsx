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
    <div className="min-h-screen bg-[var(--bg-pastel)] pb-24">
      <div className="h-48 bg-gradient-to-br from-[var(--blush)]/40 to-[var(--lavender)]/40 relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 bg-white/60 backdrop-blur-md rounded-full hover:bg-white/80 transition-colors z-10"
        >
          <ArrowLeft className="w-6 h-6 text-[var(--text-main)]" />
        </button>
      </div>

      <div className="px-4 -mt-16 relative z-10">
        <div className="bg-white/80 backdrop-blur-lg rounded-[3rem] p-6 shadow-xl border border-white/50 text-center">
          <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-[var(--lavender)] to-[var(--blush)] mx-auto mb-4 flex items-center justify-center text-6xl shadow-lg border-4 border-white transform hover:scale-105 transition-transform duration-300">
            {profile.avatar || "👤"}
          </div>
          
          <h1 className="text-2xl font-black text-[var(--text-main)] mb-1">{profile.username}</h1>
          <p className="text-[var(--text-muted)] italic mb-4">"{profile.bio}"</p>

          <div className="flex justify-center gap-4 mb-6">
            <div className="bg-[var(--peach)]/20 px-4 py-2 rounded-2xl border border-[var(--peach)]/30 flex items-center gap-2">
              <span className="text-xl">🐼</span>
              <span className="font-bold text-[var(--peach)]">{profile.pandinhas} Pandinhas</span>
            </div>
            <button
              onClick={() => navigate(`/chat/${profile.username}`)}
              className="bg-[var(--lavender)] text-white px-6 py-2 rounded-2xl font-bold flex items-center gap-2 hover:bg-[var(--lavender)]/80 active:scale-95 transition-all shadow-md"
            >
              <MessageCircle className="w-5 h-5" /> Chat
            </button>
          </div>

          <div className="border-t border-[var(--lavender)]/20 pt-6">
            <h2 className="text-lg font-bold text-[var(--text-main)] mb-4 flex items-center justify-center gap-2">
              <BookOpen className="w-5 h-5 text-[var(--lavender)]" /> Estante de {profile.username}
            </h2>

            {shelfBooks.length === 0 ? (
              <p className="text-[var(--text-muted)] text-sm py-8">
                A estante está vazia por enquanto... 💨
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {shelfBooks.map(book => (
                  <div
                    key={book.id}
                    onClick={() => navigate(`/book/${book.id}`)}
                    className="aspect-[2/3] rounded-xl bg-white shadow-sm overflow-hidden border border-[var(--lavender)]/10 active:scale-95 transition-transform cursor-pointer relative"
                  >
                    {book.coverImagePath ? (
                      <img src={getFullUrl(book.coverImagePath)!} className="w-full h-full object-cover" alt={book.title} />
                    ) : (
                      <div className="w-full h-full bg-[var(--lavender)]/20 flex items-center justify-center p-2 text-[10px] text-center font-bold">
                        {book.title}
                      </div>
                    )}
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
