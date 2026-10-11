import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { eq, ilike, or, and, asc, desc, inArray } from 'drizzle-orm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DoctorsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  private async getOrCreateDoctorProfile(tx: any) {
    let [profile] = await tx
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.name, 'Médico'))
      .limit(1);

    if (!profile) {
      const [newProfile] = await tx
        .insert(schema.profiles)
        .values({
          id: crypto.randomUUID(),
          name: 'Médico',
          description: 'Acesso às rotinas clínicas (prontuários, pacientes e consulta de procedimentos)',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning();
      profile = newProfile;
    }

    // Permissões exclusivas do perfil de Médico:
    // Prontuários (leitura/escrita), Pacientes (leitura) e Procedimentos (apenas consulta)
    const doctorPermissionNames = [
      'medical-records:read',
      'medical-records:write',
      'patients:read',
      'procedures:read',
    ];

    const targetPermissions = await tx
      .select()
      .from(schema.permissions)
      .where(inArray(schema.permissions.name, doctorPermissionNames));

    const existingProfilePerms = await tx
      .select()
      .from(schema.profilePermissions)
      .where(eq(schema.profilePermissions.profileId, profile.id));

    const existingPermIds = new Set(existingProfilePerms.map((pp: any) => pp.permissionId));

    for (const perm of targetPermissions) {
      if (!existingPermIds.has(perm.id)) {
        await tx.insert(schema.profilePermissions).values({
          profileId: profile.id,
          permissionId: perm.id,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return profile;
  }

  async create(createDoctorDto: CreateDoctorDto) {
    const doctorId = await this.db.transaction(async (tx) => {
      // 1. Extrair os números do CPF para email e senha
      const cpfNumbers = createDoctorDto.cpf.replace(/\D/g, '');
      const email = `${cpfNumbers}@integrasistemas.tech.br`;
      const passwordHash = await bcrypt.hash(cpfNumbers, 10);

      // 2. Obter ou criar o perfil exclusivo de Médico (com acesso restrito)
      const profile = await this.getOrCreateDoctorProfile(tx);
      
      let healthCenterId = null;
      if (createDoctorDto.healthCenter) {
        const hcData = createDoctorDto.healthCenter;
        const [existingHc] = await tx.select().from(schema.healthCenters).where(eq(schema.healthCenters.cnes, hcData.coCnes || hcData.cnes)).limit(1);
        if (existingHc) {
          healthCenterId = existingHc.id;
        } else {
          const [newHc] = await tx.insert(schema.healthCenters).values({
            id: crypto.randomUUID(),
            cnes: hcData.coCnes,
            name: hcData.noFantasia || hcData.noRazaoSocial,
            coUf: hcData.coUf,
            sgUf: hcData.sgUf,
            coCep: hcData.coCep,
            nuCnpj: hcData.nuCnpj,
            dsEmail: hcData.dsEmail,
            noBairro: hcData.noBairro,
            tpGestao: hcData.tpGestao,
            noFantasia: hcData.noFantasia,
            nuEndereco: hcData.nuEndereco,
            nuTelefone: hcData.nuTelefone,
            noMunicipio: hcData.noMunicipio,
            noLogradouro: hcData.noLogradouro,
            stCotaTabela: hcData.stCotaTabela,
            stExecutante: hcData.stExecutante,
            noComplemento: hcData.noComplemento,
            noRazaoSocial: hcData.noRazaoSocial,
            stSolicitante: hcData.stSolicitante,
            stSolicitaFora: hcData.stSolicitaFora,
            coMunicipioIbge: hcData.coMunicipioIbge,
            coNaturezaJuridica: hcData.coNaturezaJuridica,
            coNaturezaOrganizacao: hcData.coNaturezaOrganizacao,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }).returning();
          healthCenterId = newHc.id;
        }
      }

      // 3. Checar se o usuário já existe
      const existingUser = await tx.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
      
      let user;
      if (existingUser.length > 0) {
        user = existingUser[0];
        
        const userUpdates: any = {};
        if (healthCenterId && user.healthCenterId !== healthCenterId) {
          userUpdates.healthCenterId = healthCenterId;
        }
        if (user.profileId !== profile.id) {
          userUpdates.profileId = profile.id;
        }
        if (Object.keys(userUpdates).length > 0) {
          userUpdates.updatedAt = new Date().toISOString();
          const [updatedUser] = await tx.update(schema.users)
            .set(userUpdates)
            .where(eq(schema.users.id, user.id))
            .returning();
          user = updatedUser;
        }
        // Limpar permissões customizadas antigas que possam conceder privilégios administrativos
        await tx.delete(schema.userCustomPermissions).where(eq(schema.userCustomPermissions.userId, user.id));
      } else {
        // 4. Criar o usuário vinculado ao perfil restrito de Médico
        const [newUser] = await tx.insert(schema.users).values({
          id: crypto.randomUUID(),
          email,
          passwordHash,
          name: createDoctorDto.name,
          profileId: profile.id,
          healthCenterId,
          forcePasswordChange: true, // Força a troca de senha no primeiro login
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }).returning();
        user = newUser;
      }

      // 6. Criar o médico vinculado ao novo usuário
      const [doctor] = await tx.insert(schema.doctors).values({
        id: crypto.randomUUID(),
        crm: createDoctorDto.crm,
        crmState: createDoctorDto.crmState,
        attendanceType: createDoctorDto.attendanceType || 'AMBOS',
        userId: user.id,
        isActive: true,
        cpf: createDoctorDto.cpf,
        cns: createDoctorDto.cns ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).returning();

      if (createDoctorDto.specialties && createDoctorDto.specialties.length > 0) {
        for (const specId of createDoctorDto.specialties) {
          await tx.insert(schema.doctorSpecialties).values({
            doctorId: doctor.id,
            specialtyId: specId,
            createdAt: new Date().toISOString(),
          });
        }
      }

      if (createDoctorDto.procedures && createDoctorDto.procedures.length > 0) {
        for (const procId of createDoctorDto.procedures) {
          await tx.insert(schema.doctorProcedures).values({
            doctorId: doctor.id,
            procedureId: procId,
            createdAt: new Date().toISOString(),
          });
        }
      }

      if (createDoctorDto.procedureGroups && createDoctorDto.procedureGroups.length > 0) {
        for (const groupId of createDoctorDto.procedureGroups) {
          await tx.insert(schema.doctorProcedureGroups).values({
            doctorId: doctor.id,
            procedureGroupId: groupId,
            createdAt: new Date().toISOString(),
          });
        }
      }

      return doctor.id;
    });
    return this.findOne(doctorId);
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 10, sortBy, sortOrder = 'asc', search } = query;
    const skip = (page - 1) * limit;

    const conditions = [];

    if (query.includeInactive !== 'true') {
      conditions.push(eq(schema.doctors.isActive, true));
    }

    if (search) {
      conditions.push(
        or(
          inArray(
            schema.doctors.userId,
            this.db.select({ id: schema.users.id }).from(schema.users).where(ilike(schema.users.name, `%${search}%`))
          ),
          ilike(schema.doctors.crm, `%${search}%`),
          ilike(schema.doctors.cpf, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let orderByField: any = schema.doctors.createdAt;
    if (sortBy === 'crm') orderByField = schema.doctors.crm;
    // Sorting by name is complex without joins, defaulting to createdAt

    let sortFn = sortOrder === 'desc' ? desc : asc;

    const allData = await this.db.query.doctors.findMany({
      where: whereClause,
    });
    const total = allData.length;

    const data = await this.db.query.doctors.findMany({
      where: whereClause,
      with: {
        user: {
          with: {
            healthCenter: true
          }
        },
        doctorSpecialties: {
          with: {
            specialty: true
          }
        },
        doctorProcedures: {
          with: {
            procedure: true
          }
        },
        doctorProcedureGroups: {
          with: {
            procedureGroup: true
          }
        }
      },
      orderBy: [sortFn(orderByField)],
      limit: limit,
      offset: skip
    });

    // Remap response to include user's name at the root for easier frontend handling if needed,
    // though the frontend can just read doctor.user.name
    const mappedData = data.map(doc => ({
      ...doc,
      name: doc.user?.name || 'Desconhecido',
    }));

    return { data: mappedData, total };
  }

  async findOne(id: string) {
    const doctor = await this.db.query.doctors.findFirst({
      where: eq(schema.doctors.id, id),
      with: {
        user: {
          with: {
            healthCenter: true
          }
        },
        doctorSpecialties: {
          with: {
            specialty: true
          }
        },
        doctorProcedures: {
          with: {
            procedure: true
          }
        },
        doctorProcedureGroups: {
          with: {
            procedureGroup: true
          }
        }
      }
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }
    
    return {
      ...doctor,
      name: doctor.user?.name || 'Desconhecido',
    };
  }

  async update(id: string, updateDoctorDto: UpdateDoctorDto) {
    const existing = await this.findOne(id);
    
    return await this.db.transaction(async (tx) => {
      const dataToUpdate: any = { ...updateDoctorDto, updatedAt: new Date().toISOString() };
      
      if (dataToUpdate.active !== undefined) {
        dataToUpdate.isActive = dataToUpdate.active;
        delete dataToUpdate.active;
      }
      
      const specialties = dataToUpdate.specialties;
      delete dataToUpdate.specialties;

      const procedures = dataToUpdate.procedures;
      delete dataToUpdate.procedures;
      
      const procedureGroups = dataToUpdate.procedureGroups;
      delete dataToUpdate.procedureGroups;
      
      let healthCenterId = existing.user?.healthCenterId || null;
      if (dataToUpdate.healthCenter) {
        const hcData = dataToUpdate.healthCenter;
        const [existingHc] = await tx.select().from(schema.healthCenters).where(eq(schema.healthCenters.cnes, hcData.coCnes || hcData.cnes)).limit(1);
        if (existingHc) {
          healthCenterId = existingHc.id;
        } else {
          const [newHc] = await tx.insert(schema.healthCenters).values({
            id: crypto.randomUUID(),
            cnes: hcData.coCnes,
            name: hcData.noFantasia || hcData.noRazaoSocial,
            coUf: hcData.coUf,
            sgUf: hcData.sgUf,
            coCep: hcData.coCep,
            nuCnpj: hcData.nuCnpj,
            dsEmail: hcData.dsEmail,
            noBairro: hcData.noBairro,
            tpGestao: hcData.tpGestao,
            noFantasia: hcData.noFantasia,
            nuEndereco: hcData.nuEndereco,
            nuTelefone: hcData.nuTelefone,
            noMunicipio: hcData.noMunicipio,
            noLogradouro: hcData.noLogradouro,
            stCotaTabela: hcData.stCotaTabela,
            stExecutante: hcData.stExecutante,
            noComplemento: hcData.noComplemento,
            noRazaoSocial: hcData.noRazaoSocial,
            stSolicitante: hcData.stSolicitante,
            stSolicitaFora: hcData.stSolicitaFora,
            coMunicipioIbge: hcData.coMunicipioIbge,
            coNaturezaJuridica: hcData.coNaturezaJuridica,
            coNaturezaOrganizacao: hcData.coNaturezaOrganizacao,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }).returning();
          healthCenterId = newHc.id;
        }
      }
      delete dataToUpdate.healthCenter;
      
      const userUpdatePayload: any = {};
      if (dataToUpdate.name) {
        userUpdatePayload.name = dataToUpdate.name;
      }
      if (healthCenterId !== existing.user?.healthCenterId) {
        userUpdatePayload.healthCenterId = healthCenterId;
      }
      
      if (Object.keys(userUpdatePayload).length > 0) {
        userUpdatePayload.updatedAt = new Date().toISOString();
        await tx.update(schema.users).set(userUpdatePayload).where(eq(schema.users.id, existing.userId));
      }
      delete dataToUpdate.name;

      if (Object.keys(dataToUpdate).length > 0 && Object.keys(dataToUpdate).some(k => k !== 'updatedAt')) {
        await tx.update(schema.doctors).set(dataToUpdate).where(eq(schema.doctors.id, id));
      }

      if (specialties !== undefined) {
        await tx.delete(schema.doctorSpecialties).where(eq(schema.doctorSpecialties.doctorId, id));
        for (const specId of specialties) {
          await tx.insert(schema.doctorSpecialties).values({
            doctorId: id,
            specialtyId: specId,
            createdAt: new Date().toISOString(),
          });
        }
      }

      if (procedures !== undefined) {
        await tx.delete(schema.doctorProcedures).where(eq(schema.doctorProcedures.doctorId, id));
        for (const procId of procedures) {
          await tx.insert(schema.doctorProcedures).values({
            doctorId: id,
            procedureId: procId,
            createdAt: new Date().toISOString(),
          });
        }
      }

      if (procedureGroups !== undefined) {
        await tx.delete(schema.doctorProcedureGroups).where(eq(schema.doctorProcedureGroups.doctorId, id));
        for (const groupId of procedureGroups) {
          await tx.insert(schema.doctorProcedureGroups).values({
            doctorId: id,
            procedureGroupId: groupId,
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

    return this.findOne(id);
  }

  async toggleActive(id: string) {
    const doctor = await this.findOne(id);
    await this.db.update(schema.doctors)
      .set({
        isActive: !doctor.isActive,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.doctors.id, id));
      
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    const [deleted] = await this.db.delete(schema.doctors)
      .where(eq(schema.doctors.id, id))
      .returning();
    return deleted;
  }
}
