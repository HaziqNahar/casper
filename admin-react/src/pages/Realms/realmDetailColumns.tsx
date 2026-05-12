import { TableColumn } from "../../components/common/DataTable";
import { Badge } from "../../components/common/Badge";
import SearchableCombobox from "../../components/common/SearchableCombobox";
import { RowActionMenu } from "../../components/common/RowsActionMenu";
import { AppRow, UserRow } from "../../types";
import { Key, Plus } from "lucide-react";
import { RealmRole, RealmRoleId, RealmUserViewRow, UserStatus } from "./realmTypes";

const userStatusVariant = (status: UserStatus): "success" | "warning" | "error" | "default" => {
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
};

const renderInlineSpinner = () => (
    <span className="kc-inlineSpinner" />
);

export const createRealmUsersColumns = (
    roles: RealmRole[],
    onChangeRole: (userUuid: string, roleId: RealmRoleId) => void,
    onViewUser: (userId: string) => void,
    onRemoveFromRealm: (userUuid: string) => void,
    updatingUsers: Set<string>
): TableColumn<RealmUserViewRow>[] => [
    { key: "username", label: "Username", width: "190px" },
    {
        key: "firstName",
        label: "Name",
        width: "220px",
        render: (_value, row) => `${row.firstName} ${row.lastName}`,
    },
    { key: "email", label: "Email", width: "260px" },
    {
        key: "userType",
        label: "User Type",
        width: "160px",
        sortable: false,
        render: (_value, row) => (
            <Badge variant={row.userType === "local_user" ? "warning" : "info"}>
                {row.userType ?? "-"}
            </Badge>
        ),
    },
    {
        key: "roleId",
        label: "Realm Role",
        width: "280px",
        sortable: false,
        render: (_value, row) => {
            const currentRole = roles.find((role) => role.id === row.roleId)?.name ?? "-";

            return (
                <div className="kc-realmRoleCell">
                    <div className="kc-realmRoleCurrent">
                        <Badge variant="info">{currentRole}</Badge>
                        {updatingUsers.has(row.uuid) && renderInlineSpinner()}
                    </div>

                    <div className="kc-realmRolePicker">
                        <SearchableCombobox
                            value={row.roleId ?? ""}
                            disabled={updatingUsers.has(row.uuid)}
                            onChange={(nextValue) => {
                                const next = nextValue as RealmRoleId;
                                if (!next || next === row.roleId) return;
                                onChangeRole(row.uuid, next);
                            }}
                            options={[
                                { value: row.roleId ?? "", label: "Request role change" },
                                ...roles
                                    .filter((role) => role.id !== row.roleId)
                                    .map((role) => ({ value: role.id, label: role.name })),
                            ]}
                            placeholder="Request role change"
                            inputClassName="kc-select"
                            containerClassName="kc-roleCombobox"
                        />
                    </div>
                </div>
            );
        },
    },
    {
        key: "uuid",
        label: "Actions",
        width: "90px",
        align: "center",
        sortable: false,
        render: (_value, row) => (
            <RowActionMenu
                actions={[
                    { label: "View", onClick: () => onViewUser(row.uuid) },
                    { label: "Remove", danger: true, onClick: () => onRemoveFromRealm(row.uuid) },
                ]}
            />
        ),
    },
];

export const createAppColumns = (onViewApp?: (app: AppRow) => void): TableColumn<AppRow>[] => [
    {
        key: "name",
        label: "Application",
        width: "260px",
        render: (value, row) => (
            <div className="kc-realmAppPrimaryCell">
                <span className="kc-realmAppPrimaryName">{value as string}</span>
                <span className="kc-realmAppPrimaryMeta">{row.id}</span>
            </div>
        ),
    },
    {
        key: "clientId",
        label: "Client ID",
        width: "220px",
        render: (value) => (
            <span className="kc-monoCell">
                {value as string}
            </span>
        ),
    },
    {
        key: "protocol",
        label: "Auth Method",
        width: "140px",
        align: "center",
        render: (value) => (
            <Badge variant="info">
                <span className="kc-realmAppMethod">
                    <Key size={12} />
                    {value as string}
                </span>
            </Badge>
        ),
    },
    {
        key: "enabled",
        label: "Status",
        width: "120px",
        align: "center",
        render: (value) => <Badge variant={value ? "success" : "error"}>{value ? "Enabled" : "Disabled"}</Badge>,
    },
    {
        key: "redirectUris",
        label: "Redirect URIs",
        width: "320px",
        render: (_value, row) => (
            <div className="kc-realmUriCell">
                <span className="kc-realmUriCount">{row.redirectUris.length} configured</span>
                <span className="kc-realmUriPreview">
                    {row.redirectUris[0] ?? "-"}
                    {row.redirectUris.length > 1 ? " ..." : ""}
                </span>
            </div>
        ),
    },
    {
        key: "id",
        label: "Actions",
        width: "90px",
        align: "center",
        sortable: false,
        render: (_value, row) => (
            <RowActionMenu
                actions={[
                    { label: "View", onClick: () => onViewApp?.(row) },
                ]}
            />
        ),
    },
];

export const createAppAccessUsersColumns = (onRemove: (uuid: string) => void): TableColumn<UserRow>[] => [
    { key: "username", label: "Username", width: "180px", render: (value) => String(value ?? "-") },
    { key: "email", label: "Email", width: "260px", render: (value) => String(value ?? "-") },
    {
        key: "status",
        label: "Status",
        width: "130px",
        align: "center",
        render: (value) => <Badge variant={userStatusVariant(value as UserStatus)}>{value as string}</Badge>,
    },
    {
        key: "uuid",
        label: "Actions",
        width: "90px",
        align: "center",
        sortable: false,
        render: (_value, row) => (
            <RowActionMenu
                actions={[
                    {
                        label: "Remove access",
                        danger: true,
                        onClick: () => {
                            const name = row.username || row.email || row.uuid;
                            const ok = window.confirm(`Revoke access for ${name}?`);
                            if (!ok) return;
                            onRemove(row.uuid);
                        },
                    },
                ]}
            />
        ),
    },
];

const formatRoleLabel = (roleId?: string) =>
    roleId
        ? roleId
            .split("_")
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ")
        : "-";

export const createGrantAccessColumns = (onAdd: (uuid: string) => void): TableColumn<RealmUserViewRow>[] => [
    {
        key: "firstName",
        label: "User",
        width: "250px",
        render: (_value, row) => (
            <div className="kc-grantUserCell">
                <span className="kc-grantUserName">
                    {`${row.firstName} ${row.lastName}`.trim() || row.username}
                </span>
                <span className="kc-grantUserMeta">
                    {row.username}
                </span>
            </div>
        ),
    },
    { key: "email", label: "Email", width: "240px", render: (value) => String(value ?? "-") },
    {
        key: "userType",
        label: "User Type",
        width: "150px",
        sortable: false,
        align: "center",
        render: (_value, row) => (
            <Badge variant={row.userType === "local_user" ? "warning" : "info"}>
                {row.userType === "local_user" ? "Local" : row.userType ?? "-"}
            </Badge>
        ),
    },
    {
        key: "roleId",
        label: "Realm Role",
        width: "180px",
        sortable: false,
        render: (_value, row) => (
            <Badge variant="info">
                {formatRoleLabel(row.roleId)}
            </Badge>
        ),
    },
    {
        key: "appAccessRequestStatus",
        label: "Request Status",
        width: "170px",
        sortable: false,
        align: "center",
        render: (value) => {
            const status = String(value ?? "").trim();
            if (!status) return <span className="kc-mutedInline">Ready</span>;

            return (
                <Badge variant={status.toLowerCase().includes("pending") ? "warning" : "info"}>
                    {status}
                </Badge>
            );
        },
    },
    {
        key: "uuid",
        label: "Actions",
        width: "120px",
        align: "center",
        sortable: false,
        render: (_value, row) => (
            <button
                type="button"
                className="kc-btn kc-btn-cell is-primary"
                disabled={Boolean((row as RealmUserViewRow & { appAccessRequestStatus?: string }).appAccessRequestStatus)}
                onClick={(event) => {
                    event.stopPropagation();
                    if ((row as RealmUserViewRow & { appAccessRequestStatus?: string }).appAccessRequestStatus) return;
                    onAdd(row.uuid);
                }}
            >
                <Plus size={16} /> {((row as RealmUserViewRow & { appAccessRequestStatus?: string }).appAccessRequestStatus) ? "Queued" : "Request"}
            </button>
        ),
    },
];