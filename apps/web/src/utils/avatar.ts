const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function getAvatarUrl(avatarSrc: string | null | undefined): string | null {
 if (!avatarSrc) return null;
 
 try {
 // Tenta interpretar como URL absoluta
 const url = new URL(avatarSrc);
 // Extrai o caminho e força o uso do servidor da API correto e HTTPS/HTTP atual
 return `${apiUrl}${url.pathname}`;
 } catch (e) {
 // Se não for uma URL válida (ex: já é um caminho relativo /storage/...)
 if (avatarSrc.startsWith('/')) {
 return `${apiUrl}${avatarSrc}`;
 }
 // Caso seja base64 ou outro formato
 return avatarSrc;
 }
}
