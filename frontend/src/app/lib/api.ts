/**
 * API Wrapper com suporte Offline (LocalStorage fallback)
 */

import { API_BASE_URL } from "./config";

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

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Livros
export const fetchBooks = () => request("GET", "/books");
export const fetchBook = (id: string) => request("GET", `/books/${id}`);

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
  const userId = localStorage.getItem("books-username") || "anonymous";
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

export const editBook = (id: string, data: any) => request("PUT", `/books/${id}`, data);
export const deleteBook = (id: string) => request("DELETE", `/books/${id}`);

// Progresso e Status
export const fetchAllProgress = () => request("GET", "/progress");
export const fetchProgress = (bookId: string) => request("GET", `/progress/${bookId}`);
export async function saveProgress(p: any) {
  return request("PUT", `/progress/${p.bookId}`, p);
}

// Autenticação
export const login = (username: string, password: string) => 
  request("POST", "/auth/login", { username, password });
export const register = (username: string, password: string) => 
  request("POST", "/auth/register", { username, password });

// Favoritos
export const fetchSavedIds = () => request("GET", "/saved");
export const toggleSaved = (bookId: string, isSaved: boolean) => 
  request(isSaved ? "DELETE" : "POST", `/saved/${bookId}`);

// Usuários e Perfil
export const fetchAllUsers = () => request("GET", "/users");
export const fetchUserProfile = (username: string) => request("GET", `/users/${username}`);
export const updateProfile = (bio: string, avatar: string, shelf: string[]) => 
  request("PUT", "/auth/me", { bio, avatar, shelf });
export const fetchStats = () => request("GET", "/stats");

// Notas e Diário
export const fetchBookNotes = (bookId: string) => request("GET", `/notes/book/${bookId}`);
export const addNote = (data: any) => request("POST", "/notes", data);
export const deleteNote = (id: string) => request("DELETE", `/notes/${id}`);

// Chat e Mensagens
export const fetchChat = (target: string) => request("GET", `/chat/${target}`);
export const fetchMessages = (target: string) => request("GET", `/chat/${target}`);
export const sendMessage = (target: string, content: string, bookId?: string) => 
  request("POST", `/chat/${target}`, { content, sharedBookId: bookId || null });
export const setNickname = (target: string, nickname: string) => 
  request("POST", `/chat/nickname/${target}`, { nickname });
export const fetchNotifications = () => request("GET", "/notifications");

// Global Status (Shoutbox)
export const fetchGlobalStatus = () => request("GET", "/status");
export const updateGlobalStatus = (content: string, emote: string) => 
  request("POST", "/status", { content, emote });

