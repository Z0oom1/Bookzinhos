/**
 * API Wrapper com suporte Offline (LocalStorage fallback)
 */

import { API_BASE_URL } from "./config";

const OFFLINE_KEY_PREFIX = "offline_cache_";

async function request(method: string, path: string, body?: any) {
  const url = `${API_BASE_URL}${path}`;
  const userId = localStorage.getItem("books-username") || "anonymous";

  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) throw new Error(await res.text());
    
    const data = await res.json();
    
    // Se for um GET bem sucedido, salva no cache offline
    if (method === "GET") {
      localStorage.setItem(OFFLINE_KEY_PREFIX + path, JSON.stringify(data));
    }
    
    return data;
  } catch (err) {
    console.warn(`Modo Offline ativado para ${path}`);
    
    // Tenta pegar do cache offline se falhar (sem internet)
    if (method === "GET") {
      const cached = localStorage.getItem(OFFLINE_KEY_PREFIX + path);
      if (cached) return JSON.parse(cached);
    }
    
    throw err;
  }
}

// Livros
export const fetchBooks = () => request("GET", "/books");
export const fetchBook = (id: string) => request("GET", `/books/${id}`);
export const uploadBook = (data: any) => request("POST", "/books", data);
export const editBook = (id: string, data: any) => request("PUT", `/books/${id}`, data);
export const deleteBook = (id: string) => request("DELETE", `/books/${id}`);

// Progresso e Status
export const fetchAllProgress = () => request("GET", "/progress");
export const fetchProgress = (bookId: string) => request("GET", `/progress/${bookId}`);
export async function saveProgress(p: any) {
  localStorage.setItem(OFFLINE_KEY_PREFIX + `/progress/${p.bookId}`, JSON.stringify(p));
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
  request("PUT", "/users", { bio, avatar, shelf });
export const setNickname = (nickname: string) => request("PUT", "/users/nickname", { nickname });
export const fetchStats = () => request("GET", "/users/stats");

// Notas e Diário
export const fetchBookNotes = (bookId: string) => request("GET", `/notes/${bookId}`);
export const addNote = (data: any) => request("POST", "/notes", data);
export const deleteNote = (id: string) => request("DELETE", `/notes/${id}`);

// Chat e Mensagens
export const fetchChat = (target: string) => request("GET", `/chat/${target}`);
export const fetchMessages = (target: string) => request("GET", `/chat/${target}`);
export const sendMessage = (target: string, content: string, bookId?: string) => 
  request("POST", "/chat", { target, content, bookId });
export const fetchNotifications = () => request("GET", "/users/notifications");

// Global Status (Shoutbox)
export const fetchGlobalStatus = () => request("GET", "/status");
export const updateGlobalStatus = (content: string, emote: string) => 
  request("POST", "/status", { content, emote });

// Sincronização
export const syncOfflineQueue = () => {
  console.log("Sincronizando dados offline...");
};
