import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { CreateHealthCenterDto } from './dto/create-health-center.dto';
import { UpdateHealthCenterDto } from './dto/update-health-center.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { eq, ilike, or, and, asc, desc } from 'drizzle-orm';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class HealthCentersService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(createHealthCenterDto: CreateHealthCenterDto) {
    const [healthCenter] = await this.db.insert(schema.healthCenters).values({
      id: crypto.randomUUID(),
      name: createHealthCenterDto.name,
      cnes: createHealthCenterDto.cnes || '0000000',
      address: createHealthCenterDto.address ?? null,
      nurseName: createHealthCenterDto.nurseName ?? null,
      stSolicitante: createHealthCenterDto.stSolicitante ?? true,
      stExecutante: createHealthCenterDto.stExecutante ?? false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();
    return healthCenter;
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 10, sortBy, sortOrder = 'asc', search } = query;
    const skip = (page - 1) * limit;

    const conditions = [];

    if (query.includeInactive !== 'true') {
      conditions.push(eq(schema.healthCenters.isActive, true));
    }

    if (search) {
      conditions.push(
        or(
          ilike(schema.healthCenters.name, `%${search}%`),
          ilike(schema.healthCenters.cnes, `%${search}%`),
          ilike(schema.healthCenters.address, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let orderByField: any = schema.healthCenters.name;
    if (sortBy === 'name') orderByField = schema.healthCenters.name;
    if (sortBy === 'cnes') orderByField = schema.healthCenters.cnes;

    let sortFn = sortOrder === 'desc' ? desc : asc;

    const allData = await this.db.query.healthCenters.findMany({
      where: whereClause,
    });
    const total = allData.length;

    const data = await this.db.query.healthCenters.findMany({
      where: whereClause,
      with: {
        healthAgents: true,
      },
      orderBy: [sortFn(orderByField)],
      limit: limit,
      offset: skip
    });

    return { data, total };
  }

  async findOne(id: string) {
    const healthCenter = await this.db.query.healthCenters.findFirst({
      where: eq(schema.healthCenters.id, id),
      with: {
        healthAgents: true,
        patients: true,
      }
    });

    if (!healthCenter) {
      throw new NotFoundException(`HealthCenter with ID ${id} not found`);
    }
    return healthCenter;
  }

  async update(id: string, updateHealthCenterDto: UpdateHealthCenterDto) {
    await this.findOne(id);
    
    const dataToUpdate: any = { ...updateHealthCenterDto, updatedAt: new Date().toISOString() };
    if (dataToUpdate.active !== undefined) {
      dataToUpdate.isActive = dataToUpdate.active;
      delete dataToUpdate.active;
    }

    const [updated] = await this.db.update(schema.healthCenters)
      .set(dataToUpdate)
      .where(eq(schema.healthCenters.id, id))
      .returning();
      
    return updated;
  }

  async toggleActive(id: string) {
    const healthCenter = await this.findOne(id);
    const [updated] = await this.db.update(schema.healthCenters)
      .set({
        isActive: !healthCenter.isActive,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.healthCenters.id, id))
      .returning();
      
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    const [deleted] = await this.db.delete(schema.healthCenters)
      .where(eq(schema.healthCenters.id, id))
      .returning();
    return deleted;
  }

  async searchCnes(query: any) {
    const clientId = process.env.SAUDE_API_CLIENT_ID;
    const clientSecret = process.env.SAUDE_API_CLIENT_SECRET;
    const apiUrl = process.env.INTEGRA_SUS_URL;

    if (!clientId || !clientSecret || !apiUrl) {
      throw new NotFoundException('Credenciais ou URL da API de Saúde não configuradas no .env');
    }

    try {
      // 1. Obter o token de acesso
      const authResponse = await axios.post(`${apiUrl}/auth/token`, {
        client_id: clientId,
        client_secret: clientSecret,
      });
      
      const token = authResponse.data.access_token;

      // 2. Fazer a requisição usando o token
      const { data } = await axios.get(`${apiUrl}/cnes/estabelecimentos`, {
        params: query,
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      return data;
    } catch (error) {
      console.error('Erro na integração com CNES:', error);
      throw new NotFoundException('Erro ao buscar estabelecimentos no CNES.');
    }
  }

  async searchProfessionals(query: any) {
    const clientId = process.env.SAUDE_API_CLIENT_ID;
    const clientSecret = process.env.SAUDE_API_CLIENT_SECRET;
    const apiUrl = process.env.INTEGRA_SUS_URL;

    if (!clientId || !clientSecret || !apiUrl) {
      throw new NotFoundException('Credenciais ou URL da API de Saúde não configuradas no .env');
    }

    try {
      // 1. Obter o token de acesso
      const authResponse = await axios.post(`${apiUrl}/auth/token`, {
        client_id: clientId,
        client_secret: clientSecret,
      });
      
      const token = authResponse.data.access_token;

      // 2. Fazer a requisição usando o token
      const { data } = await axios.get(`${apiUrl}/cnes/profissionais`, {
        params: query,
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      return data;
    } catch (error) {
      console.error('Erro na integração com CNES Profissionais:', error);
      throw new NotFoundException('Erro ao buscar profissionais no CNES.');
    }
  }
}
