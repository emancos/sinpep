import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { eq, and } from 'drizzle-orm';

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
        healthCenter: true,
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
        userHealthCenters: {
          with: {
            healthCenter: true
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
        healthCenter: true,
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
        userHealthCenters: {
          with: {
            healthCenter: true
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
    profileId?: string;
    profileIds?: string[];
    defaultProfileId?: string;
    healthCenterId?: string | null;
    healthCenterIds?: string[];
    defaultHealthCenterId?: string | null;
    isMunicipalRegulator?: boolean;
    phone?: string;
    customPermissions?: { permissionId: string; isAllowed: boolean }[];
  }) {
    const passwordHash = data.password
      ? await bcrypt.hash(data.password, 10)
      : await bcrypt.hash('123456', 10);

    const resolvedProfileIds = data.profileIds && data.profileIds.length > 0
      ? Array.from(new Set(data.profileIds))
      : (data.profileId ? [data.profileId] : []);

    const primaryProfileId = data.defaultProfileId || resolvedProfileIds[0] || data.profileId;
    if (!primaryProfileId) {
      throw new Error('Pelo menos um perfil deve ser atribuído ao usuário.');
    }

    const resolvedHealthCenterIds = data.healthCenterIds && data.healthCenterIds.length > 0
      ? Array.from(new Set(data.healthCenterIds))
      : (data.healthCenterId ? [data.healthCenterId] : []);

    const primaryHealthCenterId = data.defaultHealthCenterId || resolvedHealthCenterIds[0] || data.healthCenterId || null;

    const [user] = await this.db.insert(schema.users).values({
      id: crypto.randomUUID(),
      email: data.email,
      name: data.name,
      phone: data.phone ?? null,
      passwordHash,
      profileId: primaryProfileId,
      healthCenterId: primaryHealthCenterId,
      isMunicipalRegulator: Boolean(data.isMunicipalRegulator),
      isActive: true,
      avatar: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();

    // Insere os vínculos de múltiplos perfis
    if (resolvedProfileIds.length > 0) {
      const userProfilesData = resolvedProfileIds.map((pid) => ({
        id: crypto.randomUUID(),
        userId: user.id,
        profileId: pid,
        isDefault: pid === primaryProfileId,
        createdAt: new Date().toISOString(),
      }));
      await this.db.insert(schema.userProfiles).values(userProfilesData);
    }

    // Insere os vínculos de múltiplas unidades de saúde
    if (resolvedHealthCenterIds.length > 0) {
      const userHealthCentersData = resolvedHealthCenterIds.map((hcId) => ({
        id: crypto.randomUUID(),
        userId: user.id,
        healthCenterId: hcId,
        isDefault: hcId === primaryHealthCenterId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      await this.db.insert(schema.userHealthCenters).values(userHealthCentersData);
    }

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

    return this.findById(user.id);
  }

  async findAll(includeInactive: boolean = false) {
    return this.db.query.users.findMany({
      where: includeInactive ? undefined : eq(schema.users.isActive, true),
      with: {
        profile: true,
        healthCenter: true,
        userProfiles: {
          with: { profile: true }
        },
        userHealthCenters: {
          with: { healthCenter: true }
        }
      }
    });
  }

  async update(
    id: string,
    updateData: {
      name?: string;
      phone?: string;
      avatar?: string | null;
      password?: string;
      profileId?: string;
      profileIds?: string[];
      defaultProfileId?: string;
      healthCenterId?: string | null;
      healthCenterIds?: string[];
      defaultHealthCenterId?: string | null;
      isMunicipalRegulator?: boolean;
      customPermissions?: { permissionId: string; isAllowed: boolean }[];
    },
  ) {
    const user = await this.db.query.users.findFirst({ where: eq(schema.users.id, id) });
    if (!user) throw new Error('User not found');

    const data: any = {};
    if (updateData.name !== undefined) data.name = updateData.name;
    if (updateData.phone !== undefined) data.phone = updateData.phone;
    if (updateData.avatar !== undefined) data.avatar = updateData.avatar;
    if (updateData.isMunicipalRegulator !== undefined) data.isMunicipalRegulator = Boolean(updateData.isMunicipalRegulator);
    if (updateData.password) {
      data.passwordHash = await bcrypt.hash(updateData.password, 10);
    }

    // Sincronização de Perfis
    if (updateData.profileIds !== undefined) {
      const resolvedProfileIds = Array.from(new Set(updateData.profileIds));
      const primaryProfileId = updateData.defaultProfileId || resolvedProfileIds[0] || user.profileId;
      data.profileId = primaryProfileId;

      await this.db.delete(schema.userProfiles).where(eq(schema.userProfiles.userId, id));
      if (resolvedProfileIds.length > 0) {
        const userProfilesData = resolvedProfileIds.map((pid) => ({
          id: crypto.randomUUID(),
          userId: id,
          profileId: pid,
          isDefault: pid === primaryProfileId,
          createdAt: new Date().toISOString(),
        }));
        await this.db.insert(schema.userProfiles).values(userProfilesData);
      }
    } else if (updateData.profileId !== undefined) {
      data.profileId = updateData.profileId;
      // Garante consistência em userProfiles
      const existingUp = await this.db.query.userProfiles.findFirst({
        where: and(eq(schema.userProfiles.userId, id), eq(schema.userProfiles.profileId, updateData.profileId)),
      });
      if (!existingUp) {
        await this.db.insert(schema.userProfiles).values({
          id: crypto.randomUUID(),
          userId: id,
          profileId: updateData.profileId,
          isDefault: true,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Sincronização de Unidades de Saúde
    if (updateData.healthCenterIds !== undefined) {
      const resolvedHealthCenterIds = Array.from(new Set(updateData.healthCenterIds));
      const primaryHealthCenterId = updateData.defaultHealthCenterId || resolvedHealthCenterIds[0] || null;
      data.healthCenterId = primaryHealthCenterId;

      await this.db.delete(schema.userHealthCenters).where(eq(schema.userHealthCenters.userId, id));
      if (resolvedHealthCenterIds.length > 0) {
        const userHealthCentersData = resolvedHealthCenterIds.map((hcId) => ({
          id: crypto.randomUUID(),
          userId: id,
          healthCenterId: hcId,
          isDefault: hcId === primaryHealthCenterId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
        await this.db.insert(schema.userHealthCenters).values(userHealthCentersData);
      }
    } else if (updateData.healthCenterId !== undefined) {
      data.healthCenterId = updateData.healthCenterId;
      if (updateData.healthCenterId) {
        const existingUhc = await this.db.query.userHealthCenters.findFirst({
          where: and(eq(schema.userHealthCenters.userId, id), eq(schema.userHealthCenters.healthCenterId, updateData.healthCenterId)),
        });
        if (!existingUhc) {
          await this.db.insert(schema.userHealthCenters).values({
            id: crypto.randomUUID(),
            userId: id,
            healthCenterId: updateData.healthCenterId,
            isDefault: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
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
