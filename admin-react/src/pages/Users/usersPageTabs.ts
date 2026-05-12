import type { Tab } from "../../hooks/useTabs";

export function findTabIndexByType(tabs: Tab[], type: string): number {
  return tabs.findIndex((tab) => tab.type === type);
}

export function getUsersAddButtonLabel(currentTab?: Tab): string {
  if (currentTab?.type === "usertypes" || currentTab?.type === "usertypes-detail") {
    return "New User Type";
  }

  return "New User";
}

export function getCreateTabConfig(currentTab?: Tab): {
  createType: "create-user" | "create-role" | "create-usertypes";
  title: string;
} {
  if (currentTab?.type === "users" || currentTab?.type === "user-detail" || currentTab?.type === "create-user") {
    return { createType: "create-user", title: "New User" };
  }

  if (currentTab?.type === "roles" || currentTab?.type === "role-detail" || currentTab?.type === "create-role") {
    return { createType: "create-role", title: "New Role" };
  }

  return { createType: "create-usertypes", title: "New User Type" };
}