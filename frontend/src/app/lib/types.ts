/**
 * Tipos compartilhados do Books da Helo
 */

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  genre: string;
  rating: number;
  reviewCount: number;
  isPublic: boolean;
  coverColor: string;
  addedAt: number;
  pdfPath?: string | null;
  coverImagePath?: string | null;
  isUserBook?: boolean;
  reviews?: Review[];
  pages?: string[];
  pageCount?: number;
}

export interface Review {
  username: string;
  rating: number;
  comment: string;
}

export interface ReadingProgress {
  bookId: string;
  currentPage: number;
  totalPages: number;
  progress: number;
  status: "lendo" | "finalizado" | "pausado";
  startedAt: number;
  lastReadAt: number;
}

export interface Note {
  id: string;
  bookId: string;
  date: string;
  feedback: string;
  rating: number;
  createdAt: number;
}

export interface Stats {
  finished: number;
  reading: number;
  notesCount: number;
}

export interface UserProfile {
  username: string;
  bio: string;
  avatar: string;
  shelf: string[];
  pandinhas: number;
}

export interface ChatMessage {
  id: number;
  sender: string;
  receiver: string;
  content: string;
  shared_book_id?: string | null;
  is_read: number;
  created_at: number;
}

export interface Notifications {
  unreadCount: number;
  details: Record<string, number>;
}

export interface GlobalStatus {
  username: string;
  content: string;
  emote: string;
  updated_at: number;
}

// ─── Cover gradients ──────────────────────────────────────────────────────────

const COVER_GRADIENTS: Record<string, string> = {
  "lavender-mint": "from-[var(--lavender)] to-[var(--mint)]",
  "peach-lavender": "from-[var(--peach)] to-[var(--lavender)]",
  "mint-sky": "from-[var(--mint)] to-[var(--sky)]",
  "blush-lavender": "from-[var(--blush)] to-[var(--lavender)]",
  "peach-mint": "from-[var(--peach)] to-[var(--mint)]",
  "lemon-peach": "from-[var(--lemon)] to-[var(--peach)]",
  "sky-mint": "from-[var(--sky)] to-[var(--mint)]",
  "lavender-peach": "from-[var(--lavender)] to-[var(--peach)]",
  "mint-peach": "from-[var(--mint)] to-[var(--peach)]",
  "blush-mint": "from-[var(--blush)] to-[var(--mint)]",
};

const GRADIENT_LIST = Object.keys(COVER_GRADIENTS);

export function getCoverGradient(book: Pick<Book, "id" | "coverColor">): string {
  const key = book.coverColor ?? GRADIENT_LIST[parseInt(book.id, 10) % GRADIENT_LIST.length];
  return COVER_GRADIENTS[key] ?? "from-[var(--lavender)] to-[var(--mint)]";
}

export { getFullUrl } from "./api";

export function randomCoverColor(): string {
  return GRADIENT_LIST[Math.floor(Math.random() * GRADIENT_LIST.length)];
}
