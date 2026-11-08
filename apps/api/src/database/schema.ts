import { pgTable, uniqueIndex, index, uuid, text, timestamp, foreignKey, boolean, integer, primaryKey, pgEnum, serial, jsonb, numeric } from "drizzle-orm/pg-core"
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
	forcePasswordChange: boolean("force_password_change").default(false).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
	profileId: uuid("profile_id").notNull(),
	healthCenterId: uuid("health_center_id"),
}, (table) => [
	uniqueIndex("users_email_key").using("btree", table.email.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.profileId],
			foreignColumns: [profiles.id],
			name: "users_profile_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.healthCenterId],
			foreignColumns: [healthCenters.id],
			name: "users_health_center_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
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

export const userProfiles = pgTable("user_profiles", {
	id: uuid().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	profileId: uuid("profile_id").notNull(),
	isDefault: boolean("is_default").default(false).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("user_profiles_user_id_profile_id_key").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.profileId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "user_profiles_user_id_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
		columns: [table.profileId],
		foreignColumns: [profiles.id],
		name: "user_profiles_profile_id_fkey"
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
	cpf: text(),
	cns: text(),
	email: text(),
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
	cnes: text().notNull(),
	
	coUf: text("co_uf"),
	sgUf: text("sg_uf"),
	coCep: text("co_cep"),
	nuCnpj: text("nu_cnpj"),
	dsEmail: text("ds_email"),
	noBairro: text("no_bairro"),
	tpGestao: text("tp_gestao"),
	noFantasia: text("no_fantasia"),
	nuEndereco: text("nu_endereco"),
	nuTelefone: text("nu_telefone"),
	noMunicipio: text("no_municipio"),
	noLogradouro: text("no_logradouro"),
	stCotaTabela: boolean("st_cota_tabela"),
	stExecutante: boolean("st_executante"),
	noComplemento: text("no_complemento"),
	noRazaoSocial: text("no_razao_social"),
	stSolicitante: boolean("st_solicitante"),
	stSolicitaFora: boolean("st_solicita_fora"),
	coMunicipioIbge: text("co_municipio_ibge"),
	coNaturezaJuridica: text("co_natureza_juridica"),
	coNaturezaOrganizacao: text("co_natureza_organizacao"),
	
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

export const patientAnamnesis = pgTable("patient_anamnesis", {
	id: uuid().primaryKey().notNull(),
	patientId: uuid("patient_id").notNull(),
	isHypertensive: boolean("is_hypertensive").default(false).notNull(),
	isDiabetic: boolean("is_diabetic").default(false).notNull(),
	isSmoker: boolean("is_smoker").default(false).notNull(),
	otherDiseases: text("other_diseases"),
	isOncological: boolean("is_oncological").default(false).notNull(),
	oncologicalStage: text("oncological_stage"),
	allergies: text("allergies"),
	isPcd: boolean("is_pcd").default(false).notNull(),
	pcdDescription: text("pcd_description"),
	continuousMedications: jsonb("continuous_medications").default([]),
	bloodPressure: text("blood_pressure"),
	glycemia: text("glycemia"),
	weight: text("weight"),
	height: text("height"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	uniqueIndex("patient_anamnesis_patient_id_key").using("btree", table.patientId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "patient_anamnesis_patient_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const doctors = pgTable("doctors", {
	id: uuid().primaryKey().notNull(),
	crm: text(),
	crmState: text("crm_state"),
	attendanceType: text("attendance_type").default('AMBOS').notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
	userId: uuid("user_id").notNull(),
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

export const doctorProcedures = pgTable("doctor_procedures", {
	doctorId: uuid("doctor_id").notNull(),
	procedureId: uuid("procedure_id").notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.doctorId],
			foreignColumns: [doctors.id],
			name: "doctor_procedures_doctor_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.procedureId],
			foreignColumns: [procedures.id],
			name: "doctor_procedures_procedure_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	primaryKey({ columns: [table.doctorId, table.procedureId], name: "doctor_procedures_pkey"}),
]);

export const doctorProcedureGroups = pgTable("doctor_procedure_groups", {
	doctorId: uuid("doctor_id").notNull(),
	procedureGroupId: uuid("procedure_group_id").notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.doctorId],
			foreignColumns: [doctors.id],
			name: "doctor_procedure_groups_doctor_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.procedureGroupId],
			foreignColumns: [procedureGroups.id],
			name: "doctor_procedure_groups_procedure_group_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	primaryKey({ columns: [table.doctorId, table.procedureGroupId], name: "doctor_procedure_groups_pkey"}),
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
  groupCode: text("group_code"),
  subgroupCode: text("subgroup_code"),
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

  // Regulação e Parâmetros Clínicos
  requiresRegulation: boolean("requires_regulation").default(true).notNull(),
  maxReturns: integer("max_returns").default(1).notNull(),
  requestIntervalDays: integer("request_interval_days").default(30).notNull(),
  consumptionType: text("consumption_type").default('POR_PACIENTE').notNull(),
  sigtapValue: numeric("sigtap_value", { precision: 10, scale: 2 }).default('0.00'),
  regulatorRespectsQuota: boolean("regulator_respects_quota").default(true).notNull(),

  // Período de visualização das agendas (em dias)
  viewScheduleFirstTimeDays: integer("view_schedule_first_time_days").default(10).notNull(),
  viewScheduleReturnDays: integer("view_schedule_return_days").default(15).notNull(),
  viewScheduleRegulatorDays: integer("view_schedule_regulator_days").default(60).notNull(),
  viewScheduleAutoDays: integer("view_schedule_auto_days").default(30).notNull(),

  // Disponibilização das agendas (a partir de quantos dias)
  releaseScheduleFirstTimeDays: integer("release_schedule_first_time_days").default(1).notNull(),
  releaseScheduleReturnDays: integer("release_schedule_return_days").default(10).notNull(),
  releaseScheduleRegulatorDays: integer("release_schedule_regulator_days").default(0).notNull(),
  releaseScheduleAutoDays: integer("release_schedule_auto_days").default(15).notNull(),

  isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.procedureGroupId],
    foreignColumns: [procedureGroups.id],
    name: "procedures_procedure_group_id_fkey"
  }).onUpdate("cascade").onDelete("cascade")
]);

export const procedurePreparations = pgTable("procedure_preparations", {
  id: uuid().primaryKey().notNull(),
  procedureId: uuid("procedure_id").notNull().unique(),
  title: text().notNull(),
  contentHtml: text("content_html").notNull(),
  fastingHours: integer("fasting_hours").default(0),
  requiresCompanion: boolean("requires_companion").default(false).notNull(),
  medicationInstructions: text("medication_instructions"),
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.procedureId],
    foreignColumns: [procedures.id],
    name: "procedure_preparations_procedure_id_fkey"
  }).onUpdate("cascade").onDelete("cascade")
]);

export const healthCenterProcedures = pgTable("health_center_procedures", {
  id: uuid().primaryKey().notNull(),
  healthCenterId: uuid("health_center_id").notNull(),
  procedureId: uuid("procedure_id").notNull(),
  monthlyQuantity: integer("monthly_quantity").default(0).notNull(),
  isOffered: boolean("is_offered").default(true).notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  uniqueIndex("health_center_procedures_unique").on(table.healthCenterId, table.procedureId),
  foreignKey({
    columns: [table.healthCenterId],
    foreignColumns: [healthCenters.id],
    name: "health_center_procedures_health_center_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.procedureId],
    foreignColumns: [procedures.id],
    name: "health_center_procedures_procedure_id_fkey"
  }).onUpdate("cascade").onDelete("cascade")
]);

export const procedureSolicitorQuotas = pgTable("procedure_solicitor_quotas", {
  id: uuid().primaryKey().notNull(),
  executingHealthCenterId: uuid("executing_health_center_id").notNull(),
  solicitingHealthCenterId: uuid("soliciting_health_center_id").notNull(),
  procedureId: uuid("procedure_id").notNull(),
  monthlyQuota: integer("monthly_quota").default(0).notNull(),
  usedQuota: integer("used_quota").default(0).notNull(),
  isManualAdjustment: boolean("is_manual_adjustment").default(false).notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  uniqueIndex("procedure_solicitor_quotas_unique").on(
    table.executingHealthCenterId,
    table.solicitingHealthCenterId,
    table.procedureId
  ),
  foreignKey({
    columns: [table.executingHealthCenterId],
    foreignColumns: [healthCenters.id],
    name: "procedure_solicitor_quotas_executing_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.solicitingHealthCenterId],
    foreignColumns: [healthCenters.id],
    name: "procedure_solicitor_quotas_soliciting_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.procedureId],
    foreignColumns: [procedures.id],
    name: "procedure_solicitor_quotas_procedure_fkey"
  }).onUpdate("cascade").onDelete("cascade")
]);

export const healthCenterProcedureGroups = pgTable("health_center_procedure_groups", {
  id: uuid().primaryKey().notNull(),
  healthCenterId: uuid("health_center_id").notNull(),
  procedureGroupId: uuid("procedure_group_id").notNull(),
  monthlyQuantity: integer("monthly_quantity").default(0).notNull(),
  isOffered: boolean("is_offered").default(true).notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  uniqueIndex("health_center_procedure_groups_unique").on(table.healthCenterId, table.procedureGroupId),
  foreignKey({
    columns: [table.healthCenterId],
    foreignColumns: [healthCenters.id],
    name: "health_center_procedure_groups_health_center_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.procedureGroupId],
    foreignColumns: [procedureGroups.id],
    name: "health_center_procedure_groups_procedure_group_id_fkey"
  }).onUpdate("cascade").onDelete("cascade")
]);

export const procedureGroupSolicitorQuotas = pgTable("procedure_group_solicitor_quotas", {
  id: uuid().primaryKey().notNull(),
  executingHealthCenterId: uuid("executing_health_center_id").notNull(),
  solicitingHealthCenterId: uuid("soliciting_health_center_id").notNull(),
  procedureGroupId: uuid("procedure_group_id").notNull(),
  monthlyQuota: integer("monthly_quota").default(0).notNull(),
  usedQuota: integer("used_quota").default(0).notNull(),
  isManualAdjustment: boolean("is_manual_adjustment").default(false).notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  uniqueIndex("procedure_group_solicitor_quotas_unique").on(
    table.executingHealthCenterId,
    table.solicitingHealthCenterId,
    table.procedureGroupId
  ),
  foreignKey({
    columns: [table.executingHealthCenterId],
    foreignColumns: [healthCenters.id],
    name: "procedure_group_solicitor_quotas_executing_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.solicitingHealthCenterId],
    foreignColumns: [healthCenters.id],
    name: "procedure_group_solicitor_quotas_soliciting_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.procedureGroupId],
    foreignColumns: [procedureGroups.id],
    name: "procedure_group_solicitor_quotas_group_fkey"
  }).onUpdate("cascade").onDelete("cascade")
]);

export const quotaReallocations = pgTable("quota_reallocations", {
  id: uuid().primaryKey().notNull(),
  executingHealthCenterId: uuid("executing_health_center_id").notNull(),
  procedureId: uuid("procedure_id"),
  procedureGroupId: uuid("procedure_group_id"),
  reallocatedSlots: integer("reallocated_slots").notNull(),
  sourceSolicitors: jsonb("source_solicitors").notNull(),
  targetSolicitors: jsonb("target_solicitors").notNull(),
  strategy: text().default('DEMAND_QUEUE').notNull(),
  triggeredBy: text("triggered_by").default('MANUAL').notNull(),
  justification: text(),
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.executingHealthCenterId],
    foreignColumns: [healthCenters.id],
    name: "quota_reallocations_executing_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.procedureId],
    foreignColumns: [procedures.id],
    name: "quota_reallocations_procedure_fkey"
  }).onUpdate("cascade").onDelete("set null"),
  foreignKey({
    columns: [table.procedureGroupId],
    foreignColumns: [procedureGroups.id],
    name: "quota_reallocations_group_fkey"
  }).onUpdate("cascade").onDelete("set null"),
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
  preparation: one(procedurePreparations),
  healthCenterProcedures: many(healthCenterProcedures),
  solicitorQuotas: many(procedureSolicitorQuotas),
}));

export const procedurePreparationsRelations = relations(procedurePreparations, ({ one }) => ({
  procedure: one(procedures, {
    fields: [procedurePreparations.procedureId],
    references: [procedures.id],
  }),
}));

export const healthCenterProceduresRelations = relations(healthCenterProcedures, ({ one }) => ({
  healthCenter: one(healthCenters, {
    fields: [healthCenterProcedures.healthCenterId],
    references: [healthCenters.id],
  }),
  procedure: one(procedures, {
    fields: [healthCenterProcedures.procedureId],
    references: [procedures.id],
  }),
}));

export const procedureSolicitorQuotasRelations = relations(procedureSolicitorQuotas, ({ one }) => ({
  executingHealthCenter: one(healthCenters, {
    fields: [procedureSolicitorQuotas.executingHealthCenterId],
    references: [healthCenters.id],
  }),
  solicitingHealthCenter: one(healthCenters, {
    fields: [procedureSolicitorQuotas.solicitingHealthCenterId],
    references: [healthCenters.id],
  }),
  procedure: one(procedures, {
    fields: [procedureSolicitorQuotas.procedureId],
    references: [procedures.id],
  }),
}));

export const healthCenterProcedureGroupsRelations = relations(healthCenterProcedureGroups, ({ one }) => ({
  healthCenter: one(healthCenters, {
    fields: [healthCenterProcedureGroups.healthCenterId],
    references: [healthCenters.id],
  }),
  procedureGroup: one(procedureGroups, {
    fields: [healthCenterProcedureGroups.procedureGroupId],
    references: [procedureGroups.id],
  }),
}));

export const procedureGroupSolicitorQuotasRelations = relations(procedureGroupSolicitorQuotas, ({ one }) => ({
  executingHealthCenter: one(healthCenters, {
    fields: [procedureGroupSolicitorQuotas.executingHealthCenterId],
    references: [healthCenters.id],
  }),
  solicitingHealthCenter: one(healthCenters, {
    fields: [procedureGroupSolicitorQuotas.solicitingHealthCenterId],
    references: [healthCenters.id],
  }),
  procedureGroup: one(procedureGroups, {
    fields: [procedureGroupSolicitorQuotas.procedureGroupId],
    references: [procedureGroups.id],
  }),
}));

export const quotaReallocationsRelations = relations(quotaReallocations, ({ one }) => ({
  executingHealthCenter: one(healthCenters, {
    fields: [quotaReallocations.executingHealthCenterId],
    references: [healthCenters.id],
  }),
  procedure: one(procedures, {
    fields: [quotaReallocations.procedureId],
    references: [procedures.id],
  }),
  procedureGroup: one(procedureGroups, {
    fields: [quotaReallocations.procedureGroupId],
    references: [procedureGroups.id],
  }),
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
  cid10Secondary: text("cid10_secondary"),
  cid10AssociatedCauses: text("cid10_associated_causes"),
  
  returnRequestedValue: integer("return_requested_value"),
  returnRequestedUnit: text("return_requested_unit"),
  
  isOci: boolean("is_oci").default(false).notNull(),
  
  medications: jsonb().default([]),
  medicationsJustification: text("medications_justification"),
  requestedExams: jsonb("requested_exams").default([]),
  examsJustification: text("exams_justification"),
  
  executingUnitName: text("executing_unit_name"),
  executingUnitCnes: text("executing_unit_cnes"),

  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
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

export const attendanceQueue = pgTable("attendance_queue", {
  id: uuid().primaryKey().notNull(),
  patientId: uuid("patient_id").notNull(),
  specialtyName: text("specialty_name").notNull(),
  date: text().notNull(),
  esusSolicitacaoId: text("esus_solicitacao_id"),
  queueOrder: integer("queue_order").notNull(),
  priority: text().default('CONVENCIONAL').notNull(),
  status: text().default('AGUARDANDO').notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.patientId],
    foreignColumns: [patients.id],
    name: "attendance_queue_patient_id_fkey"
  }).onUpdate("cascade").onDelete("cascade")
]);

export const queueSettings = pgTable("queue_settings", {
  id: text().primaryKey().notNull(),
  value: text().notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const attendanceQueueRelations = relations(attendanceQueue, ({ one }) => ({
  patient: one(patients, {
    fields: [attendanceQueue.patientId],
    references: [patients.id],
  }),
}));

export const rooms = pgTable("rooms", {
  id: uuid().primaryKey().notNull(),
  name: text().notNull(),
  number: text().notNull(),
  sector: text(),
  floor: text(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
});

export const roomAllocations = pgTable("room_allocations", {
  id: uuid().primaryKey().notNull(),
  roomId: uuid("room_id").notNull(),
  specialtyName: text("specialty_name").notNull(),
  date: text().notNull(),
  allocatedBy: uuid("allocated_by"),
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  uniqueIndex("room_allocations_room_date_idx").on(table.roomId, table.date),
  uniqueIndex("room_allocations_spec_date_idx").on(table.specialtyName, table.date),
  foreignKey({
    columns: [table.roomId],
    foreignColumns: [rooms.id],
    name: "room_allocations_room_id_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.allocatedBy],
    foreignColumns: [users.id],
    name: "room_allocations_allocated_by_fkey",
  }).onUpdate("cascade").onDelete("set null"),
]);

export const roomsRelations = relations(rooms, ({ many }) => ({
  allocations: many(roomAllocations),
}));

export const roomAllocationsRelations = relations(roomAllocations, ({ one }) => ({
  room: one(rooms, {
    fields: [roomAllocations.roomId],
    references: [rooms.id],
  }),
  user: one(users, {
    fields: [roomAllocations.allocatedBy],
    references: [users.id],
  }),
}));

// --- ANVISA Medications Catalog ---
export const medicineLaboratories = pgTable("medicine_laboratories", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  cnpj: text().notNull(),
  corporateName: text("corporate_name").notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  uniqueIndex("medicine_laboratories_cnpj_key").on(table.cnpj),
  index("medicine_laboratories_name_idx").on(table.corporateName),
]);

export const medicineSubstances = pgTable("medicine_substances", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  name: text().notNull(),
  code: text(),
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  uniqueIndex("medicine_substances_name_key").on(table.name),
  index("medicine_substances_code_idx").on(table.code),
]);

export const medications = pgTable("medications", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  name: text().notNull(),
  processNumber: text("process_number"),
  registrationNumber: text("registration_number"),
  laboratoryId: uuid("laboratory_id"),
  category: text(),
  referenceMedicine: text("reference_medicine"),
  stripe: text(),
  status: text().default('Ativo').notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  substanceDescription: text("substance_description"),
  dosage: text(),
  substanceWithDosage: text("substance_with_dosage"),
  complement: text(),
  atcCode: text("atc_code"),
  searchText: text("search_text"),
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("medications_name_idx").on(table.name),
  index("medications_is_active_idx").on(table.isActive),
  index("medications_lab_id_idx").on(table.laboratoryId),
  index("medications_reg_num_idx").on(table.registrationNumber),
  foreignKey({
    columns: [table.laboratoryId],
    foreignColumns: [medicineLaboratories.id],
    name: "medications_laboratory_id_fkey",
  }).onUpdate("cascade").onDelete("set null"),
]);

export const medicationSubstances = pgTable("medication_substances", {
  medicationId: uuid("medication_id").notNull(),
  substanceId: uuid("substance_id").notNull(),
  dosage: text(),
}, (table) => [
  primaryKey({ columns: [table.medicationId, table.substanceId], name: "medication_substances_pkey" }),
  index("medication_substances_substance_id_idx").on(table.substanceId),
  foreignKey({
    columns: [table.medicationId],
    foreignColumns: [medications.id],
    name: "medication_substances_medication_id_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.substanceId],
    foreignColumns: [medicineSubstances.id],
    name: "medication_substances_substance_id_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
]);

export const medicineLaboratoriesRelations = relations(medicineLaboratories, ({ many }) => ({
  medications: many(medications),
}));

export const medicationsRelations = relations(medications, ({ one, many }) => ({
  laboratory: one(medicineLaboratories, {
    fields: [medications.laboratoryId],
    references: [medicineLaboratories.id],
  }),
  medicationSubstances: many(medicationSubstances),
}));

export const medicineSubstancesRelations = relations(medicineSubstances, ({ many }) => ({
  medicationSubstances: many(medicationSubstances),
}));

export const medicationSubstancesRelations = relations(medicationSubstances, ({ one }) => ({
  medication: one(medications, {
    fields: [medicationSubstances.medicationId],
    references: [medications.id],
  }),
  substance: one(medicineSubstances, {
    fields: [medicationSubstances.substanceId],
    references: [medicineSubstances.id],
  }),
}));

// ==========================================
// REGULAÇÃO MUNICIPAL (SINPeP REGULAÇÃO)
// ==========================================

export const regulationRequestTypeEnum = pgEnum("regulation_request_type", ["CONSULTA", "EXAME", "PROCEDIMENTO"]);
export const regulationRequestPriorityEnum = pgEnum("regulation_request_priority", ["ELETIVO", "PRIORITARIO", "URGENTE"]);
export const regulationRequestStatusEnum = pgEnum("regulation_request_status", [
  "PENDENTE_REGULACAO",
  "PENDENTE_AGENDAMENTO",
  "AGENDADA",
  "DEVOLVIDA",
  "NEGADA",
  "AGENDAMENTO_CANCELADO",
  "CANCELADA"
]);

export const regulationRequests = pgTable("regulation_requests", {
  id: uuid().primaryKey().notNull(),
  protocolNumber: text("protocol_number").notNull(),
  patientId: uuid("patient_id").notNull(),
  requestingHealthCenterId: uuid("requesting_health_center_id").notNull(),
  requestingUserId: uuid("requesting_user_id").notNull(),
  attendingDoctorId: uuid("attending_doctor_id"),

  type: regulationRequestTypeEnum("type").notNull(),
  specialtyId: uuid("specialty_id"),
  procedureId: uuid("procedure_id"),
  procedureGroupId: uuid("procedure_group_id"),

  cid10: text().notNull(),
  clinicalJustification: text("clinical_justification").notNull(),
  clinicalHistory: text("clinical_history"),
  priority: regulationRequestPriorityEnum("priority").default("ELETIVO").notNull(),
  status: regulationRequestStatusEnum("status").default("PENDENTE_REGULACAO").notNull(),

  executingHealthCenterId: uuid("executing_health_center_id"),
  scheduledDate: text("scheduled_date"),
  scheduledTime: text("scheduled_time"),
  confirmationToken: text("confirmation_token"),
  scheduledByUserId: uuid("scheduled_by_user_id"),
  tokenValidatedAt: timestamp("token_validated_at", { precision: 3, mode: 'string' }),
  tokenValidatedByUserId: uuid("token_validated_by_user_id"),
  groupProcedures: jsonb("group_procedures").$type<Array<{ procedureId?: string; code: string; sigtapCode?: string; name: string }>>().default([]),
  clinicalScore: integer("clinical_score").default(0).notNull(),
  scoreBreakdown: jsonb("score_breakdown").$type<{
    waitingPoints: number;
    priorityPoints: number;
    elderlyPoints: number;
    pcdPoints: number;
    totalScore: number;
  }>(),

  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  uniqueIndex("regulation_requests_protocol_key").using("btree", table.protocolNumber.asc().nullsLast().op("text_ops")),
  foreignKey({
    columns: [table.patientId],
    foreignColumns: [patients.id],
    name: "regulation_requests_patient_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.requestingHealthCenterId],
    foreignColumns: [healthCenters.id],
    name: "regulation_requests_requesting_health_center_id_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  foreignKey({
    columns: [table.requestingUserId],
    foreignColumns: [users.id],
    name: "regulation_requests_requesting_user_id_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  foreignKey({
    columns: [table.attendingDoctorId],
    foreignColumns: [users.id],
    name: "regulation_requests_attending_doctor_id_fkey"
  }).onUpdate("cascade").onDelete("set null"),
  foreignKey({
    columns: [table.specialtyId],
    foreignColumns: [specialties.id],
    name: "regulation_requests_specialty_id_fkey"
  }).onUpdate("cascade").onDelete("set null"),
  foreignKey({
    columns: [table.procedureId],
    foreignColumns: [procedures.id],
    name: "regulation_requests_procedure_id_fkey"
  }).onUpdate("cascade").onDelete("set null"),
  foreignKey({
    columns: [table.procedureGroupId],
    foreignColumns: [procedureGroups.id],
    name: "regulation_requests_procedure_group_id_fkey"
  }).onUpdate("cascade").onDelete("set null"),
  foreignKey({
    columns: [table.executingHealthCenterId],
    foreignColumns: [healthCenters.id],
    name: "regulation_requests_executing_health_center_id_fkey"
  }).onUpdate("cascade").onDelete("set null"),
  index("regulation_requests_status_score_idx").on(table.status, table.clinicalScore.desc(), table.createdAt.asc()),
]);

export const regulationRequestAttachments = pgTable("regulation_request_attachments", {
  id: uuid().primaryKey().notNull(),
  requestId: uuid("request_id").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.requestId],
    foreignColumns: [regulationRequests.id],
    name: "regulation_request_attachments_request_id_fkey"
  }).onUpdate("cascade").onDelete("cascade")
]);

export const regulationStatusHistory = pgTable("regulation_status_history", {
  id: uuid().primaryKey().notNull(),
  requestId: uuid("request_id").notNull(),
  previousStatus: regulationRequestStatusEnum("previous_status"),
  newStatus: regulationRequestStatusEnum("new_status").notNull(),
  justification: text().notNull(),
  actionByUserId: uuid("action_by_user_id").notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.requestId],
    foreignColumns: [regulationRequests.id],
    name: "regulation_status_history_request_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.actionByUserId],
    foreignColumns: [users.id],
    name: "regulation_status_history_action_by_user_id_fkey"
  }).onUpdate("cascade").onDelete("restrict")
]);

export const regulationQuotas = pgTable("regulation_quotas", {
  id: uuid().primaryKey().notNull(),
  executingHealthCenterId: uuid("executing_health_center_id").notNull(),
  type: regulationRequestTypeEnum("type").notNull(),
  specialtyId: uuid("specialty_id"),
  procedureId: uuid("procedure_id"),
  doctorId: uuid("doctor_id"),

  targetDate: text("target_date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time"),
  intervalMinutes: integer("interval_minutes").default(20),

  totalSlots: integer("total_slots").default(10).notNull(),
  reservedSlots: integer("reserved_slots").default(0).notNull(),

  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.executingHealthCenterId],
    foreignColumns: [healthCenters.id],
    name: "regulation_quotas_executing_health_center_id_fkey"
  }).onUpdate("cascade").onDelete("restrict")
]);

export const regulationRequestsRelations = relations(regulationRequests, ({ one, many }) => ({
  patient: one(patients, {
    fields: [regulationRequests.patientId],
    references: [patients.id],
  }),
  requestingHealthCenter: one(healthCenters, {
    fields: [regulationRequests.requestingHealthCenterId],
    references: [healthCenters.id],
  }),
  requestingUser: one(users, {
    fields: [regulationRequests.requestingUserId],
    references: [users.id],
  }),
  attendingDoctor: one(users, {
    fields: [regulationRequests.attendingDoctorId],
    references: [users.id],
  }),
  specialty: one(specialties, {
    fields: [regulationRequests.specialtyId],
    references: [specialties.id],
  }),
  procedure: one(procedures, {
    fields: [regulationRequests.procedureId],
    references: [procedures.id],
  }),
  procedureGroup: one(procedureGroups, {
    fields: [regulationRequests.procedureGroupId],
    references: [procedureGroups.id],
  }),
  executingHealthCenter: one(healthCenters, {
    fields: [regulationRequests.executingHealthCenterId],
    references: [healthCenters.id],
  }),
  scheduledByUser: one(users, {
    fields: [regulationRequests.scheduledByUserId],
    references: [users.id],
  }),
  tokenValidatedByUser: one(users, {
    fields: [regulationRequests.tokenValidatedByUserId],
    references: [users.id],
  }),
  attachments: many(regulationRequestAttachments),
  statusHistory: many(regulationStatusHistory),
}));

export const regulationRequestAttachmentsRelations = relations(regulationRequestAttachments, ({ one }) => ({
  request: one(regulationRequests, {
    fields: [regulationRequestAttachments.requestId],
    references: [regulationRequests.id],
  }),
}));

export const regulationStatusHistoryRelations = relations(regulationStatusHistory, ({ one }) => ({
  request: one(regulationRequests, {
    fields: [regulationStatusHistory.requestId],
    references: [regulationRequests.id],
  }),
  actionByUser: one(users, {
    fields: [regulationStatusHistory.actionByUserId],
    references: [users.id],
  }),
}));

export const regulationQuotasRelations = relations(regulationQuotas, ({ one }) => ({
  executingHealthCenter: one(healthCenters, {
    fields: [regulationQuotas.executingHealthCenterId],
    references: [healthCenters.id],
  }),
  specialty: one(specialties, {
    fields: [regulationQuotas.specialtyId],
    references: [specialties.id],
  }),
  procedure: one(procedures, {
    fields: [regulationQuotas.procedureId],
    references: [procedures.id],
  }),
  doctor: one(users, {
    fields: [regulationQuotas.doctorId],
    references: [users.id],
  }),
}));

export const municipalityBrandings = pgTable("municipality_brandings", {
  id: uuid("id").primaryKey().notNull(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  fullName: text("full_name").notNull(),
  department: text("department").notNull(),
  networkName: text("network_name").default("Rede de Atenção à Saúde").notNull(),
  systemTitle: text("system_title").default("SINPeP").notNull(),
  systemSubtitle: text("system_subtitle").notNull(),
  description: text("description"),
  badgeText: text("badge_text").default("Gestão Clínica e Assistencial").notNull(),
  coatOfArmsUrl: text("coat_of_arms_url").notNull(),
  logoUrl: text("logo_url"),
  primaryGradientStart: text("primary_gradient_start").default("#003366").notNull(),
  primaryGradientEnd: text("primary_gradient_end").default("#001c3a").notNull(),
  footerText: text("footer_text").default("Acesso restrito a profissionais autorizados • Uso Institucional"),
  supportContact: text("support_contact"),
  isDefault: boolean("is_default").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  uniqueIndex("municipality_brandings_slug_key").using("btree", table.slug.asc().nullsLast().op("text_ops")),
]);

// ==========================================
// AGENDAS & ESCALAS DE ATENDIMENTO (REGULAÇÃO)
// ==========================================

export const scheduleSlotTypeEnum = pgEnum("schedule_slot_type", [
  "PRIMEIRA_VEZ",
  "RETORNO",
  "RESERVA_REGULADOR"
]);

export const scheduleSlotStatusEnum = pgEnum("schedule_slot_status", [
  "DISPONIVEL",
  "AGENDADO",
  "CANCELADO",
  "BLOQUEADO"
]);

export const schedules = pgTable("schedules", {
  id: uuid("id").primaryKey().notNull(),
  executingHealthCenterId: uuid("executing_health_center_id").notNull(),
  scheduleType: text("schedule_type").default('CONSULTA').notNull(),
  procedureId: uuid("procedure_id"),
  procedureGroupId: uuid("procedure_group_id"),
  doctorId: uuid("doctor_id").notNull(),
  cbo: text("cbo").notNull(),
  enabledProcedureIds: text("enabled_procedure_ids").array().default(sql`ARRAY[]::text[]`),
  
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  endDate: text("end_date").notNull(), // YYYY-MM-DD (máx. 180 dias)
  startTime: text("start_time").notNull(), // HH:mm
  endTime: text("end_time").notNull(), // HH:mm
  
  daysOfWeek: text("days_of_week").array().notNull(), // ['QUARTA', 'SEXTA']
  
  firstTimeQuantity: integer("first_time_quantity").default(0).notNull(),
  firstTimeMinutes: integer("first_time_minutes").default(0).notNull(),
  returnQuantity: integer("return_quantity").default(0).notNull(),
  returnMinutes: integer("return_minutes").default(0).notNull(),
  regulatorReservedQuantity: integer("regulator_reserved_quantity").default(0).notNull(),
  regulatorReservedMinutes: integer("regulator_reserved_minutes").default(0).notNull(),
  
  autoSlotSplit: boolean("auto_slot_split").default(false).notNull(),
  isLocalSchedule: boolean("is_local_schedule").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  notes: text("notes"),
  blockedDates: text("blocked_dates").array().default(sql`ARRAY[]::text[]`),
  
  createdByUserId: uuid("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("schedules_executing_center_idx").on(table.executingHealthCenterId),
  index("schedules_doctor_idx").on(table.doctorId),
  index("schedules_procedure_idx").on(table.procedureId),
  index("schedules_procedure_group_idx").on(table.procedureGroupId),
  foreignKey({
    columns: [table.executingHealthCenterId],
    foreignColumns: [healthCenters.id],
    name: "schedules_executing_health_center_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.procedureId],
    foreignColumns: [procedures.id],
    name: "schedules_procedure_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.procedureGroupId],
    foreignColumns: [procedureGroups.id],
    name: "schedules_procedure_group_id_fkey"
  }).onUpdate("cascade").onDelete("set null"),
  foreignKey({
    columns: [table.doctorId],
    foreignColumns: [doctors.id],
    name: "schedules_doctor_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.createdByUserId],
    foreignColumns: [users.id],
    name: "schedules_created_by_user_id_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
]);

export const scheduleSlots = pgTable("schedule_slots", {
  id: uuid("id").primaryKey().notNull(),
  scheduleId: uuid("schedule_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  time: text("time").notNull(), // HH:mm
  slotType: scheduleSlotTypeEnum("slot_type").notNull(),
  status: scheduleSlotStatusEnum("status").default("DISPONIVEL").notNull(),
  
  regulationRequestId: uuid("regulation_request_id"),
  patientId: uuid("patient_id"),
  bookedByUserId: uuid("booked_by_user_id"),
  bookedAt: timestamp("booked_at", { precision: 3, mode: 'string' }),
  
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("schedule_slots_schedule_idx").on(table.scheduleId),
  index("schedule_slots_date_idx").on(table.date),
  index("schedule_slots_status_idx").on(table.status),
  foreignKey({
    columns: [table.scheduleId],
    foreignColumns: [schedules.id],
    name: "schedule_slots_schedule_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.regulationRequestId],
    foreignColumns: [regulationRequests.id],
    name: "schedule_slots_regulation_request_id_fkey"
  }).onUpdate("cascade").onDelete("set null"),
  foreignKey({
    columns: [table.patientId],
    foreignColumns: [patients.id],
    name: "schedule_slots_patient_id_fkey"
  }).onUpdate("cascade").onDelete("set null"),
  foreignKey({
    columns: [table.bookedByUserId],
    foreignColumns: [users.id],
    name: "schedule_slots_booked_by_user_id_fkey"
  }).onUpdate("cascade").onDelete("set null"),
]);

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  executingHealthCenter: one(healthCenters, {
    fields: [schedules.executingHealthCenterId],
    references: [healthCenters.id],
  }),
  procedure: one(procedures, {
    fields: [schedules.procedureId],
    references: [procedures.id],
  }),
  procedureGroup: one(procedureGroups, {
    fields: [schedules.procedureGroupId],
    references: [procedureGroups.id],
  }),
  doctor: one(doctors, {
    fields: [schedules.doctorId],
    references: [doctors.id],
  }),
  createdByUser: one(users, {
    fields: [schedules.createdByUserId],
    references: [users.id],
  }),
  slots: many(scheduleSlots),
}));

export const scheduleSlotsRelations = relations(scheduleSlots, ({ one }) => ({
  schedule: one(schedules, {
    fields: [scheduleSlots.scheduleId],
    references: [schedules.id],
  }),
  regulationRequest: one(regulationRequests, {
    fields: [scheduleSlots.regulationRequestId],
    references: [regulationRequests.id],
  }),
  patient: one(patients, {
    fields: [scheduleSlots.patientId],
    references: [patients.id],
  }),
  bookedByUser: one(users, {
    fields: [scheduleSlots.bookedByUserId],
    references: [users.id],
  }),
}));

// ==========================================
// 15. FILA DE ESPERA & AGENDAMENTO AUTOMÁTICO
// ==========================================

export const autoSchedulingRules = pgTable("auto_scheduling_rules", {
  id: uuid("id").primaryKey().notNull(),
  procedureId: uuid("procedure_id"),
  procedureGroupId: uuid("procedure_group_id"),
  ruleName: text("rule_name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),

  // Pesos do Algoritmo de Score
  weightWaitingDays: integer("weight_waiting_days").default(1).notNull(),
  weightPriorityUrgency: integer("weight_priority_urgency").default(500).notNull(),
  weightPriorityPriority: integer("weight_priority_priority").default(200).notNull(),
  weightElderly80Plus: integer("weight_elderly_80_plus").default(300).notNull(),
  weightElderly60Plus: integer("weight_elderly_60_plus").default(100).notNull(),
  weightPcd: integer("weight_pcd").default(150).notNull(),

  // Parâmetros Operacionais
  minLeadTimeDays: integer("min_lead_time_days").default(3).notNull(),
  maxScheduleHorizonDays: integer("max_schedule_horizon_days").default(60).notNull(),
  respectHealthCenterQuotas: boolean("respect_health_center_quotas").default(true).notNull(),
  allowAutoExecution: boolean("allow_auto_execution").default(true).notNull(),

  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.procedureId],
    foreignColumns: [procedures.id],
    name: "auto_scheduling_rules_procedure_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.procedureGroupId],
    foreignColumns: [procedureGroups.id],
    name: "auto_scheduling_rules_procedure_group_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
]);

export const autoSchedulingRuns = pgTable("auto_scheduling_runs", {
  id: uuid("id").primaryKey().notNull(),
  executedAt: timestamp("executed_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  mode: text("mode").notNull(), // 'SIMULACAO' | 'EFETIVO_MANUAL' | 'EFETIVO_AUTOMATICO_CRON'
  triggeredByUserId: uuid("triggered_by_user_id"),
  totalRequestsEvaluated: integer("total_requests_evaluated").default(0).notNull(),
  totalSlotsAvailable: integer("total_slots_available").default(0).notNull(),
  totalMatchesCreated: integer("total_matches_created").default(0).notNull(),
  status: text("status").default('SUCESSO').notNull(), // 'SUCESSO' | 'PARCIAL' | 'CANCELADO'
  notes: text("notes"),
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.triggeredByUserId],
    foreignColumns: [users.id],
    name: "auto_scheduling_runs_triggered_by_user_id_fkey"
  }).onUpdate("cascade").onDelete("set null"),
]);

export const autoSchedulingMatches = pgTable("auto_scheduling_matches", {
  id: uuid("id").primaryKey().notNull(),
  runId: uuid("run_id").notNull(),
  regulationRequestId: uuid("regulation_request_id").notNull(),
  scheduleSlotId: uuid("schedule_slot_id").notNull(),
  calculatedScore: numeric("calculated_score", { precision: 10, scale: 2 }).notNull(),
  scoreBreakdownJson: text("score_breakdown_json"),
  status: text("status").default('PENDENTE_APROVACAO').notNull(), // 'PENDENTE_APROVACAO' | 'CONFIRMADO' | 'DESCARTADO'
  confirmedAt: timestamp("confirmed_at", { precision: 3, mode: 'string' }),
  confirmedByUserId: uuid("confirmed_by_user_id"),
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.runId],
    foreignColumns: [autoSchedulingRuns.id],
    name: "auto_scheduling_matches_run_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.regulationRequestId],
    foreignColumns: [regulationRequests.id],
    name: "auto_scheduling_matches_regulation_request_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.scheduleSlotId],
    foreignColumns: [scheduleSlots.id],
    name: "auto_scheduling_matches_schedule_slot_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.confirmedByUserId],
    foreignColumns: [users.id],
    name: "auto_scheduling_matches_confirmed_by_user_id_fkey"
  }).onUpdate("cascade").onDelete("set null"),
]);

export const autoSchedulingRulesRelations = relations(autoSchedulingRules, ({ one }) => ({
  procedure: one(procedures, {
    fields: [autoSchedulingRules.procedureId],
    references: [procedures.id],
  }),
  procedureGroup: one(procedureGroups, {
    fields: [autoSchedulingRules.procedureGroupId],
    references: [procedureGroups.id],
  }),
}));

export const autoSchedulingRunsRelations = relations(autoSchedulingRuns, ({ one, many }) => ({
  triggeredByUser: one(users, {
    fields: [autoSchedulingRuns.triggeredByUserId],
    references: [users.id],
  }),
  matches: many(autoSchedulingMatches),
}));

export const autoSchedulingMatchesRelations = relations(autoSchedulingMatches, ({ one }) => ({
  run: one(autoSchedulingRuns, {
    fields: [autoSchedulingMatches.runId],
    references: [autoSchedulingRuns.id],
  }),
  regulationRequest: one(regulationRequests, {
    fields: [autoSchedulingMatches.regulationRequestId],
    references: [regulationRequests.id],
  }),
  scheduleSlot: one(scheduleSlots, {
    fields: [autoSchedulingMatches.scheduleSlotId],
    references: [scheduleSlots.id],
  }),
  confirmedByUser: one(users, {
    fields: [autoSchedulingMatches.confirmedByUserId],
    references: [users.id],
  }),
}));

// ==========================================
// E-SUS REGULAÇÃO: HISTÓRICO DE IMPORTAÇÕES
// ==========================================

export const esusImportJobs = pgTable("esus_import_jobs", {
  id: uuid().primaryKey().notNull(),
  startedAt: timestamp("started_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  finishedAt: timestamp("finished_at", { precision: 3, mode: 'string' }),
  status: text().default("RUNNING").notNull(), // 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'
  dateRangeStart: text("date_range_start"),
  dateRangeEnd: text("date_range_end"),
  totalRecordsFound: integer("total_records_found").default(0).notNull(),
  totalRecordsProcessed: integer("total_records_processed").default(0).notNull(),
  patientsCreated: integer("patients_created").default(0).notNull(),
  patientsUpdated: integer("patients_updated").default(0).notNull(),
  patientsDeceasedSkipped: integer("patients_deceased_skipped").default(0).notNull(),
  requestsCreated: integer("requests_created").default(0).notNull(),
  requestsUpdated: integer("requests_updated").default(0).notNull(),
  requestsSkippedStatus: integer("requests_skipped_status").default(0).notNull(),
  errorMessage: text("error_message"),
  createdByUserId: uuid("created_by_user_id"),
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.createdByUserId],
    foreignColumns: [users.id],
    name: "esus_import_jobs_created_by_user_id_fkey"
  }).onUpdate("cascade").onDelete("set null")
]);

export const esusImportJobsRelations = relations(esusImportJobs, ({ one }) => ({
  createdByUser: one(users, {
    fields: [esusImportJobs.createdByUserId],
    references: [users.id],
  }),
}));

export const dashboardNotices = pgTable("dashboard_notices", {
  id: uuid().primaryKey().notNull(),
  title: text().notNull(),
  content: text().notNull(),
  type: text().default('INFO').notNull(), // 'INFO' | 'WARNING' | 'URGENT'
  scope: text().default('GLOBAL').notNull(), // 'GLOBAL' | 'HEALTH_CENTER'
  healthCenterId: uuid("health_center_id"),
  authorId: uuid("author_id").notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  expiresAt: timestamp("expires_at", { precision: 3, mode: 'string' }),
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull(),
}, (table) => [
  index("dashboard_notices_active_idx").using("btree", table.isActive, table.scope),
  index("dashboard_notices_hc_idx").using("btree", table.healthCenterId),
  foreignKey({
    columns: [table.healthCenterId],
    foreignColumns: [healthCenters.id],
    name: "dashboard_notices_health_center_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.authorId],
    foreignColumns: [users.id],
    name: "dashboard_notices_author_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
]);

export const dashboardNoticesRelations = relations(dashboardNotices, ({ one }) => ({
  author: one(users, {
    fields: [dashboardNotices.authorId],
    references: [users.id],
  }),
  healthCenter: one(healthCenters, {
    fields: [dashboardNotices.healthCenterId],
    references: [healthCenters.id],
  }),
}));

// ==========================================
// BOLETIM DE PRODUÇÃO AMBULATORIAL (BPA)
// ==========================================

export const bpaBatches = pgTable("bpa_batches", {
  id: uuid().primaryKey().notNull(),
  competencia: text("competencia").notNull(), // AAAA-MM
  healthCenterId: uuid("health_center_id").notNull(),
  totalRecords: integer("total_records").notNull(),
  sha256Hash: text("sha256_hash").notNull(),
  fileContent: text("file_content").notNull(),
  metadata: jsonb("metadata").default({}),
  createdById: uuid("created_by_id").notNull(),
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("bpa_batches_comp_unit_idx").using("btree", table.competencia, table.healthCenterId),
  foreignKey({
    columns: [table.healthCenterId],
    foreignColumns: [healthCenters.id],
    name: "bpa_batches_health_center_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
  foreignKey({
    columns: [table.createdById],
    foreignColumns: [users.id],
    name: "bpa_batches_created_by_id_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
]);

export const bpaBatchesRelations = relations(bpaBatches, ({ one }) => ({
  healthCenter: one(healthCenters, {
    fields: [bpaBatches.healthCenterId],
    references: [healthCenters.id],
  }),
  createdBy: one(users, {
    fields: [bpaBatches.createdById],
    references: [users.id],
  }),
}));

export const bpaExportRules = pgTable("bpa_export_rules", {
  id: uuid().primaryKey().notNull(),
  healthCenterId: uuid("health_center_id"),
  procedureCode: text("procedure_code").notNull(),
  cboOverride: text("cbo_override").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.healthCenterId],
    foreignColumns: [healthCenters.id],
    name: "bpa_export_rules_health_center_id_fkey"
  }).onUpdate("cascade").onDelete("cascade"),
]);

export const bpaExportRulesRelations = relations(bpaExportRules, ({ one }) => ({
  healthCenter: one(healthCenters, {
    fields: [bpaExportRules.healthCenterId],
    references: [healthCenters.id],
  }),
}));







