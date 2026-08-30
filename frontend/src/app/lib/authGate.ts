import { getUsername } from "./session";

/**
 * Portão de ações para visitantes.
 *
 * Quem entrou sem conta pode ver tudo, mas não pode ler, baixar, comentar nem
 * usar o social. Em vez de espalhar checagens de sessão por toda parte, cada
 * ação chama `requireAuth("<o que ia fazer>")`: se já está logado, segue; se é
 * visitante, dispara o evento que abre o convite para entrar e devolve `false`,
 * para o chamador simplesmente parar.
 *
 * É um evento global (e não um contexto) de propósito: assim funciona de
 * qualquer lugar — de um provider, de um formulário, do próprio cliente HTTP.
 */
export const AUTH_GATE_EVENT = "mybooks:authgate";

export function requireAuth(reason?: string): boolean {
  if (getUsername()) return true;
  window.dispatchEvent(new CustomEvent(AUTH_GATE_EVENT, { detail: { reason } }));
  return false;
}
