/**
 * Baixa um arquivo remoto (ex: PDF) para o dispositivo do usuário, contornando
 * a limitação do atributo `download` do HTML com arquivos de outra origem.
 */
export async function downloadRemoteFile(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Falha ao buscar o arquivo");
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
}

export function safeFileName(name: string, extension: string): string {
  const safe = name.replace(/[\\/:*?"<>|]+/g, " ").trim() || "arquivo";
  return `${safe}.${extension}`;
}
