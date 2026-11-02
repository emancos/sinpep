import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class IntegraSusService {
  private readonly logger = new Logger(IntegraSusService.name);
  private tokenCache: { token: string; expiresAt: number } | null = null;

  private getCredentials() {
    const clientId = process.env.SAUDE_API_CLIENT_ID;
    const clientSecret = process.env.SAUDE_API_CLIENT_SECRET;
    const apiUrl = (process.env.INTEGRA_SUS_URL || 'https://integra-sus.integrasistemas.tec.br').replace(/\/+$/, '');
    return { clientId, clientSecret, apiUrl };
  }

  async getAuthToken(): Promise<string | null> {
    const { clientId, clientSecret, apiUrl } = this.getCredentials();
    if (!clientId || !clientSecret) return null;

    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60000) {
      return this.tokenCache.token;
    }

    // Formato 1: JSON com client_id e client_secret
    try {
      const res = await axios.post(
        `${apiUrl}/auth/token`,
        { client_id: clientId, client_secret: clientSecret },
        { timeout: 7000, headers: { 'Content-Type': 'application/json' } }
      );
      const token = res.data?.access_token || res.data?.token || res.data?.data?.access_token || res.data?.data?.token;
      if (token) {
        this.tokenCache = { token, expiresAt: now + (res.data?.expires_in ? res.data.expires_in * 1000 : 3600000) };
        return token;
      }
    } catch {
      // Formato 2: JSON com username e password
      try {
        const res = await axios.post(
          `${apiUrl}/auth/token`,
          { username: clientId, password: clientSecret },
          { timeout: 7000, headers: { 'Content-Type': 'application/json' } }
        );
        const token = res.data?.access_token || res.data?.token || res.data?.data?.access_token || res.data?.data?.token;
        if (token) {
          this.tokenCache = { token, expiresAt: now + (res.data?.expires_in ? res.data.expires_in * 1000 : 3600000) };
          return token;
        }
      } catch {
        // Formato 3: x-www-form-urlencoded
        try {
          const params = new URLSearchParams();
          params.append('grant_type', 'client_credentials');
          params.append('client_id', clientId);
          params.append('client_secret', clientSecret);
          const res = await axios.post(
            `${apiUrl}/auth/token`,
            params.toString(),
            {
              timeout: 7000,
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
              }
            }
          );
          const token = res.data?.access_token || res.data?.token || res.data?.data?.access_token || res.data?.data?.token;
          if (token) {
            this.tokenCache = { token, expiresAt: now + (res.data?.expires_in ? res.data.expires_in * 1000 : 3600000) };
            return token;
          }
        } catch {
          this.logger.warn('INTEGRA SUS Token authentication attempts failed. Will try request without token.');
        }
      }
    }
    return null;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // 1. Busca Textual Direta por Subgrupo
  // GET /procedimentos/subgrupos?search=tomografia
  async searchSubgroups(search?: string, grupo?: string) {
    const { apiUrl } = this.getCredentials();
    const headers = await this.getHeaders();
    try {
      const params: any = {};
      if (search) params.search = search.trim();
      if (grupo) params.grupo = grupo.trim();

      const { data } = await axios.get(`${apiUrl}/procedimentos/subgrupos`, {
        params,
        headers,
        timeout: 9000,
      });

      return Array.isArray(data) ? data : (data?.data || data?.subgrupos || []);
    } catch (error: any) {
      this.logger.warn('Failed to search subgrupos in INTEGRA SUS API:', error?.message);
      return [];
    }
  }

  // 2. Catálogo de Grupos (Simples ou Árvore)
  // GET /procedimentos/grupos
  // GET /procedimentos/grupos?arvore=true
  async getGroups(search?: string, arvore?: boolean) {
    const { apiUrl } = this.getCredentials();
    const headers = await this.getHeaders();
    try {
      const params: any = {};
      if (search) params.search = search.trim();
      if (arvore) params.arvore = 'true';

      const { data } = await axios.get(`${apiUrl}/procedimentos/grupos`, {
        params,
        headers,
        timeout: 9000,
      });

      return Array.isArray(data) ? data : (data?.data || data?.grupos || []);
    } catch (error: any) {
      this.logger.warn('Failed to get grupos from INTEGRA SUS API:', error?.message);
      return [];
    }
  }

  // 3. Subgrupos de um Grupo específico (Drilldown)
  // GET /procedimentos/grupos/{grupo}/subgrupos
  async getGroupSubgroups(grupoCodigo: string, search?: string) {
    const { apiUrl } = this.getCredentials();
    const headers = await this.getHeaders();
    try {
      const params: any = {};
      if (search) params.search = search.trim();

      const { data } = await axios.get(`${apiUrl}/procedimentos/grupos/${grupoCodigo}/subgrupos`, {
        params,
        headers,
        timeout: 9000,
      });

      return Array.isArray(data) ? data : (data?.data || data?.subgrupos || []);
    } catch (error: any) {
      this.logger.warn(`Failed to get subgrupos for grupo ${grupoCodigo}:`, error?.message);
      return [];
    }
  }

  // 4. Formas de Organização de um Subgrupo
  // GET /procedimentos/grupos/{grupo}/subgrupos/{subgrupo}/formas
  async getSubgroupFormas(grupoCodigo: string, subgrupoCodigo: string) {
    const { apiUrl } = this.getCredentials();
    const headers = await this.getHeaders();
    try {
      const { data } = await axios.get(`${apiUrl}/procedimentos/grupos/${grupoCodigo}/subgrupos/${subgrupoCodigo}/formas`, {
        headers,
        timeout: 9000,
      });
      return Array.isArray(data) ? data : (data?.data || data?.formas || []);
    } catch (error: any) {
      this.logger.warn(`Failed to get formas for ${grupoCodigo}/${subgrupoCodigo}:`, error?.message);
      return [];
    }
  }

  // 5. Listagem de Procedimentos do Subgrupo
  // GET /procedimentos/grupos/{grupo}/subgrupos/{subgrupo}/procedimentos?page=1&limit=200
  // ou fallback: GET /procedimentos?grupo={grupo}&subgrupo={subgrupo}&page=1&limit=200
  async getSubgroupProcedures(grupoCodigo: string, subgrupoCodigo: string, page: number = 1, limit: number = 200) {
    const { apiUrl } = this.getCredentials();
    const headers = await this.getHeaders();

    // Normaliza os códigos para 2 dígitos se necessário (ex: "2" -> "02")
    const gCode = String(grupoCodigo).padStart(2, '0');
    const sCode = String(subgrupoCodigo).padStart(2, '0');

    // Tentativa 1: Rota hierárquica
    try {
      const { data } = await axios.get(
        `${apiUrl}/procedimentos/grupos/${gCode}/subgrupos/${sCode}/procedimentos`,
        {
          params: { page, limit },
          headers,
          timeout: 12000,
        }
      );
      const list = Array.isArray(data) ? data : (data?.data || data?.procedimentos || data?.results || []);
      if (list.length > 0) return list;
    } catch {
      // continua para a rota alternativa
    }

    // Tentativa 2: Parâmetros no endpoint geral
    try {
      const { data } = await axios.get(`${apiUrl}/procedimentos`, {
        params: { grupo: gCode, subgrupo: sCode, page, limit },
        headers,
        timeout: 12000,
      });
      return Array.isArray(data) ? data : (data?.data || data?.procedimentos || data?.results || []);
    } catch (error: any) {
      this.logger.warn(`Failed to fetch procedures for grupo ${gCode} subgrupo ${sCode}:`, error?.message);
      return [];
    }
  }

  // 6. Busca por procedimento individual (código ou termo geral)
  async searchProcedures(query: string) {
    const { apiUrl } = this.getCredentials();
    const cleanQuery = query ? query.trim() : '';
    if (!cleanQuery) return [];

    const headers = await this.getHeaders();
    const isCode = /^\d{6,10}$/.test(cleanQuery);

    if (isCode) {
      try {
        const { data } = await axios.get(`${apiUrl}/procedimentos/${cleanQuery}`, {
          headers,
          timeout: 8000,
        });
        if (data) {
          const item = data.data || data;
          if (item && (item.codigo || item.co_procedimento || item.code || item.nome || item.no_procedimento)) {
            return [item];
          }
        }
      } catch (codeErr: any) {
        if (codeErr?.response?.status !== 404) {
          this.logger.warn(`INTEGRA SUS direct code lookup failed (${cleanQuery}):`, codeErr?.response?.status);
        }
      }
    }

    try {
      const { data } = await axios.get(`${apiUrl}/procedimentos`, {
        params: { search: cleanQuery, page: 1, limit: 20 },
        headers,
        timeout: 8000,
      });

      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data?.procedimentos)) return data.procedimentos;
      if (Array.isArray(data?.results)) return data.results;
      if (data && (data.codigo || data.co_procedimento || data.code)) return [data];
      return [];
    } catch (error: any) {
      this.logger.warn('INTEGRA SUS API search failed:', error?.message);
      return [];
    }
  }
}
