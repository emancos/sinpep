import { Injectable, Inject, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, or, ilike, desc, asc } from 'drizzle-orm';
import * as schema from '../database';
import * as crypto from 'crypto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class RoomsService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async findAll(query?: { search?: string; date?: string; activeOnly?: string }) {
    const conditions = [];

    if (query?.activeOnly === 'true') {
      conditions.push(eq(schema.rooms.isActive, true));
    }

    if (query?.search) {
      const term = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(schema.rooms.name, term),
          ilike(schema.rooms.number, term),
          ilike(schema.rooms.sector, term),
          ilike(schema.rooms.floor, term),
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const allRooms = await this.db.query.rooms.findMany({
      where: whereClause,
      orderBy: [asc(schema.rooms.number), asc(schema.rooms.name)],
    });

    // Se date foi fornecido, inclui status de ocupação da data
    if (query?.date) {
      const allocations = await this.db.query.roomAllocations.findMany({
        where: eq(schema.roomAllocations.date, query.date),
      });

      const allocationByRoomId = new Map<string, typeof allocations[0]>();
      allocations.forEach(a => allocationByRoomId.set(a.roomId, a));

      return allRooms.map(room => {
        const alloc = allocationByRoomId.get(room.id);
        return {
          ...room,
          isOccupied: !!alloc,
          currentAllocation: alloc || null,
        };
      });
    }

    return allRooms;
  }

  async findOne(id: string) {
    const room = await this.db.query.rooms.findFirst({
      where: eq(schema.rooms.id, id),
    });

    if (!room) {
      throw new NotFoundException(`Ambulatório com ID "${id}" não encontrado.`);
    }

    return room;
  }

  async create(dto: CreateRoomDto) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const [created] = await this.db
      .insert(schema.rooms)
      .values({
        id,
        name: dto.name.trim(),
        number: dto.number.trim(),
        sector: dto.sector ? dto.sector.trim() : null,
        floor: dto.floor ? dto.floor.trim() : null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    this.eventsGateway.server?.emit('room_created', created);
    return created;
  }

  async update(id: string, dto: UpdateRoomDto) {
    await this.findOne(id);
    const now = new Date().toISOString();

    const updateData: any = {
      updatedAt: now,
    };

    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.number !== undefined) updateData.number = dto.number.trim();
    if (dto.sector !== undefined) updateData.sector = dto.sector ? dto.sector.trim() : null;
    if (dto.floor !== undefined) updateData.floor = dto.floor ? dto.floor.trim() : null;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const [updated] = await this.db
      .update(schema.rooms)
      .set(updateData)
      .where(eq(schema.rooms.id, id))
      .returning();

    this.eventsGateway.server?.emit('room_updated', updated);
    return updated;
  }

  async toggleActive(id: string) {
    const room = await this.findOne(id);
    const [updated] = await this.db
      .update(schema.rooms)
      .set({
        isActive: !room.isActive,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.rooms.id, id))
      .returning();

    this.eventsGateway.server?.emit('room_updated', updated);
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    const [deleted] = await this.db
      .delete(schema.rooms)
      .where(eq(schema.rooms.id, id))
      .returning();

    this.eventsGateway.server?.emit('room_deleted', { id });
    return deleted;
  }

  async getAllocations(date: string) {
    return await this.db.query.roomAllocations.findMany({
      where: eq(schema.roomAllocations.date, date),
      with: {
        room: true,
      },
    });
  }

  async getAllocationForSpecialty(specialtyName: string, date: string) {
    const alloc = await this.db.query.roomAllocations.findFirst({
      where: and(
        eq(schema.roomAllocations.specialtyName, specialtyName),
        eq(schema.roomAllocations.date, date),
      ),
      with: {
        room: true,
      },
    });

    return alloc || null;
  }

  async allocateRoom(roomId: string, specialtyName: string, date: string, userId?: string) {
    const room = await this.findOne(roomId);
    if (!room.isActive) {
      throw new BadRequestException(`O ambulatório "${room.name} (${room.number})" está inativo e não pode ser ocupado.`);
    }

    // 1. Verifica se esta sala já está ocupada por OUTRA especialidade nesta data
    const existingRoomOccupant = await this.db.query.roomAllocations.findFirst({
      where: and(
        eq(schema.roomAllocations.roomId, roomId),
        eq(schema.roomAllocations.date, date),
      ),
    });

    if (existingRoomOccupant && existingRoomOccupant.specialtyName !== specialtyName) {
      throw new ConflictException(
        `O ambulatório "${room.name} (${room.number})" já está ocupado pela especialidade "${existingRoomOccupant.specialtyName}" nesta data.`
      );
    }

    const now = new Date().toISOString();

    // 2. Verifica se a especialidade já estava vinculada a alguma sala nesta data
    const existingSpecAllocation = await this.db.query.roomAllocations.findFirst({
      where: and(
        eq(schema.roomAllocations.specialtyName, specialtyName),
        eq(schema.roomAllocations.date, date),
      ),
    });

    let allocationResult;

    if (existingSpecAllocation) {
      // Atualiza a alocação existente para o novo ambulatório (transferência / troca de sala)
      const [updated] = await this.db
        .update(schema.roomAllocations)
        .set({
          roomId,
          allocatedBy: userId || existingSpecAllocation.allocatedBy,
          updatedAt: now,
        })
        .where(eq(schema.roomAllocations.id, existingSpecAllocation.id))
        .returning();
      allocationResult = updated;
    } else {
      // Cria nova alocação
      const [inserted] = await this.db
        .insert(schema.roomAllocations)
        .values({
          id: crypto.randomUUID(),
          roomId,
          specialtyName,
          date,
          allocatedBy: userId || null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      allocationResult = inserted;
    }

    // Emite evento em tempo real via WebSocket
    this.eventsGateway.server?.emit('room_allocated', {
      allocation: allocationResult,
      room,
      specialtyName,
      date,
    });
    this.eventsGateway.server?.emit('queue_updated', {
      type: 'ROOM_ALLOCATED',
      specialtyName,
      date,
    });

    return {
      ...allocationResult,
      room,
    };
  }

  async deallocateRoom(specialtyName: string, date: string) {
    const existing = await this.db.query.roomAllocations.findFirst({
      where: and(
        eq(schema.roomAllocations.specialtyName, specialtyName),
        eq(schema.roomAllocations.date, date),
      ),
      with: {
        room: true,
      },
    });

    if (!existing) {
      return { success: true, message: 'Nenhum ambulatório estava vinculado.' };
    }

    await this.db
      .delete(schema.roomAllocations)
      .where(eq(schema.roomAllocations.id, existing.id));

    // Emite evento em tempo real via WebSocket para todos os terminais
    this.eventsGateway.server?.emit('room_deallocated', {
      specialtyName,
      date,
      roomId: existing.roomId,
    });
    this.eventsGateway.server?.emit('queue_updated', {
      type: 'ROOM_DEALLOCATED',
      specialtyName,
      date,
    });

    return {
      success: true,
      message: `Ambulatório "${existing.room?.name || ''}" desocupado com sucesso.`,
    };
  }
}
