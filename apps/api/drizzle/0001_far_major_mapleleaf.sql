CREATE TABLE "doctor_procedure_groups" (
	"doctor_id" uuid NOT NULL,
	"procedure_group_id" uuid NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "doctor_procedure_groups_pkey" PRIMARY KEY("doctor_id","procedure_group_id")
);
--> statement-breakpoint
ALTER TABLE "health_centers" ALTER COLUMN "cnes" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "health_centers" ADD COLUMN "co_uf" text;--> statement-breakpoint
ALTER TABLE "health_centers" ADD COLUMN "sg_uf" text;--> statement-breakpoint
ALTER TABLE "health_centers" ADD COLUMN "co_cep" text;--> statement-breakpoint
ALTER TABLE "health_centers" ADD COLUMN "nu_cnpj" text;--> statement-breakpoint
ALTER TABLE "health_centers" ADD COLUMN "ds_email" text;--> statement-breakpoint
ALTER TABLE "health_centers" ADD COLUMN "no_bairro" text;--> statement-breakpoint
ALTER TABLE "health_centers" ADD COLUMN "tp_gestao" text;--> statement-breakpoint
ALTER TABLE "health_centers" ADD COLUMN "no_fantasia" text;--> statement-breakpoint
ALTER TABLE "health_centers" ADD COLUMN "nu_endereco" text;--> statement-breakpoint
ALTER TABLE "health_centers" ADD COLUMN "nu_telefone" text;--> statement-breakpoint
ALTER TABLE "health_centers" ADD COLUMN "no_municipio" text;--> statement-breakpoint
ALTER TABLE "health_centers" ADD COLUMN "no_logradouro" text;--> statement-breakpoint
ALTER TABLE "health_centers" ADD COLUMN "st_cota_tabela" boolean;--> statement-breakpoint
ALTER TABLE "health_centers" ADD COLUMN "st_executante" boolean;--> statement-breakpoint
ALTER TABLE "health_centers" ADD COLUMN "no_complemento" text;--> statement-breakpoint
ALTER TABLE "health_centers" ADD COLUMN "no_razao_social" text;--> statement-breakpoint
ALTER TABLE "health_centers" ADD COLUMN "st_solicitante" boolean;--> statement-breakpoint
ALTER TABLE "health_centers" ADD COLUMN "st_solicita_fora" boolean;--> statement-breakpoint
ALTER TABLE "health_centers" ADD COLUMN "co_municipio_ibge" text;--> statement-breakpoint
ALTER TABLE "health_centers" ADD COLUMN "co_natureza_juridica" text;--> statement-breakpoint
ALTER TABLE "health_centers" ADD COLUMN "co_natureza_organizacao" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "force_password_change" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "health_center_id" uuid;--> statement-breakpoint
ALTER TABLE "doctor_procedure_groups" ADD CONSTRAINT "doctor_procedure_groups_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "doctor_procedure_groups" ADD CONSTRAINT "doctor_procedure_groups_procedure_group_id_fkey" FOREIGN KEY ("procedure_group_id") REFERENCES "public"."procedure_groups"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_health_center_id_fkey" FOREIGN KEY ("health_center_id") REFERENCES "public"."health_centers"("id") ON DELETE set null ON UPDATE cascade;