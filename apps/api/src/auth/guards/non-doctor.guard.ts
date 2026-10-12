import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../database';

@Injectable()
export class NonDoctorGuard implements CanActivate {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('Usuário não autenticado.');
    }

    // Administradores sempre têm acesso total
    if (user.permissions && user.permissions.includes('admin:access')) {
      return true;
    }

    // Verifica se o usuário possui vínculo como médico
    const isDoctor = await this.db.query.doctors.findFirst({
      where: eq(schema.doctors.userId, user.id),
    });

    if (isDoctor) {
      throw new ForbiddenException('Médicos não têm acesso ao gerenciamento de ambulatórios.');
    }

    return true;
  }
}
