import * as crypto from 'crypto';

let ephemeralDevSecret: string | null = null;

/**
 * Resolve o segredo JWT de forma segura:
 * - Em produção (NODE_ENV === 'production'), exige JWT_SECRET definida e com ao menos 32 caracteres.
 * - Em desenvolvimento/testes, usa JWT_SECRET se configurada ou gera um segredo aleatório efêmero por processo
 *   (evitando chaves literais públicas/previsíveis no código-fonte).
 */
export function getJwtSecret(): string {
  const envSecret = process.env.JWT_SECRET?.trim();
  const isProd = process.env.NODE_ENV === 'production';

  if (envSecret) {
    if (isProd && envSecret.length < 32) {
      throw new Error(
        '[SECURITY] JWT_SECRET deve possuir ao menos 32 caracteres em ambiente de produção.',
      );
    }
    return envSecret;
  }

  if (isProd) {
    throw new Error(
      '[SECURITY] Variável de ambiente JWT_SECRET não definida em produção. Inicialização abortada.',
    );
  }

  if (!ephemeralDevSecret) {
    ephemeralDevSecret = crypto.randomBytes(48).toString('hex');
  }
  return ephemeralDevSecret;
}
