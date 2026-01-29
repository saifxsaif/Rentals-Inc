import { UserRole } from "@prisma/client";

export const roleValues: UserRole[] = ["applicant", "reviewer", "admin"];

export function parseRole(rawRole: string | undefined): UserRole {
  if (!rawRole) {
    return "applicant";
  }

  const normalized = rawRole.toLowerCase();
  if (roleValues.includes(normalized as UserRole)) {
    return normalized as UserRole;
  }

  return "applicant";
}

export function canCreateApplication(role: UserRole): boolean {
  return role === "applicant" || role === "admin";
}

export function canViewApplication(role: UserRole): boolean {
  return role === "applicant" || role === "reviewer" || role === "admin";
}
