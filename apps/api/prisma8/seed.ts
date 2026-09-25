// @ts-nocheck
import { Temporal } from '@js-temporal/polyfill';
globalThis.Temporal = Temporal;
import postgres from '@prisma/orm-postgres/runtime';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import 'dotenv/config';

const contractJson = require('../generated/prisma8/contract.json');
const db = postgres({ url: process.env.DATABASE_URL, contractJson });

async function main() {
  const prisma = db.orm.public;

  try {
    console.log('Semeando o banco de dados...');

    // 1. Criar as permissões iniciais
    const permissionsData = [
      { name: 'admin:access', description: 'Acesso total de administrador' },
      { name: 'users:read', description: 'Visualizar usuários' },
      { name: 'users:write', description: 'Gerenciar usuários' },
      { name: 'health-centers:read', description: 'Visualizar unidades e agentes de saúde' },
      { name: 'health-centers:write', description: 'Gerenciar unidades e agentes de saúde' },
      { name: 'health-agents:read', description: 'Visualizar Agentes de Saúde' },
      { name: 'health-agents:write', description: 'Gerir Agentes de Saúde' },
      { name: 'patients:read', description: 'Visualizar Pacientes' },
      { name: 'patients:write', description: 'Gerenciar Pacientes' },
      { name: 'patients:write_attention', description: 'Gerenciar Nível de Atenção do Paciente' },
      { name: 'doctors:read', description: 'Visualizar Médicos' },
      { name: 'doctors:write', description: 'Gerenciar Médicos' },
      { name: 'specialties:read', description: 'Visualizar Especialidades' },
      { name: 'specialties:write', description: 'Gerenciar Especialidades' },
    ];

    const permissions = [];
    for (const p of permissionsData) {
      let perm = await prisma.Permissions.where(x => x.name.eq(p.name)).first();
      if (!perm) {
        perm = await prisma.Permissions.create({
          id: crypto.randomUUID(),
          name: p.name,
          description: p.description,
          createdAt: Temporal.Now.plainDateTimeISO(),
          updatedAt: Temporal.Now.plainDateTimeISO(),
        });
      }
      permissions.push(perm);
    }
    console.log('Permissões padrão configuradas.');

    // 2. Criar perfil de Administrador e adicionais
    let adminProfile = await prisma.Profiles.where(x => x.name.eq('Administrador')).first();
    if (!adminProfile) {
      adminProfile = await prisma.Profiles.create({
        id: crypto.randomUUID(),
        name: 'Administrador',
        description: 'Acesso total às configurações do sistema',
        createdAt: Temporal.Now.plainDateTimeISO(),
        updatedAt: Temporal.Now.plainDateTimeISO(),
      });
    }
    console.log('Perfil criado: Administrador.');

    // 3. Vincular permissões aos Perfis
    for (const perm of permissions) {
      let link = await prisma.ProfilePermissions.where(x => x.profileId.eq(adminProfile.id)).where(x => x.permissionId.eq(perm.id)).first();
      if (!link) {
        await prisma.ProfilePermissions.create({
          profileId: adminProfile.id,
          permissionId: perm.id,
          createdAt: Temporal.Now.plainDateTimeISO(),
        });
      }
    }
    console.log('Vínculo entre Perfis e Permissões estabelecido.');

    // 4. Criar Usuário Administrador do Sistema
    const adminEmail = 'admin@system.com';
    const passwordHash = await bcrypt.hash('admin', 10);

    let adminUser = await prisma.Users.where(x => x.email.eq(adminEmail)).first();
    if (adminUser) {
      await prisma.Users.where(x => x.email.eq(adminEmail)).update({
        passwordHash,
        profileId: adminProfile.id,
        updatedAt: Temporal.Now.plainDateTimeISO(),
      });
    } else {
      await prisma.Users.create({
        id: crypto.randomUUID(),
        email: adminEmail,
        name: 'Administrador do Sistema',
        passwordHash,
        profileId: adminProfile.id,
        isActive: true,
        avatar: null,
        phone: null,
        createdAt: Temporal.Now.plainDateTimeISO(),
        updatedAt: Temporal.Now.plainDateTimeISO(),
      });
    }

    console.log(`Usuário administrador (${adminEmail}) criado/atualizado com sucesso!`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Erro ao semear o banco de dados:', err);
  process.exit(1);
});
