CREATE TABLE "attendance_queue" (
	"id" uuid PRIMARY KEY NOT NULL,
	"patient_id" uuid NOT NULL,
	"specialty_name" text NOT NULL,
	"date" text NOT NULL,
	"esus_solicitacao_id" text,
	"queue_order" integer NOT NULL,
	"priority" text DEFAULT 'CONVENCIONAL' NOT NULL,
	"status" text DEFAULT 'AGUARDANDO' NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medication_substances" (
	"medication_id" uuid NOT NULL,
	"substance_id" uuid NOT NULL,
	"dosage" text,
	CONSTRAINT "medication_substances_pkey" PRIMARY KEY("medication_id","substance_id")
);
--> statement-breakpoint
CREATE TABLE "medications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"process_number" text,
	"registration_number" text,
	"laboratory_id" uuid,
	"category" text,
	"reference_medicine" text,
	"stripe" text,
	"status" text DEFAULT 'Ativo' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"substance_description" text,
	"dosage" text,
	"substance_with_dosage" text,
	"complement" text,
	"atc_code" text,
	"search_text" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medicine_laboratories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cnpj" text NOT NULL,
	"corporate_name" text NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medicine_substances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "queue_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_allocations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"room_id" uuid NOT NULL,
	"specialty_name" text NOT NULL,
	"date" text NOT NULL,
	"allocated_by" uuid,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"number" text NOT NULL,
	"sector" text,
	"floor" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "doctors" ALTER COLUMN "crm" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "doctors" ALTER COLUMN "crm_state" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "medical_records" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "patient_anamnesis" ADD COLUMN "is_smoker" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_queue" ADD CONSTRAINT "attendance_queue_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "medication_substances" ADD CONSTRAINT "medication_substances_medication_id_fkey" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "medication_substances" ADD CONSTRAINT "medication_substances_substance_id_fkey" FOREIGN KEY ("substance_id") REFERENCES "public"."medicine_substances"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_laboratory_id_fkey" FOREIGN KEY ("laboratory_id") REFERENCES "public"."medicine_laboratories"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "room_allocations" ADD CONSTRAINT "room_allocations_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "room_allocations" ADD CONSTRAINT "room_allocations_allocated_by_fkey" FOREIGN KEY ("allocated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "medication_substances_substance_id_idx" ON "medication_substances" USING btree ("substance_id");--> statement-breakpoint
CREATE INDEX "medications_name_idx" ON "medications" USING btree ("name");--> statement-breakpoint
CREATE INDEX "medications_is_active_idx" ON "medications" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "medications_lab_id_idx" ON "medications" USING btree ("laboratory_id");--> statement-breakpoint
CREATE INDEX "medications_reg_num_idx" ON "medications" USING btree ("registration_number");--> statement-breakpoint
CREATE UNIQUE INDEX "medicine_laboratories_cnpj_key" ON "medicine_laboratories" USING btree ("cnpj");--> statement-breakpoint
CREATE INDEX "medicine_laboratories_name_idx" ON "medicine_laboratories" USING btree ("corporate_name");--> statement-breakpoint
CREATE UNIQUE INDEX "medicine_substances_name_key" ON "medicine_substances" USING btree ("name");--> statement-breakpoint
CREATE INDEX "medicine_substances_code_idx" ON "medicine_substances" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "room_allocations_room_date_idx" ON "room_allocations" USING btree ("room_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "room_allocations_spec_date_idx" ON "room_allocations" USING btree ("specialty_name","date");--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medications_search_trgm_idx" ON "medications" USING gin ("search_text" gin_trgm_ops);
