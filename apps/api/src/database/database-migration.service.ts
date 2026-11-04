import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from './database.constants';
import * as schema from './schema';
import { sql } from 'drizzle-orm';

@Injectable()
export class DatabaseMigrationService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseMigrationService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async onModuleInit() {
    try {
      this.logger.log('Checking and applying procedure & quota database migrations...');

      await this.db.execute(sql`
        ALTER TABLE procedure_groups ADD COLUMN IF NOT EXISTS group_code TEXT;
        ALTER TABLE procedure_groups ADD COLUMN IF NOT EXISTS subgroup_code TEXT;

        ALTER TABLE procedures ADD COLUMN IF NOT EXISTS requires_regulation BOOLEAN NOT NULL DEFAULT true;
        ALTER TABLE procedures ADD COLUMN IF NOT EXISTS max_returns INTEGER NOT NULL DEFAULT 1;
        ALTER TABLE procedures ADD COLUMN IF NOT EXISTS request_interval_days INTEGER NOT NULL DEFAULT 30;
        ALTER TABLE procedures ADD COLUMN IF NOT EXISTS consumption_type TEXT NOT NULL DEFAULT 'POR_PACIENTE';
        ALTER TABLE procedures ADD COLUMN IF NOT EXISTS sigtap_value NUMERIC(10, 2) DEFAULT 0.00;
        ALTER TABLE procedures ADD COLUMN IF NOT EXISTS regulator_respects_quota BOOLEAN NOT NULL DEFAULT true;

        ALTER TABLE procedures ADD COLUMN IF NOT EXISTS view_schedule_first_time_days INTEGER NOT NULL DEFAULT 10;
        ALTER TABLE procedures ADD COLUMN IF NOT EXISTS view_schedule_return_days INTEGER NOT NULL DEFAULT 15;
        ALTER TABLE procedures ADD COLUMN IF NOT EXISTS view_schedule_regulator_days INTEGER NOT NULL DEFAULT 60;
        ALTER TABLE procedures ADD COLUMN IF NOT EXISTS view_schedule_auto_days INTEGER NOT NULL DEFAULT 30;

        ALTER TABLE procedures ADD COLUMN IF NOT EXISTS release_schedule_first_time_days INTEGER NOT NULL DEFAULT 1;
        ALTER TABLE procedures ADD COLUMN IF NOT EXISTS release_schedule_return_days INTEGER NOT NULL DEFAULT 10;
        ALTER TABLE procedures ADD COLUMN IF NOT EXISTS release_schedule_regulator_days INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE procedures ADD COLUMN IF NOT EXISTS release_schedule_auto_days INTEGER NOT NULL DEFAULT 15;
      `);

      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS procedure_preparations (
          id UUID PRIMARY KEY NOT NULL,
          procedure_id UUID NOT NULL UNIQUE REFERENCES procedures(id) ON UPDATE CASCADE ON DELETE CASCADE,
          title TEXT NOT NULL,
          content_html TEXT NOT NULL,
          fasting_hours INTEGER DEFAULT 0,
          requires_companion BOOLEAN NOT NULL DEFAULT false,
          medication_instructions TEXT,
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP(3) NOT NULL
        );
      `);

      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS health_center_procedures (
          id UUID PRIMARY KEY NOT NULL,
          health_center_id UUID NOT NULL REFERENCES health_centers(id) ON UPDATE CASCADE ON DELETE CASCADE,
          procedure_id UUID NOT NULL REFERENCES procedures(id) ON UPDATE CASCADE ON DELETE CASCADE,
          monthly_quantity INTEGER NOT NULL DEFAULT 0,
          is_offered BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP(3) NOT NULL,
          CONSTRAINT health_center_procedures_unique UNIQUE (health_center_id, procedure_id)
        );
      `);

      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS procedure_solicitor_quotas (
          id UUID PRIMARY KEY NOT NULL,
          executing_health_center_id UUID NOT NULL REFERENCES health_centers(id) ON UPDATE CASCADE ON DELETE CASCADE,
          soliciting_health_center_id UUID NOT NULL REFERENCES health_centers(id) ON UPDATE CASCADE ON DELETE CASCADE,
          procedure_id UUID NOT NULL REFERENCES procedures(id) ON UPDATE CASCADE ON DELETE CASCADE,
          monthly_quota INTEGER NOT NULL DEFAULT 0,
          used_quota INTEGER NOT NULL DEFAULT 0,
          is_manual_adjustment BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP(3) NOT NULL,
          CONSTRAINT procedure_solicitor_quotas_unique UNIQUE (executing_health_center_id, soliciting_health_center_id, procedure_id)
        );
      `);

      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS health_center_procedure_groups (
          id UUID PRIMARY KEY NOT NULL,
          health_center_id UUID NOT NULL REFERENCES health_centers(id) ON UPDATE CASCADE ON DELETE CASCADE,
          procedure_group_id UUID NOT NULL REFERENCES procedure_groups(id) ON UPDATE CASCADE ON DELETE CASCADE,
          monthly_quantity INTEGER NOT NULL DEFAULT 0,
          is_offered BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP(3) NOT NULL,
          CONSTRAINT health_center_procedure_groups_unique UNIQUE (health_center_id, procedure_group_id)
        );
      `);

      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS procedure_group_solicitor_quotas (
          id UUID PRIMARY KEY NOT NULL,
          executing_health_center_id UUID NOT NULL REFERENCES health_centers(id) ON UPDATE CASCADE ON DELETE CASCADE,
          soliciting_health_center_id UUID NOT NULL REFERENCES health_centers(id) ON UPDATE CASCADE ON DELETE CASCADE,
          procedure_group_id UUID NOT NULL REFERENCES procedure_groups(id) ON UPDATE CASCADE ON DELETE CASCADE,
          monthly_quota INTEGER NOT NULL DEFAULT 0,
          used_quota INTEGER NOT NULL DEFAULT 0,
          is_manual_adjustment BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP(3) NOT NULL,
          CONSTRAINT procedure_group_solicitor_quotas_unique UNIQUE (executing_health_center_id, soliciting_health_center_id, procedure_group_id)
        );
      `);

      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS quota_reallocations (
          id UUID PRIMARY KEY NOT NULL,
          executing_health_center_id UUID NOT NULL REFERENCES health_centers(id) ON UPDATE CASCADE ON DELETE CASCADE,
          procedure_id UUID REFERENCES procedures(id) ON UPDATE CASCADE ON DELETE SET NULL,
          procedure_group_id UUID REFERENCES procedure_groups(id) ON UPDATE CASCADE ON DELETE SET NULL,
          reallocated_slots INTEGER NOT NULL DEFAULT 0,
          source_solicitors JSONB NOT NULL DEFAULT '[]'::jsonb,
          target_solicitors JSONB NOT NULL DEFAULT '[]'::jsonb,
          strategy TEXT NOT NULL DEFAULT 'DEMAND_QUEUE',
          triggered_by TEXT NOT NULL DEFAULT 'MANUAL',
          justification TEXT,
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS auto_scheduling_rules (
          id UUID PRIMARY KEY NOT NULL,
          procedure_id UUID REFERENCES procedures(id) ON UPDATE CASCADE ON DELETE CASCADE,
          procedure_group_id UUID REFERENCES procedure_groups(id) ON UPDATE CASCADE ON DELETE CASCADE,
          rule_name TEXT NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT true,
          weight_waiting_days INTEGER NOT NULL DEFAULT 1,
          weight_priority_urgency INTEGER NOT NULL DEFAULT 500,
          weight_priority_priority INTEGER NOT NULL DEFAULT 200,
          weight_elderly_80_plus INTEGER NOT NULL DEFAULT 300,
          weight_elderly_60_plus INTEGER NOT NULL DEFAULT 100,
          weight_pcd INTEGER NOT NULL DEFAULT 150,
          min_lead_time_days INTEGER NOT NULL DEFAULT 3,
          max_schedule_horizon_days INTEGER NOT NULL DEFAULT 60,
          respect_health_center_quotas BOOLEAN NOT NULL DEFAULT true,
          allow_auto_execution BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS auto_scheduling_runs (
          id UUID PRIMARY KEY NOT NULL,
          executed_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          mode TEXT NOT NULL,
          triggered_by_user_id UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
          total_requests_evaluated INTEGER NOT NULL DEFAULT 0,
          total_slots_available INTEGER NOT NULL DEFAULT 0,
          total_matches_created INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'SUCESSO',
          notes TEXT,
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS auto_scheduling_matches (
          id UUID PRIMARY KEY NOT NULL,
          run_id UUID NOT NULL REFERENCES auto_scheduling_runs(id) ON UPDATE CASCADE ON DELETE CASCADE,
          regulation_request_id UUID NOT NULL REFERENCES regulation_requests(id) ON UPDATE CASCADE ON DELETE CASCADE,
          schedule_slot_id UUID NOT NULL REFERENCES schedule_slots(id) ON UPDATE CASCADE ON DELETE CASCADE,
          calculated_score NUMERIC(10, 2) NOT NULL,
          score_breakdown_json TEXT,
          status TEXT NOT NULL DEFAULT 'PENDENTE_APROVACAO',
          confirmed_at TIMESTAMP(3),
          confirmed_by_user_id UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
          created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      this.logger.log('Database migrations for procedures, quotas & auto-scheduling applied successfully.');
    } catch (error) {
      this.logger.error('Error applying procedure & quota database migrations', error);
    }
  }
}
