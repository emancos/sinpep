import { pgTable, uniqueIndex, uuid, text, timestamp, foreignKey, boolean, integer, primaryKey, pgEnum, serial, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const profiles = pgTable("profiles", {
	id: uuid().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	uniqueIndex("profiles_name_key").using("btree", table.name.asc().nullsLast().op("text_ops")),
]);

export const users = pgTable("users", {
	id: uuid().primaryKey().notNull(),
	email: text().notNull(),
	passwordHash: text("password_hash").notNull(),
	name: text().notNull(),
	phone: text(),
	avatar: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
	profileId: uuid("profile_id").notNull(),
}, (table) => [
	uniqueIndex("users_email_key").using("btree", table.email.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.profileId],
			foreignColumns: [profiles.id],
			name: "users_profile_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const permissions = pgTable("permissions", {
	id: uuid().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	uniqueIndex("permissions_name_key").using("btree", table.name.asc().nullsLast().op("text_ops")),
]);

export const userCustomPermissions = pgTable("user_custom_permissions", {
	id: uuid().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	permissionId: uuid("permission_id").notNull(),
	isAllowed: boolean("is_allowed").notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	uniqueIndex("user_custom_permissions_user_id_permission_id_key").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.permissionId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_custom_permissions_user_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.permissionId],
			foreignColumns: [permissions.id],
			name: "user_custom_permissions_permission_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const healthAgents = pgTable("health_agents", {
	id: uuid().primaryKey().notNull(),
	name: text().notNull(),
	phone: text(),
	microArea: text("micro_area"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
	userId: uuid("user_id"),
	healthCenterId: uuid("health_center_id").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
	uniqueIndex("health_agents_user_id_key").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.healthCenterId],
			foreignColumns: [healthCenters.id],
			name: "health_agents_health_center_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "health_agents_user_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const patients = pgTable("patients", {
	id: uuid().primaryKey().notNull(),
	name: text().notNull(),
	cpf: text().notNull(),
	cns: text(),
	birthDate: timestamp("birth_date", { precision: 3, mode: 'string' }).notNull(),
	gender: text().notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
	healthCenterId: uuid("health_center_id").notNull(),
	healthAgentId: uuid("health_agent_id"),
	attentionLevel: integer("attention_level").default(1).notNull(),
	attentionNotes: text("attention_notes"),
	address: text(),
	isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
	uniqueIndex("patients_cns_key").using("btree", table.cns.asc().nullsLast().op("text_ops")),
	uniqueIndex("patients_cpf_key").using("btree", table.cpf.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.healthAgentId],
			foreignColumns: [healthAgents.id],
			name: "patients_health_agent_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.healthCenterId],
			foreignColumns: [healthCenters.id],
			name: "patients_health_center_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const healthCenters = pgTable("health_centers", {
	id: uuid().primaryKey().notNull(),
	name: text().notNull(),
	cnes: text(),
	address: text(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
	nurseName: text("nurse_name"),
	isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
	uniqueIndex("health_centers_cnes_key").using("btree", table.cnes.asc().nullsLast().op("text_ops")),
]);

export const patientPhones = pgTable("patient_phones", {
	id: uuid().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	phoneNumber: text("phone_number").notNull(),
	isWhatsapp: boolean("is_whatsapp").default(false).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "patient_phones_patient_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const doctors = pgTable("doctors", {
	id: uuid().primaryKey().notNull(),
	name: text().notNull(),
	crm: text().notNull(),
	crmState: text("crm_state").notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
	userId: uuid("user_id"),
	isActive: boolean("is_active").default(true).notNull(),
	cpf: text(),
	cns: text(),
}, (table) => [
	uniqueIndex("doctors_cpf_key").using("btree", table.cpf.asc().nullsLast().op("text_ops")),
	uniqueIndex("doctors_crm_key").using("btree", table.crm.asc().nullsLast().op("text_ops")),
	uniqueIndex("doctors_user_id_key").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "doctors_user_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const specialties = pgTable("specialties", {
	id: uuid().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	cbo: text(),
}, (table) => [
	uniqueIndex("specialties_cbo_key").using("btree", table.cbo.asc().nullsLast().op("text_ops")),
	uniqueIndex("specialties_name_key").using("btree", table.name.asc().nullsLast().op("text_ops")),
]);

export const profilePermissions = pgTable("profile_permissions", {
	profileId: uuid("profile_id").notNull(),
	permissionId: uuid("permission_id").notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.profileId],
			foreignColumns: [profiles.id],
			name: "profile_permissions_profile_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.permissionId],
			foreignColumns: [permissions.id],
			name: "profile_permissions_permission_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	primaryKey({ columns: [table.profileId, table.permissionId], name: "profile_permissions_pkey"}),
]);

export const doctorSpecialties = pgTable("doctor_specialties", {
	doctorId: uuid("doctor_id").notNull(),
	specialtyId: uuid("specialty_id").notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.doctorId],
			foreignColumns: [doctors.id],
			name: "doctor_specialties_doctor_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.specialtyId],
			foreignColumns: [specialties.id],
			name: "doctor_specialties_specialty_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	primaryKey({ columns: [table.doctorId, table.specialtyId], name: "doctor_specialties_pkey"}),
]);

export const cid10 = pgTable("cid10", {
	id: uuid().primaryKey().notNull(),
	code: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
	uniqueIndex("cid10_code_key").using("btree", table.code.asc().nullsLast().op("text_ops")),
]);

export const procedureGroups = pgTable("procedure_groups", {
  id: uuid().primaryKey().notNull(),
  name: text().notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const procedures = pgTable("procedures", {
  id: uuid().primaryKey().notNull(),
  code: text(),
  name: text().notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
  procedureGroupId: uuid("procedure_group_id").notNull(),
  genderAllowed: text("gender_allowed").default('AMBOS').notNull(),
  maxAge: integer("max_age").default(130).notNull(),
  minAge: integer("min_age").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.procedureGroupId],
    foreignColumns: [procedureGroups.id],
    name: "procedures_procedure_group_id_fkey"
  }).onUpdate("cascade").onDelete("cascade")
]);

export const procedureVariants = pgTable("procedure_variants", {
  id: uuid().primaryKey().notNull(),
  procedureId: uuid("procedure_id").notNull(),
  sisregProcId: text("sisreg_proc_id").notNull(),
  sisregGroupId: text("sisreg_group_id"),
  side: text(),
  contrast: boolean().default(false).notNull(),
  sedation: boolean().default(false).notNull(),
  ageGroup: text("age_group"),
  maxItems: integer("max_items"),
}, (table) => [
  foreignKey({
    columns: [table.procedureId],
    foreignColumns: [procedures.id],
    name: "procedure_variants_procedure_id_fkey"
  }).onUpdate("cascade").onDelete("cascade")
]);

import { relations } from 'drizzle-orm';

export const proceduresRelations = relations(procedures, ({ one, many }) => ({
  procedureGroup: one(procedureGroups, {
    fields: [procedures.procedureGroupId],
    references: [procedureGroups.id],
  }),
  variants: many(procedureVariants),
}));

export const procedureGroupsRelations = relations(procedureGroups, ({ many }) => ({
  procedures: many(procedures),
}));

export const procedureVariantsRelations = relations(procedureVariants, ({ one }) => ({
  procedure: one(procedures, {
    fields: [procedureVariants.procedureId],
    references: [procedures.id],
  }),
}));


// --- Medical Records (Prontuário) ---
export const medicalRecords = pgTable("medical_records", {
  id: uuid().primaryKey().notNull(),
  patientId: uuid("patient_id").notNull(),
  doctorId: uuid("doctor_id").notNull(),
  recordDate: timestamp("record_date", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  
  observation: text().notNull(),
  cid10: text(),
  
  returnRequestedValue: integer("return_requested_value"),
  returnRequestedUnit: text("return_requested_unit"),
  
  medications: jsonb().default([]),
  requestedExams: jsonb("requested_exams").default([]),
  
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.patientId],
    foreignColumns: [patients.id],
    name: "medical_records_patient_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.doctorId],
    foreignColumns: [users.id],
    name: "medical_records_doctor_id_fkey"
  }).onUpdate("cascade").onDelete("restrict")
]);

export const medicalRecordAttachments = pgTable("medical_record_attachments", {
  id: uuid().primaryKey().notNull(),
  medicalRecordId: uuid("medical_record_id").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  uploadedAt: timestamp("uploaded_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.medicalRecordId],
    foreignColumns: [medicalRecords.id],
    name: "medical_record_attachments_record_id_fkey"
  }).onUpdate("cascade").onDelete("cascade")
]);

export const medicalRecordsRelations = relations(medicalRecords, ({ one, many }) => ({
  patient: one(patients, {
    fields: [medicalRecords.patientId],
    references: [patients.id],
  }),
  doctor: one(users, {
    fields: [medicalRecords.doctorId],
    references: [users.id],
  }),
  attachments: many(medicalRecordAttachments),
}));

export const medicalRecordAttachmentsRelations = relations(medicalRecordAttachments, ({ one }) => ({
  medicalRecord: one(medicalRecords, {
    fields: [medicalRecordAttachments.medicalRecordId],
    references: [medicalRecords.id],
  }),
}));
