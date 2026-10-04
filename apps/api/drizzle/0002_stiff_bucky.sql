CREATE TABLE "patient_anamnesis" (
	"id" uuid PRIMARY KEY NOT NULL,
	"patient_id" uuid NOT NULL,
	"is_hypertensive" boolean DEFAULT false NOT NULL,
	"is_diabetic" boolean DEFAULT false NOT NULL,
	"other_diseases" text,
	"is_oncological" boolean DEFAULT false NOT NULL,
	"oncological_stage" text,
	"allergies" text,
	"is_pcd" boolean DEFAULT false NOT NULL,
	"pcd_description" text,
	"continuous_medications" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "medical_records" ADD COLUMN "is_oci" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "patient_anamnesis" ADD CONSTRAINT "patient_anamnesis_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "patient_anamnesis_patient_id_key" ON "patient_anamnesis" USING btree ("patient_id" uuid_ops);