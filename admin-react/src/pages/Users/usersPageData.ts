import type { RealmRole, RealmRow, UserTypeRow } from "./usersPageTypes";

export const USER_TYPES_DATA: UserTypeRow[] = [
  {
    id: "certis-full",
    title: "Certis Full User",
    desc: "Users with valid Certis employee/contractor ID and email address",
    username: "xxx@certis.com",
    fa1: "Password",
    fa2: ["TOTP"],
    useCase: "Web application and mobile app access",
  },
  {
    id: "certis-contractor",
    title: "Certis Contractor",
    desc: "Certis contractor with contractor ID and Certis email address",
    username: "xxx@certis.com",
    fa1: "Password",
    fa2: ["TOTP", "Additional Email OTP required once a day"],
    useCase: "Web application and mobile app access",
  },
  {
    id: "certis-half",
    title: "Certis Half User",
    desc: "Users with valid Certis employee ID only",
    username: "Certis Employee ID",
    fa1: "Password",
    fa2: ["Staff Card (NFC) + PIN"],
    useCase: "Mobile app access only",
  },
  {
    id: "external",
    title: "External Users",
    desc: "External users identified by their company email address",
    username: "External user company email address",
    fa1: "Password",
    fa2: ["TOTP", "Additional Email OTP required once a day"],
    useCase: "Web application and mobile app access",
  },
  {
    id: "local-user",
    title: "Local User",
    desc: "For scenarios where all other user types are not suitable. E.g. break glass account.",
    username: "Custom Username",
    fa1: "Password",
    fa2: ["Yubikey + PIN", "TOTP"],
    useCase: "Web application and mobile app access",
  },
];

export const ROLES_DATA: RealmRole[] = [
  {
    id: "realm_admin",
    name: "Realm Administrator",
    permissions: ["realm:read", "realm:write", "realm:delete", "user:read", "user:write", "user:delete", "app:read", "app:write", "app:delete"],
  },
  {
    id: "realm_manager",
    name: "Realm Manager",
    permissions: ["realm:read", "realm:write", "user:read", "user:write", "app:read", "app:write"],
  },
  {
    id: "realm_auditor",
    name: "Realm Auditor",
    permissions: ["realm:read", "user:read", "app:read"],
  },
  {
    id: "realm_user",
    name: "Standard User",
    permissions: ["realm:read", "user:read"],
  },
  {
    id: "realm_restricted",
    name: "Restricted User",
    permissions: ["realm:read"],
  },
];

export const REALMS_DATA: RealmRow[] = [
  { id: "root", name: "Root Realm", status: "Active" },
  { id: "ops", name: "Operations", status: "Active" },
  { id: "finance", name: "Finance", status: "Active" },
];