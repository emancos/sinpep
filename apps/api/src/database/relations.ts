import { relations } from "drizzle-orm/relations";
import { profiles, users, userCustomPermissions, permissions, healthCenters, healthAgents, patients, patientPhones, doctors, profilePermissions, doctorSpecialties, specialties } from "./schema";

export const usersRelations = relations(users, ({one, many}) => ({
	profile: one(profiles, {
		fields: [users.profileId],
		references: [profiles.id]
	}),
	userCustomPermissions: many(userCustomPermissions),
	healthAgents: many(healthAgents),
	doctors: many(doctors),
}));

export const profilesRelations = relations(profiles, ({many}) => ({
	users: many(users),
	profilePermissions: many(profilePermissions),
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
}));

export const patientPhonesRelations = relations(patientPhones, ({one}) => ({
	patient: one(patients, {
		fields: [patientPhones.patientId],
		references: [patients.id]
	}),
}));

export const doctorsRelations = relations(doctors, ({one, many}) => ({
	user: one(users, {
		fields: [doctors.userId],
		references: [users.id]
	}),
	doctorSpecialties: many(doctorSpecialties),
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

export const specialtiesRelations = relations(specialties, ({many}) => ({
	doctorSpecialties: many(doctorSpecialties),
}));