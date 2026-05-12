import { TableColumn } from "../../components/common/DataTable";
import { Badge, LinkCell } from "../../components/common/Badge";
import { Key } from "lucide-react";
import { RowActionMenu } from "../../components/common/RowsActionMenu";
import { AppAuthMethod, ApplicationRow, AppStatus } from "./applicationTypes";

export const appStatusVariant = (status: AppStatus): "success" | "error" | "default" => {
    if (status === "Enabled") return "success";
    if (status === "Disabled") return "error";
    return "default";
};

export const formatAbsolute = (date: Date) =>
    new Intl.DateTimeFormat("en-SG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(date);

export const formatFull = (date: Date) =>
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

export const safeDate = (value?: string) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
};

export const createApplicationColumns = (
    onView: (row: ApplicationRow) => void,
    onManageOAuth?: (row: ApplicationRow) => void
): TableColumn<ApplicationRow>[] => [
    {
        key: "name",
        label: "Application",
        width: "240px",
        render: (value, row) => (
            <div className="kc-appPrimaryCell">
                <LinkCell onClick={() => onView(row)}>{value as string}</LinkCell>
                <span className="kc-appPrimaryMeta">{row.ownerRealm ?? row.id}</span>
            </div>
        ),
    },
    {
        key: "clientId",
        label: "Client ID",
        width: "210px",
        render: (value) => (
            <span
                style={{
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: "0.85rem",
                }}
            >
                {value as string}
            </span>
        ),
    },
    {
        key: "authMethod",
        label: "Auth Method",
        width: "140px",
        align: "center",
        render: (value) => (
            <Badge variant="info">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Key size={12} />
                    {String(value).toUpperCase()}
                </span>
            </Badge>
        ),
    },
    {
        key: "status",
        label: "Status",
        width: "130px",
        align: "center",
        render: (value) => <Badge variant={appStatusVariant(value as AppStatus)}>{value as string}</Badge>,
    },
    {
        key: "redirectUris",
        label: "Redirect URIs",
        width: "300px",
        render: (_value, row) => (
            <div className="kc-appUriCell">
                <span className="kc-appUriCount">
                    {row.redirectUris?.length ?? 0} configured
                </span>
                <span className="kc-appUriPreview">
                    {row.redirectUris?.[0] ?? "-"}
                    {(row.redirectUris?.length ?? 0) > 1 ? " ..." : ""}
                </span>
            </div>
        ),
    },
    {
        key: "updatedAt",
        label: "Last Updated",
        width: "180px",
        render: (value) => {
            const date = safeDate(value as string | undefined);
            if (!date) return "-";
            return (
                <time className="kc-datetime" dateTime={date.toISOString()} title={formatFull(date)}>
                    {formatAbsolute(date)}
                </time>
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
                    ...(onManageOAuth ? [{ label: "OAuth settings", onClick: () => onManageOAuth(row) }] : []),
                ]}
            />
        ),
    },
];

export const DEFAULT_APP_FILTERS = {
    status: [] as AppStatus[],
    auth: [] as AppAuthMethod[],
    client: [] as Array<"public" | "confidential">,
};