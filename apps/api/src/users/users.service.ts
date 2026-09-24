// @ts-nocheck
import { Temporal } from '@js-temporal/polyfill';
globalThis.Temporal = Temporal;
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.db.orm.public.Users.where(u => u.email.eq(email))
      // @ts-ignore
      .include('profile', p => p.include('profilePermissions', pp => pp.include('permission')))
      // @ts-ignore
      .include('userCustomPermissions', cp => cp.include('permission'))
      .first();
  }

  async findById(id: string) {
    return this.prisma.db.orm.public.Users.where(u => u.id.eq(id))
      .include('profile', p => p.include('profilePermissions', pp => pp.include('permission')))
      .include('userCustomPermissions', cp => cp.include('permission'))
      .first();
  }

  async create(data: {
    email: string;
    name: string;
    password?: string;
    profileId: string;
    phone?: string;
    customPermissions?: { permissionId: string; isAllowed: boolean }[];
  }) {
    const passwordHash = data.password
      ? await bcrypt.hash(data.password, 10)
      : await bcrypt.hash('123456', 10);

    const user = await this.prisma.db.orm.public.Users.create({
      id: crypto.randomUUID(),
      email: data.email,
      name: data.name,
      phone: data.phone ?? null,
      passwordHash,
      profileId: data.profileId,
      isActive: true,
      avatar: null,
      createdAt: Temporal.Now.plainDateTimeISO(),
      updatedAt: Temporal.Now.plainDateTimeISO(),
    });

    if (data.customPermissions && data.customPermissions.length > 0) {
      await this.prisma.db.orm.public.UserCustomPermissions.createAll(
        data.customPermissions.map((cp) => ({
          id: crypto.randomUUID(),
          userId: user.id,
          permissionId: cp.permissionId,
          isAllowed: cp.isAllowed,
          createdAt: Temporal.Now.plainDateTimeISO(),
          updatedAt: Temporal.Now.plainDateTimeISO(),
        }))
      );
    }

    return user;
  }

  async findAll(includeInactive: boolean = false) {
    let query = this.prisma.db.orm.public.Users.include('profile');
    if (!includeInactive) {
      return query.where(u => u.isActive.eq(true)).all();
    }
    return query.all();
  }

  async update(
    id: string,
    updateData: {
      name?: string;
      phone?: string;
      avatar?: string;
      password?: string;
      profileId?: string;
      customPermissions?: { permissionId: string; isAllowed: boolean }[];
    },
  ) {
    const user = await this.prisma.db.orm.public.Users.where(u => u.id.eq(id)).first();
    if (!user) throw new Error('User not found');

    const data: any = {};
    if (updateData.name !== undefined) data.name = updateData.name;
    if (updateData.phone !== undefined) data.phone = updateData.phone;
    if (updateData.avatar !== undefined) data.avatar = updateData.avatar;
    if (updateData.profileId !== undefined) data.profileId = updateData.profileId;
    if (updateData.password) {
      data.passwordHash = await bcrypt.hash(updateData.password, 10);
    }
    data.updatedAt = Temporal.Now.plainDateTimeISO();

    const updatedUser = await this.prisma.db.orm.public.Users.where(u => u.id.eq(id)).update(data);

    if (updateData.customPermissions !== undefined) {
      await this.prisma.db.orm.public.UserCustomPermissions.where(cp => cp.userId.eq(id)).deleteAll();
      if (updateData.customPermissions.length > 0) {
        await this.prisma.db.orm.public.UserCustomPermissions.createAll(
          updateData.customPermissions.map((cp) => ({
            id: crypto.randomUUID(),
            userId: id,
            permissionId: cp.permissionId,
            isAllowed: cp.isAllowed,
            createdAt: Temporal.Now.plainDateTimeISO(),
            updatedAt: Temporal.Now.plainDateTimeISO(),
          }))
        );
      }
    }

    return updatedUser;
  }

  async toggleActive(id: string) {
    const user = await this.prisma.db.orm.public.Users.where(u => u.id.eq(id)).first();
    if (!user) throw new Error('User not found');
    return this.prisma.db.orm.public.Users.where(u => u.id.eq(id)).update({ isActive: !user.isActive, updatedAt: Temporal.Now.plainDateTimeISO() });
  }

  async delete(id: string) {
    return this.prisma.db.orm.public.Users.where(u => u.id.eq(id)).delete();
  }

  async getProfiles() {
    return this.prisma.db.orm.public.Profiles
      .include('profilePermissions', pp => pp.include('permission'))
      .all();
  }
}

