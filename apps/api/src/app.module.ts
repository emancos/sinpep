import { MedicalRecordsModule } from './medical-records/medical-records.module';
import { Cid10Module } from './cid10/cid10.module';
import { StorageModule } from './storage/storage.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HealthCentersModule } from './health-centers/health-centers.module';
import { HealthAgentsModule } from './health-agents/health-agents.module';
import { PatientsModule } from './patients/patients.module';
import { SpecialtiesModule } from './specialties/specialties.module';
import { DoctorsModule } from './doctors/doctors.module';
import { ProcedureGroupsModule } from './procedure-groups/procedure-groups.module';
import { ProceduresModule } from './procedures/procedures.module';
import { SisregModule } from './sisreg/sisreg.module';
import { EventsModule } from './events/events.module';
import { ReportsModule } from './reports/reports.module';
import { ReceptionModule } from './reception/reception.module';
import { RoomsModule } from './rooms/rooms.module';
import { MedicationsModule } from './medications/medications.module';
import { RegulationModule } from './regulation/regulation.module';
import { BrandingsModule } from './brandings/brandings.module';
import { SchedulesModule } from './schedules/schedules.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { BpaModule } from './bpa/bpa.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    HealthCentersModule,
    HealthAgentsModule,
    PatientsModule,
    SpecialtiesModule,
    DoctorsModule,
    ProcedureGroupsModule,
    ProceduresModule,
    MedicalRecordsModule,
    Cid10Module,
    SisregModule,
    EventsModule,
    StorageModule,
    ReportsModule,
    ReceptionModule,
    RoomsModule,
    MedicationsModule,
    RegulationModule,
    BrandingsModule,
    SchedulesModule,
    DashboardModule,
    BpaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
