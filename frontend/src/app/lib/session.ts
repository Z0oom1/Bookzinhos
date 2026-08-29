/**
 * Sessão local do usuário.
 *
 * O servidor identifica quem está logado pelo header `x-user-id`; aqui ficam os
 * dados que a interface precisa ler sem ida ao servidor (nome, avatar, se é a
 * conta Admin). Um único lugar para ler e gravar isso.
 */

import type { UserProfile } from "./types";

const KEYS = {
  username: "books-username",
  bio: "books-bio",
  avatar: "books-avatar",
  admin: "books-is-admin",
  shelf: "profile-shelf",
} as const;

export function getUsername(): string | null {
  const value = localStorage.getItem(KEYS.username);
  return value && value !== "anonymous" ? value : null;
}

export function getAvatar(): string {
  return localStorage.getItem(KEYS.avatar) || "🐼";
}

export function getBio(): string {
  return localStorage.getItem(KEYS.bio) || "";
}

export function isAdmin(): boolean {
  return localStorage.getItem(KEYS.admin) === "true";
}

export function getShelf(): string[] {
  try {
    const raw = localStorage.getItem(KEYS.shelf);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSession(user: Partial<UserProfile> & { username: string }): void {
  localStorage.setItem(KEYS.username, user.username);
  if (user.bio != null) localStorage.setItem(KEYS.bio, user.bio);
  if (user.avatar != null) localStorage.setItem(KEYS.avatar, user.avatar);
  localStorage.setItem(KEYS.admin, String(!!user.isAdmin));
  if (user.shelf) localStorage.setItem(KEYS.shelf, JSON.stringify(user.shelf));
}

export function clearSession(): void {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
}

/** Dispara um evento para que o layout atualize avatar/nome sem recarregar. */
export function notifySessionChanged(): void {
  window.dispatchEvent(new CustomEvent("mybooks:session"));
}
