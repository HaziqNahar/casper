import DataTable, { TableColumn } from "../../components/common/DataTable";
import { UserRow } from "../../types";
import { Key, Plus } from "lucide-react";
import RealmLocalUserDrawer from "./RealmLocalUserDrawer";

type RealmUserViewRow = UserRow & {
    roleId?: string;
};

type RealmRole = {
    id: string;
    name: string;
};

type UserPanelMode = "closed" | "create-local-user";

type CreateLocalUserForm = {
    username: string;
    staffId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    organization: string;
    department: string;
    staffType: string;
    group: string;
    roleId: string;
    status: string;
    justification: string;
};

type RealmUsersTabContentProps = {
    realmId: string;
    realmName: string;
    realmStatus: "Active" | "Inactive" | "Draft";
    stats: { total: number; active: number; pending: number; inactive: number };
    users: RealmUserViewRow[];
    userColumns: TableColumn<RealmUserViewRow>[];
    userPanelMode: UserPanelMode;
    formError: string | null;
    submitting: boolean;
    errors: Partial<Record<keyof CreateLocalUserForm, string>>;
    form: CreateLocalUserForm;
    roles: RealmRole[];
    onRequestAccess: () => void;
    onOpenPanel: (mode: Exclude<UserPanelMode, "closed">) => void;
    onClosePanel: () => void;
    onFieldChange: (field: keyof CreateLocalUserForm, value: string) => void;
    onClear: () => void;
    onSubmit: () => void;
};

const RealmUsersTabContent = ({
    realmId,
    realmName,
    realmStatus,
    stats,
    users,
    userColumns,
    userPanelMode,
    formError,
    submitting,
    errors,
    form,
    roles,
    onRequestAccess,
    onOpenPanel,
    onClosePanel,
    onFieldChange,
    onClear,
    onSubmit,
}: RealmUsersTabContentProps) => {
    void realmId;

    return (
        <div className="tab-table-container">
            <div className="tab-table-main">
            <div className="table-card kc_realmCard">
                <div className="kc_realmCardHeader">
                    <div className="kc_realmCardHeaderTop">
                        <div>
                            <div className="kc-text-title">Users in Realm</div>

                            <div className="kc_userStats">
                                <span className="kc_stat">Total <b>{stats.total}</b></span>
                                <span className="kc_stat">Active <b>{stats.active}</b></span>
                                <span className="kc_stat">Pending <b>{stats.pending}</b></span>
                                <span className="kc_stat">Inactive <b>{stats.inactive}</b></span>
                            </div>
                        </div>
                        <div className="kc-realmCardActions">
                            <button
                                className="kc-btn kc-btn-primary"
                                onClick={onRequestAccess}
                                disabled={realmStatus !== "Active"}
                                title={realmStatus !== "Active" ? "Realm must be Active" : "Request access via workflow"}
                            >
                                <Key size={16} /> Request Access
                            </button>

                            <button
                                className="kc-btn kc-btn-primary"
                                onClick={() => onOpenPanel("create-local-user")}
                                disabled={realmStatus !== "Active"}
                                title={realmStatus !== "Active" ? "Realm must be Active" : "Create local user"}
                            >
                                <Plus size={16} /> Create local user
                            </button>
                        </div>
                    </div>
                </div>

                <div className="kc_realmCardBody">
                    <DataTable<RealmUserViewRow>
                        data={users}
                        columns={userColumns}
                        keyField="uuid"
                        searchable
                        searchPlaceholder="Search users in this realm..."
                        paginated
                        pageSize={10}
                        pageSizeOptions={[10, 25, 50]}
                        striped
                        hoverable
                        stickyHeader
                        emptyMessage="No users in this realm"
                        minHeight="100%"
                    />
                    <RealmLocalUserDrawer
                        open={realmStatus === "Active" && userPanelMode !== "closed"}
                        realmName={realmName}
                        userPanelMode={userPanelMode}
                        formError={formError}
                        submitting={submitting}
                        errors={errors}
                        form={form}
                        roles={roles}
                        onClose={onClosePanel}
                        onOpenPanel={onOpenPanel}
                        onFieldChange={onFieldChange}
                        onClear={onClear}
                        onSubmit={onSubmit}
                    />
                </div>
            </div>
            </div>
        </div>
    );
};

export default RealmUsersTabContent;