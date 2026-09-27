CREATE TABLE "cid10" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doctor_procedures" (
	"doctor_id" uuid NOT NULL,
	"procedure_id" uuid NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "doctor_procedures_pkey" PRIMARY KEY("doctor_id","procedure_id")
);
--> statement-breakpoint
CREATE TABLE "doctor_specialties" (
	"doctor_id" uuid NOT NULL,
	"specialty_id" uuid NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "doctor_specialties_pkey" PRIMARY KEY("doctor_id","specialty_id")
);
--> statement-breakpoint
CREATE TABLE "doctors" (
	"id" uuid PRIMARY KEY NOT NULL,
	"crm" text NOT NULL,
	"crm_state" text NOT NULL,
	"attendance_type" text DEFAULT 'AMBOS' NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"user_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"cpf" text,
	"cns" text
);
--> statement-breakpoint
CREATE TABLE "health_agents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"micro_area" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"user_id" uuid,
	"health_center_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_centers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"cnes" text,
	"address" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"nurse_name" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medical_record_attachments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"medical_record_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer,
	"uploaded_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medical_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"record_date" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"observation" text NOT NULL,
	"cid10" text,
	"cid10_secondary" text,
	"cid10_associated_causes" text,
	"return_requested_value" integer,
	"return_requested_unit" text,
	"medications" jsonb DEFAULT '[]'::jsonb,
	"medications_justification" text,
	"requested_exams" jsonb DEFAULT '[]'::jsonb,
	"exams_justification" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_phones" (
	"id" uuid PRIMARY KEY NOT NULL,
	"patient_id" uuid NOT NULL,
	"phone_number" text NOT NULL,
	"is_whatsapp" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"cpf" text NOT NULL,
	"cns" text,
	"birth_date" timestamp(3) NOT NULL,
	"gender" text NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"health_center_id" uuid NOT NULL,
	"health_agent_id" uuid,
	"attention_level" integer DEFAULT 1 NOT NULL,
	"attention_notes" text,
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procedure_groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procedure_variants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"procedure_id" uuid NOT NULL,
	"sisreg_proc_id" text NOT NULL,
	"sisreg_group_id" text,
	"side" text,
	"contrast" boolean DEFAULT false NOT NULL,
	"sedation" boolean DEFAULT false NOT NULL,
	"age_group" text,
	"max_items" integer
);
--> statement-breakpoint
CREATE TABLE "procedures" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"procedure_group_id" uuid NOT NULL,
	"gender_allowed" text DEFAULT 'AMBOS' NOT NULL,
	"max_age" integer DEFAULT 130 NOT NULL,
	"min_age" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_permissions" (
	"profile_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "profile_permissions_pkey" PRIMARY KEY("profile_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "specialties" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"cbo" text
);
--> statement-breakpoint
CREATE TABLE "user_custom_permissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"is_allowed" boolean NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"avatar" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL,
	"profile_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "doctor_procedures" ADD CONSTRAINT "doctor_procedures_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "doctor_procedures" ADD CONSTRAINT "doctor_procedures_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "public"."procedures"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "doctor_specialties" ADD CONSTRAINT "doctor_specialties_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "doctor_specialties" ADD CONSTRAINT "doctor_specialties_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "health_agents" ADD CONSTRAINT "health_agents_health_center_id_fkey" FOREIGN KEY ("health_center_id") REFERENCES "public"."health_centers"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "health_agents" ADD CONSTRAINT "health_agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "medical_record_attachments" ADD CONSTRAINT "medical_record_attachments_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "public"."medical_records"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patient_phones" ADD CONSTRAINT "patient_phones_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_health_agent_id_fkey" FOREIGN KEY ("health_agent_id") REFERENCES "public"."health_agents"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_health_center_id_fkey" FOREIGN KEY ("health_center_id") REFERENCES "public"."health_centers"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "procedure_variants" ADD CONSTRAINT "procedure_variants_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "public"."procedures"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_procedure_group_id_fkey" FOREIGN KEY ("procedure_group_id") REFERENCES "public"."procedure_groups"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "profile_permissions" ADD CONSTRAINT "profile_permissions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "profile_permissions" ADD CONSTRAINT "profile_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_custom_permissions" ADD CONSTRAINT "user_custom_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_custom_permissions" ADD CONSTRAINT "user_custom_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "cid10_code_key" ON "cid10" USING btree ("code" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "doctors_cpf_key" ON "doctors" USING btree ("cpf" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "doctors_crm_key" ON "doctors" USING btree ("crm" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "doctors_user_id_key" ON "doctors" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "health_agents_user_id_key" ON "health_agents" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "health_centers_cnes_key" ON "health_centers" USING btree ("cnes" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "patients_cns_key" ON "patients" USING btree ("cns" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "patients_cpf_key" ON "patients" USING btree ("cpf" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions" USING btree ("name" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_name_key" ON "profiles" USING btree ("name" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "specialties_cbo_key" ON "specialties" USING btree ("cbo" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "specialties_name_key" ON "specialties" USING btree ("name" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "user_custom_permissions_user_id_permission_id_key" ON "user_custom_permissions" USING btree ("user_id" uuid_ops,"permission_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email" text_ops);