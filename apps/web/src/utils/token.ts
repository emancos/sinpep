/**
 * Utilitários para decodificação e validação de tokens JWT no frontend
 */

export interface DecodedJwtPayload {
  sub?: string;
  email?: string;
  exp?: number;
  iat?: number;
  permissions?: string[];
  [key: string]: any;
}

/**
 * Decodifica o payload de um token JWT em formato Base64URL com suporte a UTF-8.
 */
function base64UrlDecode(str: string): string {
  let output = str.replace(/-/g, '+').replace(/_/g, '/');
  switch (output.length % 4) {
    case 0:
      break;
    case 2:
      output += '==';
      break;
    case 3:
      output += '=';
      break;
    default:
      throw new Error('String base64url inválida!');
  }

  try {
    return decodeURIComponent(
      atob(output)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return atob(output);
  }
}

/**
 * Obtém o payload decodificado do token JWT.
 * Retorna null se o token for nulo, indefinido ou malformado.
 */
export function getTokenPayload(token: string | null | undefined): DecodedJwtPayload | null {
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    const parts = token.trim().split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payloadJson = base64UrlDecode(parts[1]);
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

/**
 * Verifica se o token JWT está expirado.
 * @param token Token JWT
 * @param marginSeconds Margem de segurança em segundos (padrão: 10s) para evitar expiração durante requisições
 * @returns true se expirado, ausente ou inválido; false se ainda válido.
 */
export function isTokenExpired(token: string | null | undefined, marginSeconds: number = 10): boolean {
  if (!token) {
    return true;
  }

  const payload = getTokenPayload(token);
  if (!payload || typeof payload.exp !== 'number') {
    return true;
  }

  const currentTimeInSeconds = Math.floor(Date.now() / 1000);
  return payload.exp <= currentTimeInSeconds + marginSeconds;
}

/**
 * Retorna o tempo restante de validade do token em milissegundos.
 * Retorna 0 se expirado ou inválido.
 */
export function getTokenRemainingTime(token: string | null | undefined): number {
  if (!token) {
    return 0;
  }

  const payload = getTokenPayload(token);
  if (!payload || typeof payload.exp !== 'number') {
    return 0;
  }

  const remainingMs = payload.exp * 1000 - Date.now();
  return remainingMs > 0 ? remainingMs : 0;
}
