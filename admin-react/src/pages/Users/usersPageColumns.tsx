import React from "react";
import { CheckCircle, Clock, XCircle } from "lucide-react";

import type { TableColumn } from "../../components/common/DataTable";
import { Badge, LinkCell } from "../../components/common/Badge";
import { RowActionMenu } from "../../components/common/RowsActionMenu";
import type { RealmRole, UserRow, UserTypeRow } from "./usersPageTypes";

export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return "-";

  try {
    const date = new Date(dateStr);
    return date.toLocaleString("en-SG", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function getStatusVariant(status: string): "success" | "warning" | "error" | "default" {
  switch (status) {
    case "Active":
      return "success";
    case "Pending":
      return "warning";
    case "Inactive":
      return "error";
    default:
      return "default";
  }
}

function shouldShowOnboardingStage(status: string, stage?: string | null) {
  if (!stage) return false;
  if (status === "Active" && stage === "Activated") return false;
  if (status === "Inactive" && stage === "Rejected") return false;
  return stage !== status;
}

export function getStatusIcon(status: string) {
  switch (status) {
    case "Active":
      return <CheckCircle size={12} />;
    case "Pending":
      return <Clock size={12} />;
    case "Inactive":
      return <XCircle size={12} />;
    default:
      return null;
  }
}

export function createUserColumns(onView: (row: UserRow) => void): TableColumn<UserRow>[] {
  return [
    {
      key: "username",
      label: "Username",
      width: "220px",
      render: (value, row) => (
        <div className="kc-userPrimaryCell">
          <LinkCell onClick={() => onView(row)}>
            {value as string}
          </LinkCell>
          <span className="kc-userPrimaryMeta">{row.email || row.id}</span>
        </div>
      ),
    },
    {
      key: "firstName",
      label: "Name",
      width: "180px",
      render: (_, row) => `${row.firstName} ${row.lastName}`,
    },
    {
      key: "email",
      label: "Email",
      width: "200px",
      hiddenByDefault: true,
      render: (value) => (value as string) || "-",
    },
    {
      key: "role",
      label: "Role",
      width: "200px",
      render: (value) => (value as string) || "-",
    },
    {
      key: "userType",
      label: "User Type",
      width: "130px",
      render: (value) => <Badge variant="info">{value as string}</Badge>,
    },
    {
      key: "department",
      label: "Department",
      width: "130px",
      render: (value) => (value as string) || "-",
    },
    {
      key: "status",
      label: "Status",
      width: "160px",
      render: (value, row) => (
        <div className="kc-statusCompact">
          <Badge variant={getStatusVariant(value as string)}>
            <span className="kc-statusCompactMain">
              {getStatusIcon(value as string)}
              {value as string}
            </span>
          </Badge>

          {shouldShowOnboardingStage(value as string, row.onboardingStage) && (
            <span className="kc-statusCompactSub">{row.onboardingStage}</span>
          )}

          {row.isBreakGlass && (
            <span className="kc-statusCompactAlert">Break glass</span>
          )}
        </div>
      ),
    },
    {
      key: "lastLogin",
      label: "Last Login",
      width: "160px",
      render: (value) => formatDateTime(value as string),
    },
    {
      key: "id",
      label: "Actions",
      width: "120px",
      align: "left",
      sortable: false,
      render: (_, row) => (
        <RowActionMenu actions={[{ label: "View", onClick: () => onView(row) }]} />
      ),
    },
  ];
}

export function createUserTypeColumns(
  onView: (row: UserTypeRow) => void,
  enabled2FAByType: Record<string, string[]>,
  onToggle2FA: (typeId: string, method: string) => void
): TableColumn<UserTypeRow>[] {
  return [
    {
      key: "title",
      label: "User Type",
      width: "220px",
      render: (value, row) => <LinkCell onClick={() => onView(row)}>{value as string}</LinkCell>,
    },
    {
      key: "fa1",
      label: "1FA",
      width: "140px",
      align: "center",
      render: (value) => <span className="pill pill-neutral">{value as string}</span>,
    },
    {
      key: "fa2",
      label: "2FA",
      width: "320px",
      align: "center",
      sortable: false,
      render: (_value, row) => {
        const enabledSet = new Set(enabled2FAByType?.[row.id] ?? []);

        return (
          <div className="fa2-stack">
            {row.fa2.map((method) => {
              const enabled = enabledSet.has(method);

              return (
                <button
                  key={method}
                  type="button"
                  className={[
                    "pill",
                    "pill-info",
                    "pill-toggle",
                    enabled ? "pill-on" : "pill-off",
                  ].join(" ")}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle2FA(row.id, method);
                  }}
                  aria-pressed={enabled}
                  title={enabled ? "Enabled (click to disable)" : "Disabled (click to enable)"}
                >
                  {method}
                </button>
              );
            })}
          </div>
        );
      },
    },
    {
      key: "id",
      label: "Actions",
      width: "120px",
      align: "left",
      sortable: false,
      render: (_, row) => (
        <RowActionMenu actions={[{ label: "View", onClick: () => onView(row) }]} />
      ),
    },
  ];
}

export function createRoleColumns(onView: (row: RealmRole) => void): TableColumn<RealmRole>[] {
  return [
    {
      key: "id",
      label: "ID",
      width: "80px",
      sortable: false,
      render: (_, row) => row.id,
    },
    {
      key: "name",
      label: "Name",
      width: "200px",
      sortable: false,
      render: (_, row) => <LinkCell onClick={() => onView(row)}>{row.name}</LinkCell>,
    },
    {
      key: "id",
      label: "Actions",
      width: "120px",
      align: "left",
      sortable: false,
      render: (_, row) => (
        <RowActionMenu actions={[{ label: "View", onClick: () => onView(row) }]} />
      ),
    },
  ];
}