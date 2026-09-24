import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HealthCentersModule } from './health-centers/health-centers.module';
import { HealthAgentsModule } from './health-agents/health-agents.module';
import { PatientsModule } from './patients/patients.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    HealthCentersModule,
    HealthAgentsModule,
    PatientsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
