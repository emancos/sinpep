import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, or, ilike, desc, asc, not } from 'drizzle-orm';
import * as schema from '../database';
import { randomUUID } from 'crypto';
import { CreateBrandingDto } from './dto/create-branding.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';

@Injectable()
export class BrandingsService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Endpoint público consumido pela tela de login:
   * Retorna os dados visuais do município pelo slug (?m=slug), ou a configuração padrão do sistema.
   */
  async getPublicBranding(slug?: string) {
    if (slug) {
      const normalizedSlug = slug.trim().toLowerCase();
      const match = await this.db.query.municipalityBrandings.findFirst({
        where: and(
          eq(schema.municipalityBrandings.slug, normalizedSlug),
          eq(schema.municipalityBrandings.isActive, true),
        ),
      });

      if (match) {
        return match;
      }
    }

    // Caso não tenha informado o slug ou não tenha encontrado, busca o padrão do sistema
    const defaultBranding = await this.db.query.municipalityBrandings.findFirst({
      where: and(
        eq(schema.municipalityBrandings.isDefault, true),
        eq(schema.municipalityBrandings.isActive, true),
      ),
    });

    if (defaultBranding) {
      return defaultBranding;
    }

    // Se não houver default configurado, pega o primeiro ativo
    const anyActive = await this.db.query.municipalityBrandings.findFirst({
      where: eq(schema.municipalityBrandings.isActive, true),
      orderBy: [desc(schema.municipalityBrandings.createdAt)],
    });

    if (anyActive) {
      return anyActive;
    }

    // Fallback de contingência caso a tabela esteja vazia
    return {
      id: 'default',
      slug: 'padrao',
      name: 'Padrão',
      fullName: 'Unidade de Saúde',
      department: 'Rede de Atenção à Saúde',
      networkName: 'Rede de Atenção à Saúde',
      systemTitle: 'SINPeP',
      systemSubtitle: 'Sistema Integrado de Prontuário Eletrônico do Paciente',
      description: 'Sistema Integrado de Prontuário Eletrônico do Paciente para suporte ao atendimento ambulatorial e fluxos assistenciais.',
      badgeText: 'Gestão Clínica e Assistencial',
      coatOfArmsUrl: '/brasao.png',
      logoUrl: null,
      primaryGradientStart: '#003366',
      primaryGradientEnd: '#001c3a',
      footerText: 'Acesso restrito a profissionais autorizados • Uso Institucional',
      supportContact: null,
      isDefault: true,
      isActive: true,
    };
  }

  /**
   * Lista resumida pública de municípios ativos
   */
  async getPublicList() {
    const list = await this.db.query.municipalityBrandings.findMany({
      where: eq(schema.municipalityBrandings.isActive, true),
      columns: {
        id: true,
        slug: true,
        name: true,
        fullName: true,
        department: true,
        coatOfArmsUrl: true,
        isDefault: true,
      },
      orderBy: [asc(schema.municipalityBrandings.name)],
    });
    return list;
  }

  /**
   * Listagem administrativa completa
   */
  async findAll(search?: string) {
    const conditions = [];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(schema.municipalityBrandings.name, term),
          ilike(schema.municipalityBrandings.fullName, term),
          ilike(schema.municipalityBrandings.slug, term),
          ilike(schema.municipalityBrandings.department, term),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db.query.municipalityBrandings.findMany({
      where: whereClause,
      orderBy: [desc(schema.municipalityBrandings.isDefault), asc(schema.municipalityBrandings.name)],
    });
  }

  /**
   * Busca um município por ID
   */
  async findOne(id: string) {
    const branding = await this.db.query.municipalityBrandings.findFirst({
      where: eq(schema.municipalityBrandings.id, id),
    });

    if (!branding) {
      throw new NotFoundException('Configuração de município não encontrada.');
    }

    return branding;
  }

  /**
   * Criação de novo município com slug
   */
  async create(dto: CreateBrandingDto) {
    const normalizedSlug = dto.slug.trim().toLowerCase().replace(/\s+/g, '-');

    const existing = await this.db.query.municipalityBrandings.findFirst({
      where: eq(schema.municipalityBrandings.slug, normalizedSlug),
    });

    if (existing) {
      throw new ConflictException(`Já existe um município cadastrado com o slug '${normalizedSlug}'.`);
    }

    // Se este estiver sendo definido como padrão, desmarca os anteriores
    if (dto.isDefault) {
      await this.db
        .update(schema.municipalityBrandings)
        .set({ isDefault: false, updatedAt: new Date().toISOString() });
    }

    const newId = randomUUID();
    const now = new Date().toISOString();

    await this.db.insert(schema.municipalityBrandings).values({
      id: newId,
      slug: normalizedSlug,
      name: dto.name.trim(),
      fullName: dto.fullName.trim(),
      department: dto.department.trim(),
      networkName: dto.networkName?.trim() || 'Rede de Atenção à Saúde',
      systemTitle: dto.systemTitle?.trim() || 'SINPeP',
      systemSubtitle: dto.systemSubtitle.trim(),
      description: dto.description?.trim(),
      badgeText: dto.badgeText?.trim() || 'Gestão Clínica e Assistencial',
      coatOfArmsUrl: dto.coatOfArmsUrl.trim(),
      logoUrl: dto.logoUrl?.trim() || null,
      primaryGradientStart: dto.primaryGradientStart?.trim() || '#003366',
      primaryGradientEnd: dto.primaryGradientEnd?.trim() || '#001c3a',
      footerText: dto.footerText?.trim() || 'Acesso restrito a profissionais autorizados • Uso Institucional',
      supportContact: dto.supportContact?.trim() || null,
      isDefault: dto.isDefault ?? false,
      isActive: dto.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });

    return this.findOne(newId);
  }

  /**
   * Atualização de configurações do município
   */
  async update(id: string, dto: UpdateBrandingDto) {
    const current = await this.findOne(id);

    let normalizedSlug = current.slug;
    if (dto.slug && dto.slug.trim().toLowerCase() !== current.slug) {
      normalizedSlug = dto.slug.trim().toLowerCase().replace(/\s+/g, '-');
      const collision = await this.db.query.municipalityBrandings.findFirst({
        where: and(
          eq(schema.municipalityBrandings.slug, normalizedSlug),
          not(eq(schema.municipalityBrandings.id, id)),
        ),
      });
      if (collision) {
        throw new ConflictException(`O slug '${normalizedSlug}' já está em uso por outro município.`);
      }
    }

    // Se marcando como default, desmarca os demais
    if (dto.isDefault) {
      await this.db
        .update(schema.municipalityBrandings)
        .set({ isDefault: false, updatedAt: new Date().toISOString() })
        .where(not(eq(schema.municipalityBrandings.id, id)));
    }

    const now = new Date().toISOString();

    await this.db
      .update(schema.municipalityBrandings)
      .set({
        slug: normalizedSlug,
        name: dto.name !== undefined ? dto.name.trim() : current.name,
        fullName: dto.fullName !== undefined ? dto.fullName.trim() : current.fullName,
        department: dto.department !== undefined ? dto.department.trim() : current.department,
        networkName: dto.networkName !== undefined ? dto.networkName.trim() : current.networkName,
        systemTitle: dto.systemTitle !== undefined ? dto.systemTitle.trim() : current.systemTitle,
        systemSubtitle: dto.systemSubtitle !== undefined ? dto.systemSubtitle.trim() : current.systemSubtitle,
        description: dto.description !== undefined ? dto.description.trim() : current.description,
        badgeText: dto.badgeText !== undefined ? dto.badgeText.trim() : current.badgeText,
        coatOfArmsUrl: dto.coatOfArmsUrl !== undefined ? dto.coatOfArmsUrl.trim() : current.coatOfArmsUrl,
        logoUrl: dto.logoUrl !== undefined ? (dto.logoUrl?.trim() || null) : current.logoUrl,
        primaryGradientStart: dto.primaryGradientStart !== undefined ? dto.primaryGradientStart.trim() : current.primaryGradientStart,
        primaryGradientEnd: dto.primaryGradientEnd !== undefined ? dto.primaryGradientEnd.trim() : current.primaryGradientEnd,
        footerText: dto.footerText !== undefined ? dto.footerText.trim() : current.footerText,
        supportContact: dto.supportContact !== undefined ? (dto.supportContact?.trim() || null) : current.supportContact,
        isDefault: dto.isDefault !== undefined ? dto.isDefault : current.isDefault,
        isActive: dto.isActive !== undefined ? dto.isActive : current.isActive,
        updatedAt: now,
      })
      .where(eq(schema.municipalityBrandings.id, id));

    return this.findOne(id);
  }

  /**
   * Atualização específica do brasão via upload
   */
  async updateCoatOfArms(id: string, fileUrl: string) {
    await this.findOne(id);

    await this.db
      .update(schema.municipalityBrandings)
      .set({
        coatOfArmsUrl: fileUrl,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.municipalityBrandings.id, id));

    return this.findOne(id);
  }

  /**
   * Remoção ou inativação de município
   */
  async delete(id: string) {
    const current = await this.findOne(id);

    if (current.isDefault) {
      throw new BadRequestException('Não é permitido excluir o município configurado como padrão do sistema.');
    }

    await this.db
      .delete(schema.municipalityBrandings)
      .where(eq(schema.municipalityBrandings.id, id));

    return { success: true, message: 'Município removido com sucesso.' };
  }
}
