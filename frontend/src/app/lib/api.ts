/**
 * API Wrapper com suporte Offline (LocalStorage fallback)
 */

import { API_BASE_URL } from "./config";
import type { BookChapter } from "./types";

// --- HELPERS E INTERRUPTOR MODO OFFLINE ---
export function isOfflineMode(): boolean {
  return false;
}

export function setOfflineMode(value: boolean): void {
  localStorage.setItem("offline-mode", "false");
}

// --- INDEXEDDB PARA ARMAZENAMENTO DE ARQUIVOS GRANDES ---
function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("BookzinhosOffline", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function storeOfflineFile(key: string, file: Blob): Promise<void> {
  return openOfflineDB().then(db => {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      const store = tx.objectStore("files");
      const req = store.put(file, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

function getOfflineFile(key: string): Promise<Blob | null> {
  return openOfflineDB().then(db => {
    return new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction("files", "readonly");
      const store = tx.objectStore("files");
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  });
}

function deleteOfflineFile(key: string): Promise<void> {
  return openOfflineDB().then(db => {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      const store = tx.objectStore("files");
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

const objectUrlCache = new Map<string, string>();

async function resolveLocalPath(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("local://")) {
    const key = path.substring(8);
    if (objectUrlCache.has(key)) {
      return objectUrlCache.get(key)!;
    }
    try {
      const blob = await getOfflineFile(key);
      if (blob) {
        const url = URL.createObjectURL(blob);
        objectUrlCache.set(key, url);
        return url;
      }
    } catch (err) {
      console.error("Erro ao carregar arquivo offline do IndexedDB:", err);
    }
    return null;
  }
  return path;
}

async function resolveBookPaths(book: any) {
  if (!book) return book;
  const newBook = { ...book };
  if (newBook.pdfPath) {
    newBook.pdfPath = await resolveLocalPath(newBook.pdfPath);
  }
  if (newBook.coverImagePath) {
    newBook.coverImagePath = await resolveLocalPath(newBook.coverImagePath);
  }
  return newBook;
}

async function resolveBooksPaths(books: any[]) {
  if (!books) return [];
  return Promise.all(books.map(resolveBookPaths));
}

// --- DADOS INICIAIS MOCKADOS OFFLINE ---
const LOCAL_USERS = [
  { username: "Caio", bio: "Lendo clássicos offline 📖", avatar: "🐼", shelf: ["pequeno-principe"], pandinhas: 10 },
  { username: "Helo", bio: "Apaixonada por histórias que transformam 💕", avatar: "🎀", shelf: ["dom-casmurro"], pandinhas: 15 }
];

const INITIAL_LOCAL_BOOKS: any[] = [];

async function request(method: string, path: string, body?: any) {
  const url = `${API_BASE_URL}${path}`;
  const userId = localStorage.getItem("books-username") || "anonymous";

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// --- LIVROS ---
export async function fetchBooks() {
  if (isOfflineMode()) {
    let booksStr = localStorage.getItem("local-books");
    if (!booksStr) {
      localStorage.setItem("local-books", JSON.stringify(INITIAL_LOCAL_BOOKS));
      booksStr = JSON.stringify(INITIAL_LOCAL_BOOKS);
    }
    const parsed = JSON.parse(booksStr);

    // Clean up offline duplicates (keeping oldest)
    const uniqueMap = new Map<string, any>();
    const sorted = [...parsed].sort((a: any, b: any) => a.addedAt - b.addedAt);
    sorted.forEach((book: any) => {
      const key = `${book.title.trim().toLowerCase()}|${(book.author || "").trim().toLowerCase()}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, book);
      }
    });
    const cleaned = Array.from(uniqueMap.values());
    if (cleaned.length !== parsed.length) {
      localStorage.setItem("local-books", JSON.stringify(cleaned));
    }

    return resolveBooksPaths(cleaned);
  }
  return request("GET", "/books");
}

export async function fetchBook(id: string) {
  if (isOfflineMode()) {
    let booksStr = localStorage.getItem("local-books");
    if (!booksStr) {
      localStorage.setItem("local-books", JSON.stringify(INITIAL_LOCAL_BOOKS));
      booksStr = JSON.stringify(INITIAL_LOCAL_BOOKS);
    }
    const parsed = JSON.parse(booksStr);
    const b = parsed.find((x: any) => x.id === id);
    if (!b) return null;
    return resolveBookPaths(b);
  }
  return request("GET", `/books/${id}`);
}

export async function uploadBook(data: {
  title: string;
  author: string;
  description: string;
  genre: string;
  isPublic: boolean;
  coverColor: string;
  pdfFile: File;
  coverFile?: File;
}) {
  // Check for duplicate title and author first
  try {
    const existingBooks = await fetchBooks();
    const duplicate = existingBooks.find(
      (b: any) => 
        b.title.trim().toLowerCase() === data.title.trim().toLowerCase() &&
        (b.author || "").trim().toLowerCase() === (data.author || "").trim().toLowerCase()
    );
    if (duplicate) {
      throw new Error("Você já possui um livro com este título e autor!");
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("Você já possui")) {
      throw err;
    }
  }

  if (isOfflineMode()) {
    const id = "local_" + Date.now();
    await storeOfflineFile(`${id}_pdf`, data.pdfFile);
    if (data.coverFile) {
      await storeOfflineFile(`${id}_cover`, data.coverFile);
    }

    const newBook = {
      id,
      title: data.title,
      author: data.author || "Autor Desconhecido",
      description: data.description || "",
      genre: data.genre || "Outros",
      rating: 5,
      reviewCount: 0,
      isPublic: false,
      coverColor: data.coverColor,
      addedAt: Date.now(),
      pdfPath: `local://${id}_pdf`,
      coverImagePath: data.coverFile ? `local://${id}_cover` : null,
      isUserBook: true,
      reviews: [],
      pages: []
    };

    let booksStr = localStorage.getItem("local-books");
    const list = booksStr ? JSON.parse(booksStr) : [...INITIAL_LOCAL_BOOKS];
    list.unshift(newBook);
    localStorage.setItem("local-books", JSON.stringify(list));
    return resolveBookPaths(newBook);
  }

  const userId = localStorage.getItem("books-username") || "anonymous";

  try {
    // 1. Tenta obter URLs pré-assinadas para o upload direto para o S3
    const presignedRes = await fetch(`${API_BASE_URL}/books/presigned-url`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-user-id": userId
      },
      body: JSON.stringify({
        fileName: data.pdfFile.name,
        fileType: "application/pdf"
      })
    });

    if (presignedRes.ok) {
      const pdfS3Data = await presignedRes.json();
      
      // Upload do PDF direto para o S3
      const pdfUploadRes = await fetch(pdfS3Data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: data.pdfFile
      });
      if (!pdfUploadRes.ok) throw new Error("Erro no upload do PDF para o S3");

      let coverUrl = null;
      if (data.coverFile) {
        // Obter URL assinada para a capa
        const coverPresignedRes = await fetch(`${API_BASE_URL}/books/presigned-url`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-user-id": userId
          },
          body: JSON.stringify({
            fileName: data.coverFile.name,
            fileType: data.coverFile.type
          })
        });

        if (coverPresignedRes.ok) {
          const coverS3Data = await coverPresignedRes.json();
          const coverUploadRes = await fetch(coverS3Data.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": data.coverFile.type },
            body: data.coverFile
          });
          if (coverUploadRes.ok) {
            coverUrl = coverS3Data.downloadUrl;
          }
        }
      }

      // Envia os metadados e as URLs do S3 como JSON para o servidor
      const serverRes = await fetch(`${API_BASE_URL}/books`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": userId
        },
        body: JSON.stringify({
          title: data.title,
          author: data.author,
          description: data.description,
          genre: data.genre,
          isPublic: String(data.isPublic),
          coverColor: data.coverColor,
          pdfUrl: pdfS3Data.downloadUrl,
          coverUrl
        })
      });

      if (!serverRes.ok) throw new Error(await serverRes.text());
      return serverRes.json();
    }
  } catch (err) {
    console.warn("Upload via S3 falhou ou não está configurado. Usando fallback tradicional...", err);
  }

  // FALLBACK: Upload multipart via Express (com limites do servidor)
  const form = new FormData();
  form.append("title", data.title);
  form.append("author", data.author);
  form.append("description", data.description);
  form.append("genre", data.genre);
  form.append("isPublic", String(data.isPublic));
  form.append("coverColor", data.coverColor);
  form.append("pdf", data.pdfFile);
  if (data.coverFile) form.append("cover", data.coverFile);

  const res = await fetch(`${API_BASE_URL}/books`, {
    method: "POST",
    headers: { "x-user-id": userId },
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function editBook(id: string, data: any) {
  if (isOfflineMode()) {
    let booksStr = localStorage.getItem("local-books");
    const list = booksStr ? JSON.parse(booksStr) : [...INITIAL_LOCAL_BOOKS];
    const idx = list.findIndex((x: any) => x.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...data };
      localStorage.setItem("local-books", JSON.stringify(list));
      return resolveBookPaths(list[idx]);
    }
    return null;
  }
  return request("PUT", `/books/${id}`, data);
}

export async function deleteBook(id: string) {
  if (isOfflineMode()) {
    let booksStr = localStorage.getItem("local-books");
    const list = booksStr ? JSON.parse(booksStr) : [...INITIAL_LOCAL_BOOKS];
    const filtered = list.filter((x: any) => x.id !== id);
    localStorage.setItem("local-books", JSON.stringify(filtered));
    await deleteOfflineFile(`${id}_pdf`);
    await deleteOfflineFile(`${id}_cover`);
    return { ok: true };
  }
  return request("DELETE", `/books/${id}`);
}

// --- PROGRESSO E STATUS ---
export async function fetchAllProgress() {
  if (isOfflineMode()) {
    const progStr = localStorage.getItem("local-progress");
    return progStr ? JSON.parse(progStr) : [];
  }
  return request("GET", "/progress");
}

export async function fetchProgress(bookId: string) {
  if (isOfflineMode()) {
    const progStr = localStorage.getItem("local-progress");
    const list = progStr ? JSON.parse(progStr) : [];
    return list.find((x: any) => x.bookId === bookId) || null;
  }
  return request("GET", `/progress/${bookId}`);
}

export async function saveProgress(p: any) {
  if (isOfflineMode()) {
    const progStr = localStorage.getItem("local-progress");
    const list = progStr ? JSON.parse(progStr) : [];
    const idx = list.findIndex((x: any) => x.bookId === p.bookId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...p, lastReadAt: Date.now() };
    } else {
      list.push({ ...p, startedAt: Date.now(), lastReadAt: Date.now() });
    }
    localStorage.setItem("local-progress", JSON.stringify(list));
    return p;
  }
  return request("PUT", `/progress/${p.bookId}`, p);
}

// --- AUTENTICAÇÃO ---
export async function login(username: string, password: string) {
  if (isOfflineMode()) {
    localStorage.setItem("books-username", username);
    localStorage.setItem("books-avatar", "🐼");
    localStorage.setItem("books-bio", "Modo Offline Ativo 🐾");
    return { username, bio: "Modo Offline Ativo 🐾", avatar: "🐼", shelf: [] };
  }
  return request("POST", "/auth/login", { username, password });
}

export async function register(username: string, password: string) {
  if (isOfflineMode()) {
    localStorage.setItem("books-username", username);
    localStorage.setItem("books-avatar", "🐼");
    localStorage.setItem("books-bio", "Modo Offline Ativo 🐾");
    return { username, bio: "Modo Offline Ativo 🐾", avatar: "🐼", shelf: [] };
  }
  return request("POST", "/auth/register", { username, password });
}

// --- FAVORITOS ---
export async function fetchSavedIds() {
  if (isOfflineMode()) {
    const savedStr = localStorage.getItem("local-saved-ids");
    return savedStr ? JSON.parse(savedStr) : [];
  }
  return request("GET", "/saved");
}

export async function toggleSaved(bookId: string, isSaved: boolean) {
  if (isOfflineMode()) {
    const savedStr = localStorage.getItem("local-saved-ids");
    let list = savedStr ? JSON.parse(savedStr) : [];
    if (isSaved) {
      list = list.filter((x: any) => x !== bookId);
    } else {
      if (!list.includes(bookId)) list.push(bookId);
    }
    localStorage.setItem("local-saved-ids", JSON.stringify(list));
    return !isSaved;
  }
  return request(isSaved ? "DELETE" : "POST", `/saved/${bookId}`);
}

// --- USUÁRIOS E PERFIL ---
export async function fetchAllUsers() {
  if (isOfflineMode()) {
    return LOCAL_USERS;
  }
  return request("GET", "/users");
}

export async function fetchUserProfile(username: string) {
  if (isOfflineMode()) {
    const u = LOCAL_USERS.find(x => x.username.toLowerCase() === username.toLowerCase());
    if (u) return u;
    const myName = localStorage.getItem("books-username") || "Leitora";
    const myBio = localStorage.getItem("books-bio") || "Apaixonada por histórias que transformam";
    const myAvatar = localStorage.getItem("books-avatar") || "🐼";
    const shelfStr = localStorage.getItem("profile-shelf");
    const shelf = shelfStr ? JSON.parse(shelfStr) : [];
    return { username: myName, bio: myBio, avatar: myAvatar, shelf, pandinhas: 5 };
  }
  return request("GET", `/users/${username}`);
}

export async function updateProfile(bio: string, avatar: string, shelf: string[]) {
  if (isOfflineMode()) {
    localStorage.setItem("books-bio", bio);
    localStorage.setItem("books-avatar", avatar);
    localStorage.setItem("profile-shelf", JSON.stringify(shelf));
    return { ok: true };
  }
  return request("PUT", "/auth/me", { bio, avatar, shelf });
}

export async function fetchStats() {
  if (isOfflineMode()) {
    const progStr = localStorage.getItem("local-progress");
    const progress = progStr ? JSON.parse(progStr) : [];
    const notesStr = localStorage.getItem("local-notes");
    const notes = notesStr ? JSON.parse(notesStr) : [];
    const finished = progress.filter((p: any) => p.status === "finalizado").length;
    const reading = progress.filter((p: any) => p.status === "lendo").length;
    return { finished, reading, notesCount: notes.length };
  }
  return request("GET", "/stats");
}

// --- NOTAS E DIÁRIO ---
export async function fetchBookNotes(bookId: string) {
  if (isOfflineMode()) {
    const notesStr = localStorage.getItem("local-notes");
    const list = notesStr ? JSON.parse(notesStr) : [];
    return list.filter((n: any) => n.bookId === bookId);
  }
  return request("GET", `/notes/book/${bookId}`);
}

export async function addNote(data: any) {
  if (isOfflineMode()) {
    const now = new Date();
    const dateLabel = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const id = "note-" + Date.now();
    const newNote = {
      id,
      bookId: data.bookId,
      date: dateLabel,
      feedback: data.feedback,
      rating: data.rating,
      createdAt: Date.now()
    };
    const notesStr = localStorage.getItem("local-notes");
    const list = notesStr ? JSON.parse(notesStr) : [];
    list.unshift(newNote);
    localStorage.setItem("local-notes", JSON.stringify(list));
    return newNote;
  }
  return request("POST", "/notes", data);
}

export async function deleteNote(id: string) {
  if (isOfflineMode()) {
    const notesStr = localStorage.getItem("local-notes");
    const list = notesStr ? JSON.parse(notesStr) : [];
    const filtered = list.filter((n: any) => n.id !== id);
    localStorage.setItem("local-notes", JSON.stringify(filtered));
    return { ok: true };
  }
  return request("DELETE", `/notes/${id}`);
}

// --- CHAT E MENSAGENS ---
export async function fetchChat(target: string) {
  if (isOfflineMode()) {
    const chatStr = localStorage.getItem(`local-chat-${target.toLowerCase()}`);
    const messages = chatStr ? JSON.parse(chatStr) : [];
    const nick = localStorage.getItem(`local-nickname-${target.toLowerCase()}`);
    return { messages, nickname: nick };
  }
  return request("GET", `/chat/${target}`);
}

export async function fetchMessages(target: string) {
  if (isOfflineMode()) {
    const chatStr = localStorage.getItem(`local-chat-${target.toLowerCase()}`);
    return chatStr ? JSON.parse(chatStr) : [];
  }
  return request("GET", `/chat/${target}`);
}

export async function sendMessage(target: string, content: string, bookId?: string) {
  if (isOfflineMode()) {
    const myName = localStorage.getItem("books-username") || "Você";
    const newMsg = {
      id: Date.now(),
      sender: myName,
      receiver: target,
      content,
      shared_book_id: bookId || null,
      is_read: 1,
      created_at: Date.now()
    };
    const chatKey = `local-chat-${target.toLowerCase()}`;
    const chatStr = localStorage.getItem(chatKey);
    const list = chatStr ? JSON.parse(chatStr) : [];
    list.push(newMsg);
    localStorage.setItem(chatKey, JSON.stringify(list));

    if (target.toLowerCase() === "helo" || target.toLowerCase() === "caio") {
      setTimeout(() => {
        const replies = [
          "Que legal! Vou dar uma olhada nesse livro 🐾",
          "Adorei a recomendação! ✨",
          "Ah! Esse livro parece maravilhoso! 💕",
          "Obrigado por compartilhar comigo! 🐼",
          "Nossa, que demais! Já salvei na minha lista 📖"
        ];
        const replyContent = replies[Math.floor(Math.random() * replies.length)];
        const replyMsg = {
          id: Date.now() + 1,
          sender: target,
          receiver: myName,
          content: replyContent,
          shared_book_id: null,
          is_read: 0,
          created_at: Date.now()
        };
        const currentChat = localStorage.getItem(chatKey);
        const currentList = currentChat ? JSON.parse(currentChat) : [];
        currentList.push(replyMsg);
        localStorage.setItem(chatKey, JSON.stringify(currentList));
      }, 1000);
    }
    return { ok: true };
  }
  return request("POST", `/chat/${target}`, { content, sharedBookId: bookId || null });
}

export async function setNickname(target: string, nickname: string) {
  if (isOfflineMode()) {
    localStorage.setItem(`local-nickname-${target.toLowerCase()}`, nickname);
    return { ok: true };
  }
  return request("POST", `/chat/nickname/${target}`, { nickname });
}

export async function fetchNotifications() {
  if (isOfflineMode()) {
    return { unreadCount: 0, details: {} };
  }
  return request("GET", "/notifications");
}

// --- GLOBAL STATUS (SHOUTBOX) ---
export async function fetchGlobalStatus() {
  if (isOfflineMode()) {
    const statusStr = localStorage.getItem("local-status");
    if (statusStr) return JSON.parse(statusStr);
    return { username: "Sistema", content: "Bem-vindo ao modo Offline! 🐾", emote: "🐼", updated_at: Date.now() };
  }
  return request("GET", "/status");
}

export async function updateGlobalStatus(content: string, emote: string) {
  if (isOfflineMode()) {
    const username = localStorage.getItem("books-username") || "Você";
    const newStatus = { username, content, emote, updated_at: Date.now() };
    localStorage.setItem("local-status", JSON.stringify(newStatus));
    return newStatus;
  }
  return request("POST", "/status", { content, emote });
}

export async function fetchChapters(bookId: string): Promise<BookChapter[]> {
  if (isOfflineMode()) {
    return [];
  }
  return (await request("GET", `/books/${bookId}/chapters`)) || [];
}

export async function saveChapter(bookId: string, startPage: number, title: string): Promise<any> {
  if (isOfflineMode()) {
    return { success: true };
  }
  return request("POST", `/books/${bookId}/chapters`, { startPage, title });
}

export async function deleteChapter(bookId: string, startPage: number): Promise<any> {
  if (isOfflineMode()) {
    return { success: true };
  }
  return request("DELETE", `/books/${bookId}/chapters/${startPage}`);
}
