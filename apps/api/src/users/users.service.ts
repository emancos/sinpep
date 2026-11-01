import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { eq } from 'drizzle-orm';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findByEmail(email: string) {
    return this.db.query.users.findFirst({
      where: eq(schema.users.email, email),
      with: {
        profile: {
          with: {
            profilePermissions: {
              with: { permission: true }
            }
          }
        },
        userProfiles: {
          with: {
            profile: {
              with: {
                profilePermissions: {
                  with: { permission: true }
                }
              }
            }
          }
        },
        userCustomPermissions: {
          with: { permission: true }
        }
      }
    });
  }

  async findById(id: string) {
    return this.db.query.users.findFirst({
      where: eq(schema.users.id, id),
      with: {
        profile: {
          with: {
            profilePermissions: {
              with: { permission: true }
            }
          }
        },
        userProfiles: {
          with: {
            profile: {
              with: {
                profilePermissions: {
                  with: { permission: true }
                }
              }
            }
          }
        },
        userCustomPermissions: {
          with: { permission: true }
        }
      }
    });
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

    const [user] = await this.db.insert(schema.users).values({
      id: crypto.randomUUID(),
      email: data.email,
      name: data.name,
      phone: data.phone ?? null,
      passwordHash,
      profileId: data.profileId,
      isActive: true,
      avatar: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();

    if (data.customPermissions && data.customPermissions.length > 0) {
      const customPermsData = data.customPermissions.map((cp) => ({
        id: crypto.randomUUID(),
        userId: user.id,
        permissionId: cp.permissionId,
        isAllowed: cp.isAllowed,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      await this.db.insert(schema.userCustomPermissions).values(customPermsData);
    }

    return user;
  }

  async findAll(includeInactive: boolean = false) {
    return this.db.query.users.findMany({
      where: includeInactive ? undefined : eq(schema.users.isActive, true),
      with: { profile: true }
    });
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
    const user = await this.db.query.users.findFirst({ where: eq(schema.users.id, id) });
    if (!user) throw new Error('User not found');

    const data: any = {};
    if (updateData.name !== undefined) data.name = updateData.name;
    if (updateData.phone !== undefined) data.phone = updateData.phone;
    if (updateData.avatar !== undefined) data.avatar = updateData.avatar;
    if (updateData.profileId !== undefined) data.profileId = updateData.profileId;
    if (updateData.password) {
      data.passwordHash = await bcrypt.hash(updateData.password, 10);
    }
    
    if (Object.keys(data).length > 0) {
      data.updatedAt = new Date().toISOString();
      await this.db.update(schema.users)
        .set(data)
        .where(eq(schema.users.id, id));
    }

    if (updateData.customPermissions !== undefined) {
      await this.db.delete(schema.userCustomPermissions).where(eq(schema.userCustomPermissions.userId, id));
      if (updateData.customPermissions.length > 0) {
        const customPermsData = updateData.customPermissions.map((cp) => ({
          id: crypto.randomUUID(),
          userId: id,
          permissionId: cp.permissionId,
          isAllowed: cp.isAllowed,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
        await this.db.insert(schema.userCustomPermissions).values(customPermsData);
      }
    }

    return this.findById(id);
  }

  async toggleActive(id: string) {
    const user = await this.db.query.users.findFirst({ where: eq(schema.users.id, id) });
    if (!user) throw new Error('User not found');
    await this.db.update(schema.users)
      .set({ isActive: !user.isActive, updatedAt: new Date().toISOString() })
      .where(eq(schema.users.id, id));
      
    return this.findById(id);
  }

  async delete(id: string) {
    const [deleted] = await this.db.delete(schema.users).where(eq(schema.users.id, id)).returning();
    return deleted;
  }

  async getProfiles() {
    return this.db.query.profiles.findMany({
      with: {
        profilePermissions: {
          with: { permission: true }
        }
      }
    });
  }
}
