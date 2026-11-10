import { relations } from "drizzle-orm/relations";
import { profiles, users, userProfiles, userHealthCenters, userCustomPermissions, permissions, healthCenters, healthAgents, patients, patientPhones, patientAnamnesis, doctors, profilePermissions, doctorSpecialties, specialties, doctorProcedures, procedures, doctorProcedureGroups, procedureGroups } from "./schema";

export const usersRelations = relations(users, ({one, many}) => ({
	profile: one(profiles, {
		fields: [users.profileId],
		references: [profiles.id]
	}),
	healthCenter: one(healthCenters, {
		fields: [users.healthCenterId],
		references: [healthCenters.id]
	}),
	userProfiles: many(userProfiles),
	userHealthCenters: many(userHealthCenters),
	userCustomPermissions: many(userCustomPermissions),
	healthAgents: many(healthAgents),
	doctors: many(doctors),
}));

export const profilesRelations = relations(profiles, ({many}) => ({
	users: many(users),
	userProfiles: many(userProfiles),
	profilePermissions: many(profilePermissions),
}));

export const userProfilesRelations = relations(userProfiles, ({one}) => ({
	user: one(users, {
		fields: [userProfiles.userId],
		references: [users.id]
	}),
	profile: one(profiles, {
		fields: [userProfiles.profileId],
		references: [profiles.id]
	}),
}));

export const userCustomPermissionsRelations = relations(userCustomPermissions, ({one}) => ({
	user: one(users, {
		fields: [userCustomPermissions.userId],
		references: [users.id]
	}),
	permission: one(permissions, {
		fields: [userCustomPermissions.permissionId],
		references: [permissions.id]
	}),
}));

export const permissionsRelations = relations(permissions, ({many}) => ({
	userCustomPermissions: many(userCustomPermissions),
	profilePermissions: many(profilePermissions),
}));

export const healthAgentsRelations = relations(healthAgents, ({one, many}) => ({
	healthCenter: one(healthCenters, {
		fields: [healthAgents.healthCenterId],
		references: [healthCenters.id]
	}),
	user: one(users, {
		fields: [healthAgents.userId],
		references: [users.id]
	}),
	patients: many(patients),
}));

export const healthCentersRelations = relations(healthCenters, ({many}) => ({
	healthAgents: many(healthAgents),
	patients: many(patients),
	users: many(users),
	userHealthCenters: many(userHealthCenters),
}));

export const userHealthCentersRelations = relations(userHealthCenters, ({one}) => ({
	user: one(users, {
		fields: [userHealthCenters.userId],
		references: [users.id]
	}),
	healthCenter: one(healthCenters, {
		fields: [userHealthCenters.healthCenterId],
		references: [healthCenters.id]
	}),
}));

export const patientsRelations = relations(patients, ({one, many}) => ({
	healthAgent: one(healthAgents, {
		fields: [patients.healthAgentId],
		references: [healthAgents.id]
	}),
	healthCenter: one(healthCenters, {
		fields: [patients.healthCenterId],
		references: [healthCenters.id]
	}),
	patientPhones: many(patientPhones),
	patientAnamnesis: one(patientAnamnesis),
}));

export const patientPhonesRelations = relations(patientPhones, ({one}) => ({
	patient: one(patients, {
		fields: [patientPhones.patientId],
		references: [patients.id]
	}),
}));

export const patientAnamnesisRelations = relations(patientAnamnesis, ({one}) => ({
	patient: one(patients, {
		fields: [patientAnamnesis.patientId],
		references: [patients.id]
	}),
}));

export const doctorsRelations = relations(doctors, ({one, many}) => ({
	user: one(users, {
		fields: [doctors.userId],
		references: [users.id]
	}),
	doctorSpecialties: many(doctorSpecialties),
	doctorProcedures: many(doctorProcedures),
	doctorProcedureGroups: many(doctorProcedureGroups),
}));

export const profilePermissionsRelations = relations(profilePermissions, ({one}) => ({
	profile: one(profiles, {
		fields: [profilePermissions.profileId],
		references: [profiles.id]
	}),
	permission: one(permissions, {
		fields: [profilePermissions.permissionId],
		references: [permissions.id]
	}),
}));

export const doctorSpecialtiesRelations = relations(doctorSpecialties, ({one}) => ({
	doctor: one(doctors, {
		fields: [doctorSpecialties.doctorId],
		references: [doctors.id]
	}),
	specialty: one(specialties, {
		fields: [doctorSpecialties.specialtyId],
		references: [specialties.id]
	}),
}));

export const doctorProceduresRelations = relations(doctorProcedures, ({one}) => ({
	doctor: one(doctors, {
		fields: [doctorProcedures.doctorId],
		references: [doctors.id]
	}),
	procedure: one(procedures, {
		fields: [doctorProcedures.procedureId],
		references: [procedures.id]
	}),
}));

export const specialtiesRelations = relations(specialties, ({many}) => ({
	doctorSpecialties: many(doctorSpecialties),
}));

export const doctorProcedureGroupsRelations = relations(doctorProcedureGroups, ({one}) => ({
	doctor: one(doctors, {
		fields: [doctorProcedureGroups.doctorId],
		references: [doctors.id]
	}),
	procedureGroup: one(procedureGroups, {
		fields: [doctorProcedureGroups.procedureGroupId],
		references: [procedureGroups.id]
	}),
}));

export const procedureGroupsRelations = relations(procedureGroups, ({many}) => ({
	doctorProcedureGroups: many(doctorProcedureGroups),
	procedures: many(procedures),
}));