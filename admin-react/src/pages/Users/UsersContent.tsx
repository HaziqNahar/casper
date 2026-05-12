import React from "react";
import { Plus, X } from "lucide-react";

import DataTable from "../../components/common/DataTable";
import { MultiSelectCheckbox } from "../../components/common/MultiSelectCheckbox";
import { parseSelectedFilterValues } from "./usersPageFilters";
import { createUserColumns } from "./usersPageColumns";
import type { UserRow } from "./usersPageTypes";

interface UsersContentProps {
  users: UserRow[];
  loading: boolean;
  error: string | null;
  onRowClick: (user: UserRow) => void;
  onRefresh?: () => void;
  onCreateUser: () => void;
  statusFilter: string;
  userTypeFilter: string;
  onStatusFilterChange: (value: string) => void;
  onUserTypesFilterChange: (value: string) => void;
  filteredUsers: UserRow[];
}

const USER_STATUS_OPTIONS: Array<{ value: UserRow["status"]; label: string }> = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
  { value: "Pending", label: "Pending" },
];

const UsersContent: React.FC<UsersContentProps> = ({
  users,
  loading,
  error,
  onRowClick,
  onRefresh,
  onCreateUser,
  statusFilter,
  userTypeFilter,
  onStatusFilterChange,
  onUserTypesFilterChange,
  filteredUsers,
}) => {
  const columns = React.useMemo(() => createUserColumns(onRowClick), [onRowClick]);

  const uniqueUserTypes = React.useMemo(() => {
    return [...new Set(users.map((user) => user.userType).filter(Boolean))];
  }, [users]);

  const selectedStatuses = React.useMemo(
    () => parseSelectedFilterValues(statusFilter) as Array<UserRow["status"]>,
    [statusFilter]
  );

  const selectedUserTypes = React.useMemo(
    () => parseSelectedFilterValues(userTypeFilter),
    [userTypeFilter]
  );
  const hasActiveFilters = selectedStatuses.length > 0 || selectedUserTypes.length > 0;

  return (
    <div className="tab-table-container">
      <div className="tab-table-main">
        <div className="table-card">
          <DataTable<UserRow>
            data={filteredUsers}
            columns={columns}
            keyField="id"
            onRowClick={onRowClick}
            loading={loading}
            error={error}
            searchable={true}
            searchPlaceholder="Search by username, name, email..."
            onRefresh={onRefresh}
            paginated={true}
            pageSize={10}
            pageSizeOptions={[10, 25, 50, 100]}
            striped={true}
            hoverable={true}
            stickyHeader={true}
            emptyMessage="No users found"
            minHeight="100%"
            toolbarFilters={{
              left: (
                <div className="kc_toolbarFilters">
                  <MultiSelectCheckbox<UserRow["status"]>
                    inline
                    label="Status"
                    options={USER_STATUS_OPTIONS}
                    value={selectedStatuses}
                    onChange={(next) => onStatusFilterChange(next.length > 0 ? next.join(",") : "All")}
                    placeholder="All"
                    portal
                  />
                  <MultiSelectCheckbox<string>
                    inline
                    label="User Type"
                    options={uniqueUserTypes.map((userType) => ({ value: userType, label: userType }))}
                    value={selectedUserTypes}
                    onChange={(next) => onUserTypesFilterChange(next.length > 0 ? next.join(",") : "All")}
                    placeholder="All"
                    portal
                  />
                  {hasActiveFilters && (
                    <button
                      type="button"
                      className="kc_btn kc_btn_icon"
                      title="Clear filters"
                      aria-label="Clear filters"
                      onClick={() => {
                        onStatusFilterChange("All");
                        onUserTypesFilterChange("All");
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ),
              right: (
                <button className="kc-btn kc-btn-primary" onClick={onCreateUser}>
                  <Plus size={16} /> Create user
                </button>
              ),
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default UsersContent;