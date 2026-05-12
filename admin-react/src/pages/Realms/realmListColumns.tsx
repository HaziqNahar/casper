import { TableColumn } from "../../components/common/DataTable";
import { Badge, LinkCell } from "../../components/common/Badge";
import { RowActionMenu } from "../../components/common/RowsActionMenu";
import { RealmRow } from "../../types";
import { ConfirmState } from "./ConfirmDialog";
import { RealmStatus } from "./realmTypes";
import { realmStatusIcon, realmStatusVariant } from "./realmStatus";

const isValidDate = (date: Date) => !Number.isNaN(date.getTime());

const safeDate = (value: unknown) => {
    if (!value) return null;
    if (value instanceof Date) return isValidDate(value) ? value : null;

    const raw = String(value).trim();
    if (!raw || raw === "-") return null;

    const parsed = new Date(raw);
    return isValidDate(parsed) ? parsed : null;
};

const formatAbsolute = (date: Date) =>
    new Intl.DateTimeFormat("en-SG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(date);

const formatFull = (date: Date) =>
    new Intl.DateTimeFormat("en-SG", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZoneName: "short",
    }).format(date);

const formatRelative = (date: Date) => {
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
};

export const createRealmColumns = (
    onView: (row: RealmRow) => void,
    onToggleRealm: (row: RealmRow, input?: { password?: string; justification?: string }) => void | Promise<void>,
    openConfirmDialog: (next: Omit<ConfirmState, "open">) => void,
    pendingByRealm: Record<string, number>,
    appCountByRealm: Record<string, number>,
    isSuperAdmin: boolean
): TableColumn<RealmRow>[] => [
    {
        key: "name",
        label: "Realm",
        width: "200px",
        render: (value, row) => <LinkCell onClick={() => onView(row)}>{value as string}</LinkCell>,
    },
    {
        key: "status",
        label: "Status",
        width: "140px",
        align: "center",
        render: (value) => (
            <Badge variant={realmStatusVariant(value as RealmStatus)}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                    {realmStatusIcon(value as RealmStatus)}
                    {value as string}
                </span>
            </Badge>
        ),
    },
    {
        key: "userCount",
        label: "Users",
        width: "110px",
        align: "center",
        render: (value) => Number(value ?? 0),
    },
    {
        key: "id",
        label: "Applications",
        width: "140px",
        align: "center",
        sortable: false,
        render: (_value, row) => appCountByRealm[row.id] ?? 0,
    },
    {
        key: "updatedAt",
        label: "Last Updated",
        width: "120px",
        render: (value) => {
            const date = safeDate(value);
            if (!date) return "-";

            return (
                <span className="kc-datetime" title={formatFull(date)}>
                    {formatAbsolute(date)}
                    <span className="kc-datetime-sub">{formatRelative(date)}</span>
                </span>
            );
        },
    },
    {
        key: "id",
        label: "Actions",
        width: "120px",
        align: "left",
        sortable: false,
        render: (_value, row) => (
            <RowActionMenu
                actions={[
                    { label: "View", onClick: () => onView(row) },
                    {
                        label: row.status === "Active" ? "Deactivate" : "Activate",
                        danger: row.status === "Active",
                        onClick: () => {
                            if (row.status === "Active") {
                                openConfirmDialog({
                                    title: isSuperAdmin ? "Deactivate Realm?" : "Request Realm Deactivation?",
                                    message: isSuperAdmin
                                        ? `You are about to deactivate ${row.name}.`
                                        : `Submit a super admin approval request to deactivate ${row.name}.`,
                                    details: [
                                        `${row.userCount} user${row.userCount === 1 ? "" : "s"} currently assigned`,
                                        `${pendingByRealm[row.id] ?? 0} pending access request${(pendingByRealm[row.id] ?? 0) === 1 ? "" : "s"}`,
                                        isSuperAdmin
                                            ? "Users in this realm may lose access to linked applications"
                                            : "Users in this realm may lose access to linked applications once the request is approved",
                                    ],
                                    confirmText: isSuperAdmin ? "Deactivate" : "Submit approval request",
                                    cancelText: "Cancel",
                                    danger: true,
                                    confirmLabel: isSuperAdmin
                                        ? `Type "${row.name}" to confirm deactivation`
                                        : `Type "${row.name}" to confirm this approval request`,
                                    confirmMatchText: row.name,
                                    confirmHelperText: isSuperAdmin
                                        ? "This safeguard helps prevent accidental deactivation."
                                        : "This request will be routed to a super admin for review.",
                                    requirePassword: isSuperAdmin,
                                    passwordLabel: isSuperAdmin ? "Re-enter your password to continue" : undefined,
                                    passwordHelperText: isSuperAdmin ? "Only the current signed-in admin can complete this deactivation." : undefined,
                                    requireJustification: true,
                                    justificationLabel: isSuperAdmin ? "Why are you deactivating this realm?" : "Why are you requesting deactivation?",
                                    justificationHelperText: "This reason will be recorded in the audit trail for reviewers.",
                                    justificationPlaceholder: isSuperAdmin ? "Enter the business reason for deactivation" : "Enter the business reason for this approval request",
                                    onConfirm: ({ password, justification }) => onToggleRealm(row, { password, justification }),
                                });
                            } else {
                                onToggleRealm(row);
                            }
                        },
                    },
                ]}
            />
        ),
    },
];